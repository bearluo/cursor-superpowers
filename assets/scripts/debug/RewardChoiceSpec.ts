import { _decorator, Component } from 'cc';
import { EventBus } from '../core/EventBus';
import { EVENTS } from '../core/Constants';

const { ccclass } = _decorator;

@ccclass('RewardChoiceSpec')
export class RewardChoiceSpec extends Component {
  start(): void {
    EventBus.on(EVENTS.RunRewardOffered, (p: { options: Array<{ label: string }> }) => {
      console.log(`[RewardChoiceSpec] offered ${p.options.map((o) => o.label).join(' / ')}`);
      console.log('[RewardChoiceSpec] press 1/2/3 to choose reward');
    });
    EventBus.on(EVENTS.RunRewardChosen, (p: { optionId: string }) => {
      console.log(`[RewardChoiceSpec] chosen ${p.optionId}`);
    });
  }
}
