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

  onLoad(): void {
    this.unsubscribes.push(
      EventBus.on(EVENTS.CorruptionChanged, (p: { value: number; stage: number }) => {
        this.view?.setCorruption(p.value, p.stage);
      }),
      EventBus.on(EVENTS.OverloadStateChanged, (p: OverloadStatePayload) => {
        this.view?.setOverload(p.isOverloading, p.durationMsRemaining);
      }),
      EventBus.on(EVENTS.WaveChanged, (p: WaveChangedPayload) => {
        this.view?.setWave(p.zone, p.wave, p.state);
      }),
      EventBus.on(EVENTS.ReactionTriggered, (p: { reactionId: string }) => {
        this.view?.showReaction(p.reactionId);
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
    );
  }

  onDestroy(): void {
    for (const off of this.unsubscribes) off();
    this.unsubscribes.length = 0;
  }
}
