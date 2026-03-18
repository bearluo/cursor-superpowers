# 资源流程与命名规范

## 命名规范（统一前缀 + 小写_下划线）

| 类型       | 格式示例 |
|------------|----------|
| UI 贴图    | `ui_<模块>_<用途>_<序号>`，如 ui_lobby_btn_start.png |
| 角色/怪物  | `char_<名称>_<动作>_<序号>` |
| 背景       | `bg_<场景>_<名称>` |
| 特效       | `fx_<名称>_<序号>` |
| BGM        | `bgm_<场景或情绪>` |
| 音效       | `sfx_<类型>_<名称>` |
| 预制体     | UI_/Char_/Fx_ 等前缀 + 帕斯卡命名 |

## 分包对应目录

- 主包（main）：首屏场景、登录/大厅、通用 UI、core 脚本与必要配置（**不依赖运行时动态加载**）。
- 运行时动态加载：统一使用内置 `resources` bundle 或自定义业务 bundle（battle、tutorial、activity_xxx 等）。
- 分包资源放在 `assets/resources/dynamic/<分包名>/`，构建时对应 subpackage 或 bundle。
- 新增功能模块时，在本文档补充「模块名 → 目录与分包名」对应表。

## 动态加载资源放置规范（重要）

### 总规则

- **禁止依赖 `main` 包做运行时动态加载**（例如通过 `assetManager.loadBundle('main')` 或 bundle.load 动态取资源）。
- **凡是要通过代码动态加载的资源**（UI prefab、贴图、音频、特效等），必须放在：
  - 内置 `resources` bundle（适合首屏与通用动态资源），或
  - 自定义业务 bundle（battle/tutorial/activity_xxx 等）。

### 推荐目录（与本项目结构对应）

- **resources（内置 bundle，动态加载）**：
  - `assets/resources/prefabs/ui/<Module>/...`
  - `assets/resources/textures/ui/<Module>/...`
  - `assets/resources/audio/...`
  - 代码侧加载路径示例：`prefabs/ui/Login/UI_Login`（不含扩展名）
- **业务 bundle（动态加载）**：
  - `assets/resources/dynamic/<bundleName>/...`
  - 代码侧加载路径示例：`<bundleName>:prefabs/...`（由项目代码约定）
- **main（场景直引用/静态）**：
  - 允许放在 `assets/prefabs/`、`assets/textures/` 等，但仅用于**场景直接引用**（不从代码动态加载）。

### 检查清单（做 UI/资源改动时）

- 动态加载的 prefab/贴图/音频是否在 `assets/resources/**` 或 `assets/resources/dynamic/**`？
- `VIEWS`（或你们的资源表）里的 `bundle` 是否为 `resources` 或业务 bundle（不是 `main`）？
- 路径是否**不带扩展名**、大小写是否与资源路径一致？

## 模块 → Bundle → 目录映射表（模板）

| 模块 | bundle 名 | 资源目录 | 入口（scene/prefab） | 预加载策略 |
|------|-----------|----------|----------------------|------------|
| Login | resources（动态加载）/ main（场景直引用） | 动态：`assets/resources/prefabs/ui/Login/`；静态：`assets/prefabs/ui/Login/` | `Login.scene` / `UI_Login.prefab` | 首屏：直引用或放 resources |
| Lobby | resources（动态加载）/ main（场景直引用） | 动态：`assets/resources/prefabs/ui/Lobby/`；静态：`assets/prefabs/ui/Lobby/` | `Lobby.scene` / `UI_LobbyRoot.prefab` | 首屏：直引用或放 resources |
| Battle | battle | `assets/resources/dynamic/battle/` | `Battle.scene` / `UI_BattleRoot.prefab` | 进入战斗前 `loadBundle` + preload |
| Tutorial | tutorial | `assets/resources/dynamic/tutorial/` | `Tutorial.scene` / `UI_TutorialRoot.prefab` | 首次进入前预加载 |
| Activity_xxx | activity_xxx | `assets/resources/dynamic/activity_xxx/` | `UI_ActivityRoot.prefab` | 首次打开时加载 |

## UI 节点命名规范（推荐）

### 总体原则

- 节点名要**稳定、语义化**，便于脚本绑定与重构。
- **用途优先**（不要把样式写进名字里）。

### 类型前缀

| 类型 | 前缀 | 示例 |
|------|------|------|
| 页面/窗口根节点 | `UI_<Module>_<Page>` | `UI_Login_Main`、`UI_Lobby_Home` |
| 弹窗根节点 | `Dlg_<Module>_<Name>` | `Dlg_Common_Confirm` |
| 面板/区域容器 | `Pnl_<Name>` | `Pnl_Header`、`Pnl_Content` |
| 容器/布局节点 | `Grp_<Name>` / `Box_<Name>` | `Grp_Tabs`、`Box_List` |
| ScrollView | `Scr_<Name>` | `Scr_Items` |
| 列表 Content | `Cnt_<Name>` | `Cnt_Items` |
| 列表项 Prefab | `Item_<Name>` | `Item_BagSlot` |
| 按钮 | `Btn_<Action>` | `Btn_Login`、`Btn_Close` |
| 文本 | `Txt_<Name>` | `Txt_Title`、`Txt_Desc` |
| 输入框 | `Inp_<Name>` | `Inp_Account`、`Inp_Password` |
| 图片/图标 | `Img_<Name>` / `Icon_<Name>` | `Img_Avatar`、`Icon_Coin` |
| Toggle | `Tog_<Name>` | `Tog_Remember` |
| Slider | `Sld_<Name>` | `Sld_Volume` |
| 进度条 | `Prg_<Name>` | `Prg_Exp` |
| 遮罩/加载 | `Msk_<Name>` / `Loading_<Name>` | `Msk_Block`、`Loading_Spinner` |

### 强制统一的常用节点名（建议）

- `Btn_Close`
- `Msk_Block`
- `Txt_Title`
- `Pnl_Content`
- `Btn_OK` / `Btn_Cancel`

完整设计见 `docs/plans/2026-03-16-cocos-creator-project-structure-design.md`。
