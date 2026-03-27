# UIManager 异步一致性重设计（事务模型 + 取消令牌）

**日期**：2026-03-18  
**背景**：Cocos Creator 3.x 项目，`UIManager.open()` 需要异步加载 prefab（bundle/resources），会出现“调用顺序 ≠ 异步完成顺序”“加载中 close”“加载中 parent/scene 失效”等竞态。  
**目标**：统一并强化异步语义，使 UI 的最终可见状态与调用语义一致，并且在取消/失效/失败时无残留副作用（mask/sharedDim/stack/节点）。  

---

## 1. 术语与问题定义

### 1.1 术语
- **ViewKey**：界面唯一 key（例如 `Login`）。
- **open 事务（OpenTxn）**：一次 `open(key, opts)` 的逻辑事务，包含顺序号、取消状态、副作用回滚等。
- **in-flight**：open 事务已开始但尚未 commit（仍在加载/等待）。
- **commit**：open 事务最终将 node 挂载、写入 `opened`，并完成 sharedDim / inputMask 等副作用。

### 1.2 需要解决的竞态
- **顺序竞态**：open 发起顺序与加载完成顺序不一致，导致层级与“顶层弹窗”判断错乱。
- **取消竞态**：open 进行中外部 `close(key)`，期望取消 open（最终不显示）。
- **环境失效**：加载过程中 scene 切换或 parent 节点销毁，必须中止并清理。
- **副作用残留**：inputMask/sharedDim/stack 在取消/失败/失效后残留或错位。

---

## 2. 核心语义（必须满足）

### 2.1 `open(key)` 的语义
- 若该 `key` 已经处于 **opened 且 valid**：`open()` 直接 `resolve(node)`。
- 若该 `key` 存在 **in-flight**：
  - 后续 `open(key)` **复用同一个 Promise**（避免同 key 并发加载）。
  - 若该 in-flight 之后被 `close(key)` 取消，则该 Promise **reject 为 CancelledError**（见 2.3）。
- 若正常打开成功：
  - `open()` **resolve 为 node**，并保证其已挂载到正确 layer/parent，且顺序规则已生效（见 3.2）。

### 2.2 `close(key)` 的语义
- 若该 `key` 已 opened：关闭并销毁 node，清理相关 mask/stack，并更新 sharedDim。
- 若该 `key` 存在 in-flight：**取消该事务**，确保最终不出现该界面，并清理/回滚所有已产生副作用；`open()` Promise **reject CancelledError**。

### 2.3 错误类型
为便于业务区分与上报，定义三类错误（至少前两类必须区分）：
- **CancelledError**：业务主动取消（典型：`close(key)` 触发取消）。
- **AbortedError**：环境不再满足（典型：scene 切换、parent 失效）。
- **LoadError / 其他异常**：资源加载失败等真实错误。

> 约束：`CancelledError` 不是“错误日志噪音”，默认不应上报为异常（可按需统计）。

---

## 3. 总体架构

### 3.1 数据结构（建议）
- `opened: Map<ViewKey, OpenedEntry>`
  - `OpenedEntry = { node: Node; layer: UILayer; inputMask?: Node }`
- `inFlight: Map<ViewKey, OpenTxn>`
  - 与现有 `opening: Map<ViewKey, Promise<Node>>` 合并/替换：inFlight 内部持有 Promise 及 cancel/rollback。
- `order: Map<ViewKey, number>` + `openSeq: number`
  - 用于保证最终 siblingIndex 与“调用顺序”一致（不受加载完成先后影响）。
- `popupStack: ViewKey[]`
- `modalStack: ViewKey[]`
- `sharedDimNode: Node | null`

### 3.2 顺序一致性规则
无论异步完成顺序如何，最终显示层级必须满足：
- 同一 layer 下的 view 按 `order(key)` 从低到高排列。
- `popupStack` / `modalStack` 的“顺序语义”以 **调用顺序** 为准，但 sharedDim / closeTopPopup 等“取顶”逻辑必须跳过未 opened 项。

### 3.3 事务模型（OpenTxn）
`OpenTxn` 是 UIManager 内部对象（对外不暴露），核心字段与能力：
- `id`：唯一事务 id（可用自增或 `${key}:${seq}`）。
- `key`、`opts`、`layer`、`parentAtStart`、`sceneAtStart`
- `seq`：调用顺序号（用于 `order`）
- `state`：`pending | committed | cancelled | aborted | failed`
- `promise`：`Promise<Node>`（对外 `open()` 返回该 promise）
- `cancel()`：标记取消，执行当前可执行的 rollback/cleanup，并使 `promise` 最终 reject CancelledError
- `registerRollback(fn)`：登记回滚动作（后进先出执行）
- `throwIfInvalid()`：在 await 之后统一校验：
  - 若 cancelled：throw CancelledError
  - 若 sceneChanged 或 parent invalid：throw AbortedError

> 原则：**副作用必须可回滚**，且尽量集中在 commit 阶段；不得出现“取消后仍可能挂载成功”的路径。

