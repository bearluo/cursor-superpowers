import { _decorator, Component, Vec3 } from 'cc';
import { EventBus } from '../../core/EventBus';
import { EVENTS } from '../../core/Constants';
import type { InputMovePayload } from '../../systems/input/InputTypes';

const { ccclass, property } = _decorator;

@ccclass('PlayerMotor')
export class PlayerMotor extends Component {
  @property
  speed = 220;

  @property
  minX = -360;

  @property
  maxX = 360;

  @property
  minY = -220;

  @property
  maxY = 220;

  private move: InputMovePayload = { x: 0, y: 0 };
  private readonly tmp = new Vec3();
  private offMove: (() => void) | null = null;

  onEnable(): void {
    this.offMove = EventBus.on(EVENTS.InputMove, (p: InputMovePayload) => {
      this.move = p;
    });
  }

  onDisable(): void {
    this.offMove?.();
    this.offMove = null;
  }

  update(dt: number): void {
    if (this.move.x === 0 && this.move.y === 0) return;
    this.node.getPosition(this.tmp);
    this.tmp.x += this.move.x * this.speed * dt;
    this.tmp.y += this.move.y * this.speed * dt;
    this.tmp.x = Math.min(this.maxX, Math.max(this.minX, this.tmp.x));
    this.tmp.y = Math.min(this.maxY, Math.max(this.minY, this.tmp.y));
    this.node.setPosition(this.tmp);
  }
}
