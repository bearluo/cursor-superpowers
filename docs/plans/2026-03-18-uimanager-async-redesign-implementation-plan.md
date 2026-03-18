# UIManager Async Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 `UIManager` 的异步 `open/close` 重构为“事务 + 取消令牌”模型，保证调用顺序一致、close 可取消 in-flight、scene/parent 失效可中止且无残留副作用。

**Architecture:** 引入内部 `OpenTxn`（事务对象）管理一次 open 的生命周期、回滚与取消；用 `inFlight` 替代/扩展现有 `opening`；将 sharedDim/inputMask/stack 更新纳入可回滚副作用；明确 `CancelledError/AbortedError` 语义。

**Tech Stack:** TypeScript、Cocos Creator 3.x（`cc`）、现有 `BundleManager.loadAsset`

---

### Task 1: 定义错误类型与事务骨架

**Files:**
- Modify: `e:\bearluo\cursor-superpowers\assets\scripts\framework\ui\UIManager.ts`
- (Optional) Create: `e:\bearluo\cursor-superpowers\assets\scripts\framework\ui\UIErrors.ts`（若希望复用错误类型）

**Step 1: Write the failing test**

本仓库当前未看到测试框架与测试目录；先用“最小可运行断言”替代（临时 Debug 场景脚本/开发脚本）：
- Create (optional): `e:\bearluo\cursor-superpowers\assets\scripts\debug\UIManagerAsyncSpec.ts`
- 内容：构造一个“延迟加载”的 open（可通过 mock BundleManager 或使用一个特意很慢的资源/人为延迟）并断言取消语义（见 Task 3/4）。

**Step 2: Run test to verify it fails**

运行方式取决于你当前 Creator 的启动/调试方式：
- Run: 在 Creator 中进入一个 Debug 场景挂载 `UIManagerAsyncSpec`，观察控制台断言失败（预期：目前 close in-flight 不会取消 open）

**Step 3: Write minimal implementation**

在 `UIManager.ts` 增加：
- `class CancelledError extends Error { name='CancelledError' }`
- `class AbortedError extends Error { name='AbortedError' }`
- `type RollbackFn = () => void`
- `type OpenTxn = { key; seq; cancelled; committed; rollbackStack; cancel(): void; registerRollback(fn); throwIfInvalid(): void; }`
- `inFlight: Map<ViewKey, OpenTxn & { promise: Promise<Node> }>`

**Step 4: Run test to verify it passes**

仍应失败（此 Task 只定义骨架，不改行为）。

**Step 5: Commit**

当前目录不是 git repo；若你后续 `git init`：

```bash
git add assets/scripts/framework/ui/UIManager.ts docs/plans/2026-03-18-uimanager-async-redesign.md docs/plans/2026-03-18-uimanager-async-redesign-implementation-plan.md
git commit -m "design: add UIManager async txn plan"
```

---

### Task 2: 将 `opening` 替换为 `inFlight(OpenTxn)`，并保证复用 Promise

**Files:**
- Modify: `e:\bearluo\cursor-superpowers\assets\scripts\framework\ui\UIManager.ts`

**Step 1: Write the failing test**

在 `UIManagerAsyncSpec.ts`（或任意调试脚本）加入断言：
- 同一个 key 连续调用两次 `open(key)`，只会触发一次实际加载（可通过在 BundleManager.loadAsset 外围打点计数）。

**Step 2: Run test to verify it fails**

预期：改造前已有 `opening` 去重，应该是 PASS；此步骤用于防回归。

**Step 3: Write minimal implementation**

- 用 `inFlight` 取代 `opening`：
  - 如果 `inFlight.has(key)`：return `txn.promise`
  - 创建 txn 时同时创建内部 promise，并把 resolve/reject 控制留在 `open()` 逻辑中
- 保持原有 opened fast-path 不变

**Step 4: Run test to verify it passes**

预期：PASS（行为不应退化）。

**Step 5: Commit**

（同 Task 1，若有 git 则提交）

---

### Task 3: 实现 `close(key)` 取消 in-flight，并使 `open()` reject CancelledError

**Files:**
- Modify: `e:\bearluo\cursor-superpowers\assets\scripts\framework\ui\UIManager.ts`
- Modify (optional test): `e:\bearluo\cursor-superpowers\assets\scripts\debug\UIManagerAsyncSpec.ts`

**Step 1: Write the failing test**

新增断言（必须覆盖你选定语义）：
- 触发 `const p = UIManager.open('A', slowOpts)`
- 在加载完成前调用 `UIManager.close('A')`
- 断言：`await p` 会 reject，且 `error.name === 'CancelledError'`
- 断言：最终 `opened.has('A') === false`（或 node 不存在/不 valid）

**Step 2: Run test to verify it fails**

预期：现在 close 对 in-flight 无效，因此会失败（open 最终仍会挂载或抛其它错误）。

**Step 3: Write minimal implementation**

