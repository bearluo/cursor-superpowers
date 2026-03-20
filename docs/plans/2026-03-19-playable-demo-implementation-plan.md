# Playable Demo (PC Keyboard) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在现有“协议反应 + 腐化阈值 + 主动过载 + 失控事件 + 波次推进”的纯逻辑 MVP 基础上，做出一个 **PC 键盘可玩的最小竞技场 Demo**：WASD 移动 + Space 过载 + 自动攻击/自动协议轮换 + HUD 展示腐化/过载/波次/反应 + 奖励三选一（键盘 1/2/3）。

**Architecture:** 保持依赖方向 `features → systems/framework → core`。战斗规则仍由 `systems/*` 管理（协议/反应、腐化/过载、波次/导演），玩法 UI 与输入由 `features/*` 订阅 `EventBus` 事件驱动渲染与交互。

**Tech Stack:** TypeScript、Cocos Creator 3.x（`cc`）、`core/EventBus`、`core/Constants`、现有 `systems/*`（`ProtocolSystem/CorruptionSystem/OverloadSystem/RunDirector` 等）。

---

### Task 1: 明确输入事件与键位映射（WASD / Space / 1-2-3）

**Files:**
- Modify: `e:\bearluo\cursor-superpowers\assets\scripts\core\Constants.ts`
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\systems\input\InputTypes.ts`
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\features\Input\KeyboardInputController.ts`
- Test: `e:\bearluo\cursor-superpowers\assets\scripts\debug\KeyboardInputSpec.ts`

**Step 1: Write the failing test**

Create `KeyboardInputSpec.ts` that attaches the controller and logs when keys are detected / emitted.

```ts
import { _decorator, Component, input, Input, EventKeyboard, KeyCode } from 'cc';
import { EventBus } from '../core/EventBus';
import { EVENTS } from '../core/Constants';
const { ccclass } = _decorator;

@ccclass('KeyboardInputSpec')
export class KeyboardInputSpec extends Component {
  start(): void {
    let gotOverload = false;
    EventBus.on(EVENTS.InputOverloadPressed, () => (gotOverload = true));

    input.on(Input.EventType.KEY_DOWN, (e: EventKeyboard) => {
      if (e.keyCode === KeyCode.SPACE) {
        console.log('[KeyboardInputSpec] pressed SPACE, gotOverload=', gotOverload);
      }
    });
  }
}
```

**Step 2: Run test to verify it fails**

Run: 在 Creator 场景挂 `KeyboardInputSpec`，按 `Space`  
Expected: 编译失败（`EVENTS.InputOverloadPressed` 不存在或 `KeyboardInputController` 不存在）

**Step 3: Write minimal implementation**

- 在 `Constants.ts` 增加输入事件常量（仅输入层使用）：
  - `InputMove`（payload: `{ x: number; y: number }`，范围 -1..1）
  - `InputOverloadPressed`（payload: `{}`）
  - `InputRewardChosen`（payload: `{ index: 0|1|2 }`）
- `KeyboardInputController`：
  - 监听 `KEY_DOWN/KEY_UP`
  - 用 WASD 生成 move 向量并每帧或状态变化时 emit `InputMove`
  - SPACE emit `InputOverloadPressed`
  - 数字键 1/2/3 emit `InputRewardChosen`

**Step 4: Run test to verify it passes**

Expected: 按键时控制台能看到对应事件被 emit（可在 spec 里订阅并打印）。

**Step 5: Commit**

（若后续 `git init`：每 Task 一个 commit）

---

### Task 2: 最小竞技场战斗场景控制器（聚合系统 + 驱动 tick）

**Files:**
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\features\Battle\ArenaBattleController.ts`
- Modify: `e:\bearluo\cursor-superpowers\assets\scripts\debug\MvpRunHarness.ts`（可选：保留但不再作为主入口）
- Test: `e:\bearluo\cursor-superpowers\assets\scripts\debug\ArenaBattleSmoke.ts`

**Step 1: Write the failing test**

```ts
import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

