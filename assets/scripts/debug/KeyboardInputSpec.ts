import { _decorator, Component } from 'cc';
import { EventBus } from '../core/EventBus';
import { EVENTS } from '../core/Constants';

const { ccclass } = _decorator;

@ccclass('KeyboardInputSpec')
export class KeyboardInputSpec extends Component {
  private readonly unsubscribes: Array<() => void> = [];

  start(): void {
    this.unsubscribes.push(
      EventBus.on(EVENTS.InputMove, (p: { x: number; y: number }) => {
        console.log(`[KeyboardInputSpec] move (${p.x}, ${p.y})`);
      }),
      EventBus.on(EVENTS.InputOverloadPressed, () => {
        console.log('[KeyboardInputSpec] overload pressed');
      }),
      EventBus.on(EVENTS.InputRewardChosen, (p: { index: 0 | 1 | 2 }) => {
        console.log(`[KeyboardInputSpec] reward chosen ${p.index + 1}`);
      }),
    );
    console.log('[KeyboardInputSpec] ready, press WASD/Space/1/2/3');
  }

  onDestroy(): void {
    for (const off of this.unsubscribes) off();
    this.unsubscribes.length = 0;
  }
}