在 `close(key)` 中加入：
- 若 `opened` 不存在，但 `inFlight` 存在：
  - `txn.cancelled = true`
  - 执行 `txn.rollbackStack`（销毁已创建的 mask、回滚 stack 记录、更新 sharedDim 等）
  - 让 open 内部后续校验点抛 CancelledError（或直接 reject promise；推荐由 open 流程统一 reject，避免双重 settle）

在 `open()` 的关键 await 后增加统一校验：
- `txn.throwIfInvalid()`，其中 cancelled -> throw CancelledError

**Step 4: Run test to verify it passes**

预期：PASS

**Step 5: Commit**

（若有 git）

---

### Task 4: 将“副作用”纳入事务回滚（stack/inputMask/sharedDim/order）

**Files:**
- Modify: `e:\bearluo\cursor-superpowers\assets\scripts\framework\ui\UIManager.ts`

**Step 1: Write the failing test**

加入三个覆盖面断言（可拆成多个小断言）：
- **mask 回滚**：Overlay/Guide 允许 pre-mask；取消后 mask 不残留（场景树里找不到 `Msk_Block__<key>`）。
- **stack 回滚**：取消后 `popupStack/modalStack` 不应影响 `closeTopPopup/updateSharedDim`（例如取消的是“栈顶 in-flight”，sharedDim 不应被它占位）。
- **order 回滚/稳定**：取消后不会导致 layer reorder 把其它 UI 的层级打乱。

**Step 2: Run test to verify it fails**

预期：会出现至少一项残留/错位（这是本次重构核心风险点）。

**Step 3: Write minimal implementation**

把下列动作改为“可回滚登记”：
- `order.set(key, seq)`：登记 rollback -> `order.delete(key)`（仅当事务未 commit）。
- `popupStack.push(key)`：登记 rollback -> 从 `popupStack` 移除该 key。
- `modalStack.push(key)`：登记 rollback -> 从 `modalStack` 移除该 key，并 `updateSharedDim()`。
- pre-mask 创建：登记 rollback -> destroy mask。

并明确 commit 边界：
- commit 成功后，txn 不再执行上述 rollback（或 rollbackStack 清空）。

**Step 4: Run test to verify it passes**

预期：PASS

**Step 5: Commit**

（若有 git）

---

### Task 5: 统一 AbortedError（scene/parent 失效）并保证无残留

**Files:**
- Modify: `e:\bearluo\cursor-superpowers\assets\scripts\framework\ui\UIManager.ts`

**Step 1: Write the failing test**

覆盖两种 aborted：
- **scene 切换**：open 期间切场景（或模拟 `director.getScene()` 变化）=> open reject `AbortedError`，无挂载无残留。
- **parent destroy**：open 期间 destroy parent => open reject `AbortedError`，无挂载无残留。

**Step 2: Run test to verify it fails**

预期：当前实现会 throw，但错误类型/回滚一致性可能不满足（尤其 stack/mask）。

**Step 3: Write minimal implementation**

在 `txn.throwIfInvalid()` 中加入：
- `if (director.getScene() !== sceneAtStart) throw new AbortedError(...)`
- `if (!parentAtStart.isValid) throw new AbortedError(...)`

确保 aborted 与 cancelled 一样会触发 rollback（且不应被当成 CancelledError）。

**Step 4: Run test to verify it passes**

预期：PASS

**Step 5: Commit**

（若有 git）

---

### Task 6: 回归验证现有行为（Page 单例、closeTopPopup、sharedDim）

**Files:**
- Modify: `e:\bearluo\cursor-superpowers\assets\scripts\framework\ui\UIManager.ts`（若发现回归）
- (Optional) Modify: `e:\bearluo\cursor-superpowers\assets\scripts\features\Login\LoginController.ts`（仅用于快速跑通示例）

**Step 1: Write the failing test**

用 Debug 脚本覆盖：
- Page：打开 A(Page) 后打开 B(Page) => A 被关闭；B 存在
- Popup：连续 open 3 个，closeTopPopup 关闭最后一个已打开
- sharedDim：存在多个 modal 时 sharedDim 永远只有一个，且位置始终在“当前最顶层已 opened 的 modal”之下

**Step 2: Run test to verify it fails**

预期：若事务回滚没处理完整可能失败。

**Step 3: Write minimal implementation**

按失败点修复（通常是 rollback/stack 更新与 updateSharedDim/reorderLayer 的调用时机）。

**Step 4: Run test to verify it passes**

预期：PASS

**Step 5: Commit**

（若有 git）

---

## Execution Handoff

计划已完成并保存到 `docs/plans/2026-03-18-uimanager-async-redesign-implementation-plan.md`。两个执行选项：

**1. Subagent-Driven（本会话）**：我按 Task 逐个实现、每步验证与回顾，迭代快  
**2. Parallel Session（单独会话）**：你新开会话用 executing-plans 批量执行带检查点

你想用哪种方式执行？