@ccclass('ArenaBattleSmoke')
export class ArenaBattleSmoke extends Component {
  start(): void {
    console.log('[ArenaBattleSmoke] Attach ArenaBattleController on same node and press Play.');
  }
}
```

**Step 2: Run test to verify it fails**

Expected: 没有 `ArenaBattleController`，无法挂载或编译失败。

**Step 3: Write minimal implementation**

`ArenaBattleController` 负责：
- 初始化/持有：`RunDirector/CorruptionSystem/OverloadSystem/ProtocolSystem/MeltdownSystem`
- `update(dt)`：
  - `overload.tick(dtMs)`
  - 按设计稿：时间腐化增长（例如每秒 +n）
  - 驱动波次系统（刷怪/清怪/奖励状态）
- 订阅输入事件：
  - `InputOverloadPressed` → 调用 `overload.startOverload()`，并给腐化一个启动加成（如 +5）
  - `InputRewardChosen` → 调用 `director.onRewardChosen(...)` 或新的奖励应用逻辑

**Step 4: Run test to verify it passes**

Expected: Play 后控制台输出初始化日志；按 Space 时出现“过载启动/冷却中”提示（先用 console）。

**Step 5: Commit**

---

### Task 3: 玩家移动（WASD）与边界限制

**Files:**
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\features\Battle\PlayerMotor.ts`
- Modify: `e:\bearluo\cursor-superpowers\assets\scripts\features\Battle\ArenaBattleController.ts`
- Test: `e:\bearluo\cursor-superpowers\assets\scripts\debug\PlayerMoveSpec.ts`

**Step 1: Write the failing test**

`PlayerMoveSpec`：按 WASD 让节点在场景中移动，打印位置变化。

**Step 2: Run test to verify it fails**

Expected: `PlayerMotor` 不存在。

**Step 3: Write minimal implementation**

- `PlayerMotor`：
  - 订阅 `EVENTS.InputMove`
  - 每帧按 move 向量移动玩家节点
  - clamp 到竞技场矩形边界（配置：minX/maxX/minY/maxY）

**Step 4: Run test to verify it passes**

Expected: WASD 移动生效且不会出界。

**Step 5: Commit**

---

### Task 4: 敌人最小实体与追击逻辑

**Files:**
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\features\Battle\EnemyAgent.ts`
- Modify: `e:\bearluo\cursor-superpowers\assets\scripts\features\Battle\ArenaBattleController.ts`
- Test: `e:\bearluo\cursor-superpowers\assets\scripts\debug\EnemyChaseSpec.ts`

**Step 1: Write the failing test**

Spawn 1 个敌人，让其朝玩家移动并打印距离。

**Step 2: Run test to verify it fails**

Expected: `EnemyAgent` 不存在。

**Step 3: Write minimal implementation**

- `EnemyAgent`：`update(dt)` 直线朝玩家位置移动（配置速度）。
- 在 `ArenaBattleController` 中提供玩家引用与 spawn 方法（先用代码创建节点也可）。

**Step 4: Run test to verify it passes**

Expected: 敌人会靠近玩家。

**Step 5: Commit**

---

### Task 5: 自动攻击 + 自动协议轮换 + 反应触发（可读性反馈）

**Files:**
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\features\Battle\AutoAttackSystem.ts`
- Modify: `e:\bearluo\cursor-superpowers\assets\scripts\features\Battle\ArenaBattleController.ts`
- Modify: `e:\bearluo\cursor-superpowers\assets\scripts\core\Constants.ts`（若缺事件）
- Test: `e:\bearluo\cursor-superpowers\assets\scripts\debug\AutoAttackReactionSpec.ts`

**Step 1: Write the failing test**

在场景中同时存在玩家与敌人，等待 5 秒，期望控制台输出至少一次反应触发事件。

**Step 2: Run test to verify it fails**

Expected: 没有 `AutoAttackSystem` 或无法触发反应。

**Step 3: Write minimal implementation**

