# Cyber Protocol Overload Roguelike Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在现有 Cocos Creator 3.x 工程架构（core/framework/systems/features）中，实现“协议反应 + 腐化阈值 + 主动过载 + 失控事件 + 波次分区关卡 + 局内 HUD”的最小可玩闭环。

**Architecture:** 以 `systems/` 提供纯数据/规则与事件驱动的战斗运行时（协议/反应、腐化/过载、关卡波次、掉落与奖励），以 `features/` 提供可替换的 UI 与场景控制（BattleHUD、RunSelect、结算等）。跨模块通信统一走 `core/EventBus`，避免 features 之间互相 import。

**Tech Stack:** TypeScript、Cocos Creator 3.x（`cc`）、现有 `core/App.ts`、`core/EventBus.ts`、`framework/ui/UIManager.ts`、`services/BundleManager.ts`

---

## Before You Start（一次性约定）
- 本仓库目前没有自动化测试框架；本计划用 `assets/scripts/debug/*Spec.ts` 的“可运行断言脚本”替代单元测试：在 Creator 场景里挂组件运行，控制台输出 PASS/FAIL。
- 所有运行时数据通过 `systems/*` 管理，界面通过 `features/*` 订阅事件更新。

---

### Task 1: 定义战斗事件常量与数据模型骨架

**Files:**
- Modify: `e:\bearluo\cursor-superpowers\assets\scripts\core\Constants.ts`
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\systems\combat\CombatTypes.ts`

**Step 1: Write the failing test**

Create a debug spec `assets/scripts/debug/CombatTypesSpec.ts` that imports new types and logs basic sanity checks.

```ts
import { _decorator, Component } from 'cc';
import { ProtocolId } from '../systems/combat/CombatTypes';
const { ccclass } = _decorator;

@ccclass('CombatTypesSpec')
export class CombatTypesSpec extends Component {
  start(): void {
    const p: ProtocolId = 'Ignite';
    console.log('[CombatTypesSpec] PASS', p);
  }
}
```

**Step 2: Run test to verify it fails**

Run: 在 Creator 新建 Debug 场景，把 `CombatTypesSpec` 挂到节点上运行  
Expected: 编译失败（找不到 `systems/combat/CombatTypes` 或 `ProtocolId`）

**Step 3: Write minimal implementation**

In `CombatTypes.ts` define minimal types used across systems:

```ts
export type ProtocolId = 'Ignite' | 'Freeze' | 'Toxin' | 'Arc';
export type StatusStack = number; // 0..100

export type EnemyId = string;
export type PlayerId = 'P1';

export type ReactionId =
  | 'OverheatDischarge'
  | 'Superconduct'
  | 'ThermalShock'
  | 'ToxicFlame'
  | 'NeuroPulse';

export type CombatTickMs = number;

export type Corruption = {
  value: number; // 0..100
  thresholds: [number, number, number]; // e.g. [33,66,100]
};
```

In `core/Constants.ts` add event keys (names TBD but consistent):

```ts
export const EVENTS = {
  // ... existing
  CombatStarted: 'CombatStarted',
  CombatTick: 'CombatTick',
  ProtocolApplied: 'ProtocolApplied',
  ReactionTriggered: 'ReactionTriggered',
  CorruptionChanged: 'CorruptionChanged',
  OverloadStateChanged: 'OverloadStateChanged',
  WaveChanged: 'WaveChanged',
  RunRewardOffered: 'RunRewardOffered',
  RunRewardChosen: 'RunRewardChosen',
  RunEnded: 'RunEnded',
} as const;
```

**Step 4: Run test to verify it passes**

Expected: Debug 场景启动后控制台输出 `[CombatTypesSpec] PASS Ignite`

**Step 5: Commit**

（可选：若你后续 `git init`，每个 Task 一个 commit）

---

### Task 2: 实现协议叠层与反应规则表（纯规则系统）

**Files:**
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\systems\combat\ProtocolSystem.ts`
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\systems\combat\ReactionTable.ts`
- Test: `e:\bearluo\cursor-superpowers\assets\scripts\debug\ProtocolReactionSpec.ts`

**Step 1: Write the failing test**

```ts
import { _decorator, Component } from 'cc';
import { ProtocolSystem } from '../systems/combat/ProtocolSystem';
const { ccclass } = _decorator;