---

## 4. 关键流程（时序）

### 4.1 `open(key, opts)` 建议时序（高层）
1. **fast-path**：如果 `opened.get(key)` valid -> resolve。
2. **复用 in-flight**：如果 `inFlight.has(key)` -> return txn.promise。
3. **创建事务**：`txn = createTxn(key, opts)`
   - 分配 `seq`，写入 `order(key)=seq`（保证顺序一致性基石）。
   - 在第一个 await 之前按调用顺序更新 `popupStack/modalStack`（并登记 rollback：若事务取消/失败，需要回滚栈）。
   - 若需要在加载前创建 inputMask（例如 Overlay/Guide 强拦截），在这里创建并登记 rollback（destroy mask）。
4. **加载 prefab**：`prefab = await loadAsset(...)`
5. **校验点**：`txn.throwIfInvalid()`
6. **实例化 + 挂载（commit）**
   - `node = instantiate(prefab)`
   - `node.parent = parentAtStart`（或 layerRoot）
   - `node.name = key`（便于排序/排查）
   - 若 Popup 等延后创建 inputMask：此时创建并登记到 opened
   - `opened.set(key, entry)`
   - 更新 sharedDim（只针对已 opened 的 modal）
   - Page 单例规则：打开新 Page 触发关闭旧 Page（注意：对旧 Page 的 close 属于另一个独立动作，不应破坏当前 txn 的一致性）
7. **重排 siblingIndex**：`reorderLayer(layer)`，确保顺序与调用一致
8. `txn.commit()`，从 `inFlight` 移除并 resolve(node)

### 4.2 `close(key)` 建议时序（高层）
1. 若 `opened.has(key)`：执行现有 close 逻辑（onHide、destroy node、destroy inputMask、移除 opened/order/stack、updateSharedDim、必要的 reorder）。
2. 否则若 `inFlight.has(key)`：`txn.cancel()`（触发 rollback），并将其从 `inFlight` 移除（或由 txn finally 统一移除）。

---

## 5. sharedDim / inputMask 的一致性规则

### 5.1 sharedDim
- sharedDim 的“显示/挂载位置”只能基于 **modalStack 中已 opened 且 valid 的栈顶**。
- in-flight modal 不得影响 sharedDim 的最终位置（可以提前把 key 放进 modalStack 维持顺序语义，但 updateSharedDim 必须跳过未 opened 项）。
- 若取消/失败导致 modal key 回滚移除，需要再次 `updateSharedDim()`。

### 5.2 inputMask
- inputMask 是**透明**节点，仅用于拦截输入与 closeOnMask，不负责灰色绘制。
- 创建时机策略：
  - **Overlay/Guide**：允许“加载前创建”，以尽早阻断输入（但必须可回滚）。
  - **Popup**：建议“commit 后创建/或与 node 同步创建”，避免 mask 先于 UI 出现造成用户无法操作但又看不到弹窗的体验问题。
- 取消/失败/aborted：必须销毁已创建的 inputMask。

---

## 6. API 兼容性与最小破坏

对外 API 维持：
- `UIManager.open(key, opts): Promise<Node>`
- `UIManager.close(key): void`
- `UIManager.closeTopPopup(): void`
- `UIManager.closeAll(): void`

行为变化（预期）：
- `close(key)` 在 key 处于 in-flight 时会“真正取消 open”，而不是过去那样无效。
- `open(key)` 若被取消将 reject `CancelledError`（业务侧可选择忽略或做兜底）。

---

## 7. 验收标准（可测的行为）

### 7.1 顺序一致性
在并发触发（例如连续 open 3 个 popup，加载耗时乱序）时：
- 最终 siblingIndex/视觉层级与调用顺序一致（第 3 个调用的 popup 在最上）。
- `closeTopPopup()` 关闭的是最后一次调用且已打开的 popup；不会被“幽灵栈项”干扰。

### 7.2 取消一致性
- `open(A)` 进行中调用 `close(A)`：
  - A 最终不出现；
  - `open(A)` Promise reject `CancelledError`；
  - 不残留 inputMask/sharedDim 错位；
  - `popupStack/modalStack` 中不残留 A（或至少不会影响 sharedDim/topPopup 逻辑）。

### 7.3 环境失效
- open 进行中切场景/parent destroy：
  - open reject `AbortedError`；
  - 不把 UI 挂到新 scene；
  - 无残留副作用。

---

## 8. 迁移与风险
- **风险 1：回滚遗漏**：任何“await 前产生的副作用”必须登记 rollback，否则取消会残留节点/栈项。
- **风险 2：Page 单例与事务耦合**：关闭旧 Page 是独立动作，避免在 txn rollback/commit 中引入循环依赖。
- **风险 3：资源加载不可硬取消**：Bundle/prefab 的 IO 可能无法中止；本方案是“逻辑取消”，确保加载完成后不会 commit 挂载，并清理已产生副作用。

