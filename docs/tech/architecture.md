# 项目架构说明

- **依赖方向**：features → systems / framework → core；core 不依赖上层。
- **禁止**：features 之间直接 import；通过 EventBus / GameManager / systems 通信。
- **core**：App、GameManager、EventBus、Localization、NetworkManager 等基础设施。
- **framework**：ViewBase、DialogBase、UIManager；统一 UI 生命周期与关闭方式。
- **systems**：跨模块系统（任务、背包、引导、活动），提供数据与接口，通过事件通知。
- **features**：业务模块（Controller + View），调用 systems/services，监听事件更新 View。

## UI Root 约定（Creator 3.x）

- 所有运行时打开的界面都应挂在 **UIRoot** 下，避免散落到各场景 Canvas 节点导致层级/渲染/适配不一致。
- `UIManager.ensureRoot()` 是**唯一入口**：当 root 不存在时创建 `UIRoot`，并确保其可渲染与全屏适配：
  - 添加 `RenderRoot2D`（使其成为可渲染根节点）
  - 添加 `Widget` 并设置 Top/Bottom/Left/Right 全对齐（全屏铺满，适配分辨率变化）
- 业务侧不要自行创建渲染根；界面应通过 `UIManager.open()` 打开，并由 UIManager 决定挂载层级。

## UI 分层（Layer）约定（重度项目）

采用 **单 `UIRoot` + 多 `Layer_*` 子节点** 的结构。所有 UI 必须挂到某一个层（不允许直接挂 `UIRoot`）。

从下到上（越往上越“盖住”下面）：

1. **Layer_SceneHUD**：场景/HUD（战斗 HUD、常驻信息条等）
2. **Layer_Page**：整页界面（Login/Lobby/背包页等，通常“切页”）
3. **Layer_Popup**：弹窗层（可叠加栈）
4. **Layer_Overlay**：覆盖层（Loading、转场、断线遮罩等，通常强拦截输入）
5. **Layer_Guide**：引导层（强制引导遮罩/高亮/手指，强拦截输入）
6. **Layer_Tip**：提示层（Toast/飘字，不拦截输入）
7. **Layer_Debug**：调试层（GM/Debug，最高层）

### 最小行为规则

- **Page 单例**：同一时刻只保留一个 Page（打开新 Page 会关闭旧 Page）。
- **Popup 栈**：Popup 允许叠加，支持“关闭顶层弹窗”。
- **Overlay/Guide**：默认应设计为拦截输入（输入穿透/放行由具体组件控制）。

## 遮罩（Mask）与输入拦截约定

### 目标

- 统一解决：弹窗点击穿透、Loading 期间误触、引导强拦截等问题。
- **避免多重灰色蒙版叠加导致背景越来越深**：灰色只由 UIManager 维护一块共享 dim。

### 灰色蒙版（单层共享，不叠加）

- **禁止**：在 View/prefab 里自己挂“半透明灰色”节点做蒙版；否则多个 Popup/Overlay 叠加时会出现多块灰叠在一起、颜色加深。
- **约定**：灰色变暗效果由 **UIManager 内唯一一块共享 dim 节点（SharedDim）** 负责：
  - 该节点随“当前最顶层 modal”（Popup/Overlay/Guide 中最后打开的一个）移动，始终只盖在这一层之下、其它内容之上；
  - 只存在一块、固定透明度（如 0.7），不会因打开多个弹窗而叠加多块灰。
- 每个带 `modal: true` 的 view 只会得到一个**透明**的全屏输入遮罩（`Msk_Block__<ViewKey>`），用于拦截点击和 `closeOnMask`，**无任何绘制**，不参与灰色显示。

### 规范

- 通过 `UIManager.open()` 声明：
  - `modal: true`：参与上述“共享 dim”逻辑，并在该 view 下创建透明输入遮罩
  - `blockInput: true`：透明遮罩吞掉输入（默认 true）
  - `closeOnMask: true`：点击透明遮罩关闭该 view（普通弹窗可 true；Loading/Guide 应为 false）

### 推荐用法（例）

- 普通弹窗：`layer: 'Popup', modal: true, closeOnMask: true`
- Loading/转场：`layer: 'Overlay', modal: true, blockInput: true, closeOnMask: false`
- 强制引导：`layer: 'Guide', modal: true, blockInput: true, closeOnMask: false`

## 异步打开 UI 与场景切换（重要）

由于 `UIManager.open()` 需要异步加载资源（Bundle / resources），可能发生“资源加载完成时场景已切换”的情况。为避免 UI 被挂到错误场景或失效节点：

- `UIManager.open()` 内部会捕获 open 开始时的 `sceneAtStart`，并在加载完成后校验：
  - 当前 `director.getScene()` 仍是 `sceneAtStart`
  - 目标 parent（层节点）仍 `isValid`
- 若不满足，将**中止**本次 open 并清理已创建的输入遮罩，避免残留节点。
- 同一个 `ViewKey` 的并发 `open` 会被去重：同 key 正在加载时，后续调用复用同一个 Promise。

## 相关文档

- 资源加载与分包约定：`docs/pipeline/assets-workflow.md`
- 目录结构设计：`docs/tech/2026-03-16-cocos-creator-project-structure-design.md`