@ccclass('ProtocolReactionSpec')
export class ProtocolReactionSpec extends Component {
  start(): void {
    const s = new ProtocolSystem();
    s.apply('E1', 'Ignite', 60);
    s.apply('E1', 'Arc', 60);
    const reactions = s.consumeReactions('E1');
    const ok = reactions.includes('OverheatDischarge');
    console.log(ok ? '[ProtocolReactionSpec] PASS' : '[ProtocolReactionSpec] FAIL', reactions);
  }
}
```

**Step 2: Run test to verify it fails**

Expected: 编译失败（`ProtocolSystem` 不存在）

**Step 3: Write minimal implementation**

`ReactionTable.ts`：把设计稿 5 条反应做成可查询规则（先硬编码）。

`ProtocolSystem.ts`：维护每个敌人 4 协议的 stack（0..100），提供：
- `apply(enemyId, protocol, delta)`：叠层并 clamp
- `consumeReactions(enemyId)`：根据当前 stack 触发反应并按规则清算（MVP：触发后清空相关 stack）

**Step 4: Run test to verify it passes**

Expected: 控制台包含 `PASS` 且 reactions 中出现 `OverheatDischarge`

**Step 5: Commit**

---

### Task 3: 腐化条与主动过载（状态机 + 事件）

**Files:**
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\systems\run\CorruptionSystem.ts`
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\systems\run\OverloadSystem.ts`
- Test: `e:\bearluo\cursor-superpowers\assets\scripts\debug\CorruptionOverloadSpec.ts`

**Step 1: Write the failing test**

```ts
import { _decorator, Component } from 'cc';
import { CorruptionSystem } from '../systems/run/CorruptionSystem';
import { OverloadSystem } from '../systems/run/OverloadSystem';
const { ccclass } = _decorator;

@ccclass('CorruptionOverloadSpec')
export class CorruptionOverloadSpec extends Component {
  start(): void {
    const c = new CorruptionSystem([33, 66, 100]);
    const o = new OverloadSystem();
    c.add(10, 'time');
    o.startOverload();
    c.add(20, 'overload');
    const ok = c.value === 30 && o.isOverloading;
    console.log(ok ? '[CorruptionOverloadSpec] PASS' : '[CorruptionOverloadSpec] FAIL', c.value, o.isOverloading);
  }
}
```

**Step 2: Run test to verify it fails**

Expected: 编译失败（systems 不存在）

**Step 3: Write minimal implementation**

`CorruptionSystem`：
- 维护 `value`（0..100）与阈值
- `add(amount, reason)`：clamp 并通过 `EventBus.emit(EVENTS.CorruptionChanged, ...)` 广播
- 提供 `getStage()`：返回 0/1/2/3（跨阈值时后续会用于触发失控事件）

`OverloadSystem`：
- `startOverload()` / `endOverload()` / `tick(dtMs)`
- 最小字段：`isOverloading`, `cooldownMs`, `durationMsRemaining`
- 广播 `EVENTS.OverloadStateChanged`

**Step 4: Run test to verify it passes**

Expected: 输出 PASS

**Step 5: Commit**

---

### Task 4: 失控事件（阈值触发器 + 三种事件 MVP）

**Files:**
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\systems\run\MeltdownSystem.ts`
- Test: `e:\bearluo\cursor-superpowers\assets\scripts\debug\MeltdownSpec.ts`

**Step 1: Write the failing test**

目标：腐化跨阈值后触发一个事件，并能被 UI 订阅显示。

```ts
import { _decorator, Component } from 'cc';
import { EventBus } from '../core/EventBus';
import { EVENTS } from '../core/Constants';
import { CorruptionSystem } from '../systems/run/CorruptionSystem';
import { MeltdownSystem } from '../systems/run/MeltdownSystem';
const { ccclass } = _decorator;

@ccclass('MeltdownSpec')
export class MeltdownSpec extends Component {
  start(): void {
    const c = new CorruptionSystem([33, 66, 100]);
    const m = new MeltdownSystem(c);
    let got = false;
    const off = EventBus.on(EVENTS.RunRewardOffered, () => void 0); // placeholder to ensure constants exist
    EventBus.on(EVENTS.MeltdownTriggered ?? 'MeltdownTriggered', () => (got = true));
    c.add(40, 'time'); // cross 33
    console.log(got ? '[MeltdownSpec] PASS' : '[MeltdownSpec] FAIL');
    off();
    void m;
  }
}
```

**Step 2: Run test to verify it fails**

Expected: 编译失败（`MeltdownSystem` 不存在，或事件常量缺失）

**Step 3: Write minimal implementation**

`MeltdownSystem`：
- 订阅 `EVENTS.CorruptionChanged`
- 当 `stage` 上升（跨阈值）触发 `EVENTS.MeltdownTriggered`
- MVP 事件类型（先只 emit，不做实体生成）：
  - `HunterSpawned`
  - `ProtocolLockout`
  - `EnvironmentHazard`

