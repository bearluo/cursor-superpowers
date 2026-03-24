import { _decorator, Component } from 'cc';
import { EventBus } from '../../core/EventBus';
import { EVENTS } from '../../core/Constants';
import { BattleHUDView } from './BattleHUDView';
import type { OverloadStatePayload } from '../../systems/run/OverloadSystem';
import type { WaveChangedPayload } from '../../systems/run/WaveSystem';

const { ccclass, property } = _decorator;

// BattleHUDController：Event → View 的中间层。
// 约定：features 层只通过 EventBus 订阅 systems 层的事件，不直接 import systems 实例。
// 所有订阅在 onLoad 注册，在 onDestroy 注销，避免游戏对象销毁后回调空指针。
@ccclass('BattleHUDController')
export class BattleHUDController extends Component {
  @property(BattleHUDView)
  view: BattleHUDView | null = null;

  // 用函数引用保存注销句柄（EventBus.on 返回 off 函数）
  private readonly unsubscribes: Array<() => void> = [];
  private telemetry = {
    reinforcementWaves: 0,
    reinforcementEnemyTotal: 0,
    maxAliveEnemies: 0,
  };

  onLoad(): void {
    this.unsubscribes.push(
      EventBus.on(EVENTS.CorruptionChanged, (p: { value: number; stage: number }) => {
        this.view?.setCorruption(p.value, p.stage);
      }),
      EventBus.on(EVENTS.OverloadStateChanged, (p: OverloadStatePayload) => {
        this.view?.setOverload(
          p.isOverloading,
          p.durationMsRemaining,
          p.cooldownMs,
          p.cooldownMaxMs,
          p.overloadDurationMaxMs,
          p.isDecaying,
          p.decayMsRemaining,
        );
      }),
      EventBus.on(EVENTS.WaveChanged, (p: WaveChangedPayload) => {
        this.view?.setWave(p.zone, p.wave, p.state);
        if (p.state === 'clearing' && p.wave >= 3) {
          this.view?.showMilestone('守门者波次开始');
        }
      }),
      EventBus.on(EVENTS.ReactionTriggered, (p: { reactionId: string }) => {
        this.view?.showReaction(p.reactionId);
      }),
      EventBus.on(EVENTS.ReactionResolved, (p: { reactionId: string; damage: number; affectedCount: number }) => {
        this.view?.showReactionResolution(p.reactionId, p.damage, p.affectedCount);
      }),
      EventBus.on(EVENTS.RunRewardOffered, (p: { options: Array<{ label: string }> }) => {
        this.view?.setRewardOptions(p.options);
      }),
      EventBus.on(EVENTS.RunRewardChosen, (p: { optionId: string }) => {
        this.view?.clearRewardChoice(p.optionId);
      }),
      EventBus.on(EVENTS.MeltdownTriggered, (p: { eventType: string; stage: number }) => {
        this.view?.showMilestone(`阈值跨越: 阶段${p.stage} ${p.eventType}`);
      }),
      EventBus.on(EVENTS.PlayerHealthChanged, (p: { hp: number; maxHp: number }) => {
        this.view?.setPlayerHealth(p.hp, p.maxHp);
      }),
      EventBus.on(EVENTS.RunEnded, (p: { victory: boolean }) => {
        this.view?.showRunEnd(p.victory);
      }),
      EventBus.on(EVENTS.XpProgressChanged, (p: { xpCurrent: number; xpNeed: number; rewardLevel: number }) => {
        this.view?.setXpProgress(p.xpCurrent, p.xpNeed, p.rewardLevel);
      }),
      EventBus.on(EVENTS.BattleFlowPaused, (p: { paused: boolean; reason?: string }) => {
        if (p.paused && p.reason === 'reward') {
          this.view?.showMilestone('选择奖励 (1/2/3)');
        }
      }),
      EventBus.on(EVENTS.ReinforcementSpawned, (p: { count: number }) => {
        this.telemetry.reinforcementWaves += 1;
        this.telemetry.reinforcementEnemyTotal += p.count;
        this.syncTelemetry();
      }),
      EventBus.on(EVENTS.EnemyAliveChanged, (p: { alive: number }) => {
        this.telemetry.maxAliveEnemies = Math.max(this.telemetry.maxAliveEnemies, p.alive);
        this.syncTelemetry();
      }),
      EventBus.on(EVENTS.RunEnded, () => {
        this.syncTelemetry();
      }),
    );

    // PlayerHealth.start 等可能早于本组件 onLoad，需在 view 绑定后再请求补发。
    // Bootstrap 常在 addComponent 之后才赋值 view，故推迟一帧再发 BattleHUDReady。
    this.scheduleOnce(() => {
      EventBus.emit(EVENTS.BattleHUDReady, {});
    }, 0);
  }

  onDestroy(): void {
    for (const off of this.unsubscribes) off();
    this.unsubscribes.length = 0;
  }

  private syncTelemetry(): void {
    this.view?.setTelemetry(
      this.telemetry.reinforcementWaves,
      this.telemetry.reinforcementEnemyTotal,
      this.telemetry.maxAliveEnemies,
    );
  }
}
