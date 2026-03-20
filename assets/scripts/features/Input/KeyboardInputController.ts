import { _decorator, Component, EventKeyboard, input, Input, KeyCode } from 'cc';
import { EventBus } from '../../core/EventBus';
import { EVENTS } from '../../core/Constants';
import type {
  InputMovePayload,
  InputOverloadPayload,
  InputRewardChosenPayload,
} from '../../systems/input/InputTypes';

const { ccclass } = _decorator;

@ccclass('KeyboardInputController')
export class KeyboardInputController extends Component {
  private pressed = new Set<KeyCode>();
  private lastMove: InputMovePayload = { x: 0, y: 0 };

  onEnable(): void {
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
  }

  onDisable(): void {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
  }

  update(): void {
    this.emitMoveIfChanged();
  }

  private onKeyDown(e: EventKeyboard): void {
    this.pressed.add(e.keyCode);

    if (e.keyCode === KeyCode.SPACE) {
      const payload: InputOverloadPayload = {};
      EventBus.emit(EVENTS.InputOverloadPressed, payload);
    }

    if (e.keyCode === KeyCode.DIGIT_1) this.emitRewardChoice(0);
    if (e.keyCode === KeyCode.DIGIT_2) this.emitRewardChoice(1);
    if (e.keyCode === KeyCode.DIGIT_3) this.emitRewardChoice(2);
  }

  private onKeyUp(e: EventKeyboard): void {
    this.pressed.delete(e.keyCode);
    this.emitMoveIfChanged();
  }

  private emitRewardChoice(index: 0 | 1 | 2): void {
    const payload: InputRewardChosenPayload = { index };
    EventBus.emit(EVENTS.InputRewardChosen, payload);
  }

  private emitMoveIfChanged(): void {
    const x = Number(this.pressed.has(KeyCode.KEY_D)) - Number(this.pressed.has(KeyCode.KEY_A));
    const y = Number(this.pressed.has(KeyCode.KEY_W)) - Number(this.pressed.has(KeyCode.KEY_S));
    if (x === this.lastMove.x && y === this.lastMove.y) return;
    this.lastMove = { x, y };
    EventBus.emit(EVENTS.InputMove, this.lastMove);
  }
}