同时在 `Constants.ts` 增补：`MeltdownTriggered`

**Step 4: Run test to verify it passes**

Expected: 跨 33 输出 PASS

**Step 5: Commit**

---

### Task 5: 波次/分区关卡运行器（纯逻辑 + 事件驱动）

**Files:**
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\systems\run\WaveSystem.ts`
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\systems\run\RunDirector.ts`
- Test: `e:\bearluo\cursor-superpowers\assets\scripts\debug\WaveRunSpec.ts`

**Step 1: Write the failing test**

```ts
import { _decorator, Component } from 'cc';
import { RunDirector } from '../systems/run/RunDirector';
const { ccclass } = _decorator;

@ccclass('WaveRunSpec')
export class WaveRunSpec extends Component {
  start(): void {
    const r = new RunDirector();
    r.startRun();
    const ok = r.currentZone === 1 && r.currentWave === 1;
    console.log(ok ? '[WaveRunSpec] PASS' : '[WaveRunSpec] FAIL', r.currentZone, r.currentWave);
  }
}
```

**Step 2: Run test to verify it fails**

Expected: 编译失败（RunDirector 不存在）

**Step 3: Write minimal implementation**

`WaveSystem`：
- 状态：`zone`, `wave`, `state`（spawning/clearing/reward）
- API：`nextWave()` / `onEnemyKilled()` / `isWaveCleared()`
- 广播：`EVENTS.WaveChanged`

`RunDirector`：
- `startRun()` 初始化系统并进入 zone1-wave1
- `tick(dt)` 驱动（MVP 可不依赖 tick，仅用手动调用推进）
- 波次清空后触发 `EVENTS.RunRewardOffered`（三选一奖励数据结构先 stub）

**Step 4: Run test to verify it passes**

Expected: 输出 PASS

**Step 5: Commit**

---

### Task 6: Battle HUD（只读 UI：协议/反应提示/腐化/过载/波次）

**Files:**
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\features\Battle\BattleHUDView.ts`
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\features\Battle\BattleHUDController.ts`
- Modify: `e:\bearluo\cursor-superpowers\assets\scripts\core\Constants.ts`（确保 UI 订阅的事件齐全）

**Step 1: Write the failing test**

在 Debug 场景挂一个 `BattleHUDController`，手动 emit 事件，看 HUD 是否更新（MVP：先用 `console.log` 作为 UI 更新占位）。

```ts
import { _decorator, Component } from 'cc';
import { EventBus } from '../../core/EventBus';
import { EVENTS } from '../../core/Constants';
const { ccclass } = _decorator;

@ccclass('BattleHUDSmoke')
export class BattleHUDSmoke extends Component {
  start(): void {
    EventBus.emit(EVENTS.CorruptionChanged, { value: 42 });
    EventBus.emit(EVENTS.OverloadStateChanged, { isOverloading: true });
    console.log('[BattleHUDSmoke] emitted');
  }
}
```

**Step 2: Run test to verify it fails**

Expected: 目前没有 BattleHUD 相关文件/类，无法挂载或编译失败

**Step 3: Write minimal implementation**

遵循 `features -> systems/core` 依赖方向：
- Controller：`onLoad` 时订阅 `EventBus`，把数据喂给 View
- View：仅负责渲染（MVP 可先 `console.log`，再接具体 Label/ProgressBar）

**Step 4: Run test to verify it passes**

Expected: HUD 能收到事件（控制台输出或 UI 数值变化）

**Step 5: Commit**

---

### Task 7: 一键可玩 Debug 场景脚本（把系统串起来）

**Files:**
- Create: `e:\bearluo\cursor-superpowers\assets\scripts\debug\MvpRunHarness.ts`

**Step 1: Write the failing test**

`MvpRunHarness` 目标：启动 run、定时 tick、模拟击杀推进波次、随机触发反应与腐化变化，并驱动 HUD。

**Step 2: Run test to verify it fails**

Expected: Harness 不存在

**Step 3: Write minimal implementation**

实现一个组件：
- `start()`：创建 `RunDirector/CorruptionSystem/OverloadSystem/ProtocolSystem` 并连接（或由 RunDirector 聚合）
- `update(dt)`：每秒增加一点腐化；每几秒模拟一次“击杀”；随机 apply 协议触发反应；偶尔启动过载
- 控制台输出关键里程碑（zone/wave/reaction/meltdown）

**Step 4: Run test to verify it passes**

Expected: 运行 30 秒内至少看到：腐化变化、一次过载、一次反应、一次跨阈值失控、波次推进

**Step 5: Commit**

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-03-18-cyber-protocol-overload-roguelike-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration  
**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?

