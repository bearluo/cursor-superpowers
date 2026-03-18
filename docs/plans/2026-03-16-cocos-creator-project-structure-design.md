# Cocos Creator 项目目录与协作结构设计

**日期**: 2026-03-16  
**目标**: 中大型长期项目，主平台 Web / 小游戏，多人协作，需规范文档与资源管理。

---

## 1. 项目根目录结构

```
<project-root>/
  docs/                      # 项目文档
    design/                  # 游戏设计（关卡、系统、数值）
    tech/                    # 技术方案、架构、接口
    art/                     # 美术规范、UI 规范、导出流程
    audio/                   # 音频规范、命名、格式
    pipeline/                # 资源流程、打包、提交流程
    changelog/               # 版本更新记录
  tools/                     # 构建、校验、资源处理脚本
  configs/                   # CI、环境等非 Cocos 配置
  assets/                    # Cocos 资源根（见下）
  settings/                  # Cocos 工程设置
  temp/                      # 构建临时（自动）
  library/                   # 导入缓存（自动）
  local/                     # 本地设置（不提交）
```

---

## 2. assets/ 目录结构（混合：核心按类型 + 业务按功能）

```
assets/
  scenes/                    # 场景：Login, Lobby, Battle 等
  scripts/
    core/                    # 全局单例、事件、网络、配置
    framework/               # UI 基类、UIManager、ECS 等
    systems/                 # 任务、背包、引导、活动等跨模块系统
    features/                # 业务模块：Login/, Lobby/, Battle/
    services/                # HTTP、用户、支付、平台适配
    ui/                      # 通用 UI 组件
    debug/                   # GM 面板、性能监视
  prefabs/
    ui/                      # common/, Login/, Lobby/, Battle/
    gameplay/                # characters/, enemies/, projectiles/
    common/
  textures/                  # ui/, characters/, environment/, effects/
  audio/                     # bgm/, sfx/, voice/
  animations/                # characters/, ui/
  effects/                   # 粒子、shader
  data/
    config/                  # 配置表 json
    tables/                  # 原始表（可选）
    i18n/                    # 多语言
  resources/
    dynamic/                 # 动态/远程加载资源
  tests/                     # 测试场景与资源
```

---

## 3. 脚本架构约定

- **依赖方向**: features → systems / framework → core；core 不依赖上层。
- **禁止**: features 之间直接 import；由 EventBus / GameManager / systems 通信。
- **core**: App, GameManager, EventBus, Localization, NetworkManager 等基础设施。
- **framework**: ViewBase, DialogBase, UIManager；统一生命周期与关闭方式。
- **systems**: 提供数据与接口，通过事件通知；不直接操作 feature 的 View。
- **features**: Controller + View + 本模块数据；调用 systems/services，监听事件更新 View。

---

## 4. 资源命名规范

| 类型       | 格式示例                          |
|------------|-----------------------------------|
| UI 贴图    | ui_&lt;模块&gt;_&lt;用途&gt;_&lt;序号&gt;，如 ui_lobby_btn_start.png |
| 角色/怪物  | char_&lt;名称&gt;_&lt;动作&gt;_&lt;序号&gt;                        |
| 背景       | bg_&lt;场景&gt;_&lt;名称&gt;                                     |
| 特效       | fx_&lt;名称&gt;_&lt;序号&gt;                                     |
| BGM        | bgm_&lt;场景或情绪&gt;                                          |
| 音效       | sfx_&lt;类型&gt;_&lt;名称&gt;                                   |
| 预制体     | UI_/Char_/Fx_ 等前缀 + 帕斯卡命名                                 |

详见 `docs/pipeline/assets-workflow.md`。

---

## 5. 分包与主包策略

- **主包**: 启动场景、登录/大厅首屏、通用 UI、core 脚本与必要配置、Logo/loading；控制体积（如 &lt; 4MB）。
- **分包**: 按功能（battle, lobby_extra, tutorial, activity_xxx）；进入功能前加载。
- **远程**: 活动/大型剧情等放 CDN，版本与缓存策略见 `docs/tech/resources.md`。
- `assets/resources/dynamic/` 下按分包或模块分子目录，构建时对应 subpackage/bundle。

---

## 6. 文档与流程

- **设计**: docs/design/overview.md，docs/design/features/feature-*.md。
- **技术**: docs/tech/architecture.md，network.md，resources.md。
- **流程**: docs/pipeline/assets-workflow.md（命名、导出、分包）；docs/art/ui-style-guide.md；docs/audio/audio-guideline.md。
- **版本**: docs/changelog/YYYY-MM-DD.md。

---

## 7. 批准与后续

- 设计已按「混合结构 + 文档 + 资源/分包约定」确定。
- 实施步骤见同目录下的实施计划文档，按计划创建目录与文档骨架后可开始开发。
