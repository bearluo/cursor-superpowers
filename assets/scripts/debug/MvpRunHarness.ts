import { _decorator, Component } from 'cc';
import { EventBus } from '../core/EventBus';
import { EVENTS } from '../core/Constants';
import { RunDirector } from '../systems/run/RunDirector';
import { CorruptionSystem } from '../systems/run/CorruptionSystem';
import { OverloadSystem } from '../systems/run/OverloadSystem';
import { ProtocolSystem } from '../systems/combat/ProtocolSystem';
import { MeltdownSystem } from '../systems/run/MeltdownSystem';
import type { ProtocolId } from '../systems/combat/CombatTypes';

const { ccclass } = _decorator;

// MvpRunHarness：一键可玩的 Debug 驱动器，把所有系统串联起来。
// 使用方式：在 Creator 里新建 Debug 场景，把此组件挂到任意节点，Play 后观察控制台。
// 目标：30 秒内看到：腐化变化、一次过载、一次反应、一次跨阈值失控、波次推进。
@ccclass('MvpRunHarness')
export class MvpRunHarness extends Component {
  private director!: RunDirector;
  private corruption!: CorruptionSystem;
  private overload!: OverloadSystem;
  private protocol!: ProtocolSystem;
  private meltdown!: MeltdownSystem;

  // 简单计时器（秒）
  private elapsed = 0;
  private killTimer = 0;
  private overloadTimer = 0;

  // 协议轮换：每次 apply 两种协议以便触发反应
  private readonly protocolPairs: ReadonlyArray<[ProtocolId, ProtocolId]> = [
    ['Ignite', 'Arc'],
    ['Freeze', 'Arc'],
    ['Ignite', 'Freeze'],
    ['Toxin', 'Ignite'],
    ['Toxin', 'Arc'],
  ];
  private pairIndex = 0;

  start(): void {
    // 初始化所有系统
    this.corruption = new CorruptionSystem([33, 66, 100]);
    this.overload = new OverloadSystem();
    this.protocol = new ProtocolSystem();
    this.meltdown = new MeltdownSystem(this.corruption); // 订阅 CorruptionChanged
    this.director = new RunDirector();

    // 订阅关键里程碑事件用于控制台输出
    EventBus.on(EVENTS.ReactionTriggered, (p: { reactionId: string; enemyId: string }) => {
      console.log(`[Harness] 反应触发: ${p.reactionId} (${p.enemyId})`);
    });
    EventBus.on(EVENTS.MeltdownTriggered, (p: { eventType: string; stage: number }) => {
      console.log(`[Harness] ⚠️ 失控事件: ${p.eventType} (到达阶段${p.stage})`);
    });
    EventBus.on(EVENTS.WaveChanged, (p: { zone: number; wave: number; state: string }) => {
      console.log(`[Harness] 波次: zone=${p.zone} wave=${p.wave} state=${p.state}`);
    });
    EventBus.on(EVENTS.RunRewardOffered, (p: { options: Array<{ id: string; label: string }> }) => {
      console.log(`[Harness] 奖励弹出: ${p.options.map((o) => o.label).join(' / ')}`);
      // 自动选择第一个奖励，模拟玩家操作
      this.director.onRewardChosen(p.options[0].id);
    });
    EventBus.on(EVENTS.RunEnded, (p: { victory: boolean }) => {
      console.log(`[Harness] 局结束 victory=${p.victory}`);
    });

    this.director.startRun();
    console.log('[Harness] Run 已启动，开始观察…');
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.killTimer += dt;
    this.overloadTimer += dt;
    this.overload.tick(dt * 1000);

    // 每秒累加腐化（模拟时间流逝）
    this.corruption.add(3, 'time');

    // 每 2 秒随机 apply 一对协议，触发反应
    if (this.killTimer >= 2) {
      this.killTimer = 0;
      const [p1, p2] = this.protocolPairs[this.pairIndex % this.protocolPairs.length];
      this.pairIndex += 1;
      this.protocol.apply('E1', p1, 70);
      this.protocol.apply('E1', p2, 70);
      const reactions = this.protocol.consumeReactions('E1');
      if (reactions.length > 0) {
        // 广播反应事件，让 BattleHUD 可以订阅
        for (const r of reactions) {
          EventBus.emit(EVENTS.ReactionTriggered, { reactionId: r, enemyId: 'E1' });
        }
        // 用反应驱动击杀推进波次（MVP 简化：有反应 = 击杀成功）
        this.director.simulateKill();
      }
    }

    // 每 8 秒触发一次过载（冷却期内自动跳过）
    if (this.overloadTimer >= 8) {
      this.overloadTimer = 0;
      this.overload.startOverload();
      if (this.overload.isOverloading) {
        console.log('[Harness] 过载启动！');
        this.corruption.add(5, 'overload'); // 过载额外产生腐化
      }
    }
  }
}
