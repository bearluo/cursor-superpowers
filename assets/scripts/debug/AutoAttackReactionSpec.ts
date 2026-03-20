import { _decorator, Component } from 'cc';
import { EventBus } from '../core/EventBus';
import { EVENTS } from '../core/Constants';

const { ccclass } = _decorator;

@ccclass('AutoAttackReactionSpec')
export class AutoAttackReactionSpec extends Component {
  private offReaction: (() => void) | null = null;

  start(): void {
    this.offReaction = EventBus.on(EVENTS.ReactionTriggered, (p: { reactionId: string; enemyId: string }) => {
      console.log(`[AutoAttackReactionSpec] [ReactionTriggered] ${p.reactionId} enemy=${p.enemyId}`);
    });
    console.log('[AutoAttackReactionSpec] wait 5s for auto attacks and reactions');
  }

  onDestroy(): void {
    this.offReaction?.();
    this.offReaction = null;
  }
}
