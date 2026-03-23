import { _decorator, Component } from 'cc';
import { EventBus } from '../core/EventBus';
import { EVENTS } from '../core/Constants';

const { ccclass } = _decorator;

// 冒烟测试：手动 emit 战斗事件，验证 BattleHUDController 能正确响应
@ccclass('BattleHUDSmoke')
export class BattleHUDSmoke extends Component {
  start(): void {
    EventBus.emit(EVENTS.CorruptionChanged, { prevValue: 0, value: 42, stage: 1, reason: 'time' });
    EventBus.emit(EVENTS.OverloadStateChanged, {
      isOverloading: true,
      cooldownMs: 0,
      durationMsRemaining: 6000,
      cooldownMaxMs: 12000,
      overloadDurationMaxMs: 6000,
    });
    EventBus.emit(EVENTS.WaveChanged, { zone: 1, wave: 2, state: 'clearing' });
    EventBus.emit(EVENTS.ReactionTriggered, { reactionId: 'OverheatDischarge', enemyId: 'E1' });
    EventBus.emit(EVENTS.RunRewardOffered, {
      options: [{ id: 'a', label: '攻速+' }, { id: 'b', label: '反应伤害+' }, { id: 'c', label: '稳定性+' }],
    });
    EventBus.emit(EVENTS.RunRewardChosen, { optionId: 'b' });
    EventBus.emit(EVENTS.MeltdownTriggered, { eventType: 'HunterSpawned', stage: 1 });
    console.log('[BattleHUDSmoke] emitted');
  }
}