- `AutoAttackSystem`：
  - 固定间隔选最近敌人
  - 对其造成基础伤害（`hp -= dmg`）
  - 施加协议（按轮换协议对）
  - 调用 `ProtocolSystem.consumeReactions(enemyId)`，对返回 reactions：
    - `EventBus.emit(EVENTS.ReactionTriggered, { reactionId, enemyId })`
    - MVP 结算：额外伤害或小范围伤害（半径内敌人一起扣血）
- 过载影响（至少落地一种）：
  - 过载期间增加协议叠层或提升反应伤害倍率

**Step 4: Run test to verify it passes**

Expected: 控制台看到 `[ReactionTriggered] ...`，并且敌人 hp 下降直至死亡。

**Step 5: Commit**

---

### Task 6: 波次刷怪与三选一奖励（键盘 1/2/3）

**Files:**
- Modify: `e:\bearluo\cursor-superpowers\assets\scripts\systems\run\RunDirector.ts`
- Modify: `e:\bearluo\cursor-superpowers\assets\scripts\systems\run\WaveSystem.ts`（若存在）
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\features\Battle\RewardChoiceController.ts`
- Test: `e:\bearluo\cursor-superpowers\assets\scripts\debug\RewardChoiceSpec.ts`

**Step 1: Write the failing test**

触发 `EVENTS.RunRewardOffered` 后，按 1/2/3 应 emit `EVENTS.RunRewardChosen`（或直接调用 director 选择）并回到战斗。

**Step 2: Run test to verify it fails**

Expected: 奖励控制器不存在或事件不齐。

**Step 3: Write minimal implementation**

- `RunDirector`：当一波清空后 emit `RunRewardOffered`，给出三条奖励（输出/反应/稳定三类）。
- `RewardChoiceController`：
  - 订阅 `RunRewardOffered` 打开选择态（MVP 可只设置一个内部 flag 并在 HUD 显示）
  - 订阅 `InputRewardChosen`，选择对应奖励并调用 `RunDirector.onRewardChosen(...)`
- 奖励应用：先只影响 `AutoAttackSystem` 的参数（攻速/伤害/反应倍率/腐化增长系数）。

**Step 4: Run test to verify it passes**

Expected: 奖励出现后按键可选择，选择后战斗继续且参数生效（可通过控制台打印验证）。

**Step 5: Commit**

---

### Task 7: HUD（腐化/过载/波次/最近反应/奖励选择）

**Files:**
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\features\Battle\BattleHUDView.ts`
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\features\Battle\BattleHUDController.ts`
- Modify: `e:\bearluo\cursor-superpowers\assets\scripts\core\Constants.ts`（补齐事件）
- Test: `e:\bearluo\cursor-superpowers\assets\scripts\debug\BattleHUDSmoke.ts`

**Step 1: Write the failing test**

`BattleHUDSmoke.ts` emit 各事件，期望 HUD 显示/打印更新。

**Step 2: Run test to verify it fails**

Expected: HUD 文件不存在。

**Step 3: Write minimal implementation**

- Controller：订阅事件，把数据喂给 View。
- View：MVP 可先用 `console.log` 或最少 `Label/ProgressBar`（若你们已有 UI 基建就用基建）。

**Step 4: Run test to verify it passes**

Expected: emit 后 HUD 数据更新可见（或控制台有明确日志）。

**Step 5: Commit**

---

### Task 8: 可玩 Demo 场景装配（单一入口脚本）

**Files:**
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\debug\PlayableDemoBootstrap.ts`
- Test: 直接在 Creator 场景验证

**Step 1: Write the failing test**

创建一个 bootstrap 组件，负责在空场景中创建玩家/敌人容器/HUD/输入控制器/ArenaBattleController 并跑起来。

**Step 2: Run test to verify it fails**

Expected: bootstrap 不存在。

**Step 3: Write minimal implementation**

`PlayableDemoBootstrap`：
- `start()` 创建必要节点并挂载组件
- 设置竞技场边界
- 启动 run

**Step 4: Run test to verify it passes**

Expected: Play 后立刻可 WASD 移动；Space 触发过载；自动攻击打怪推进波次；奖励出现后按 1/2/3 选择；HUD 全程可读。

**Step 5: Commit**

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-03-19-playable-demo-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration  
**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?

