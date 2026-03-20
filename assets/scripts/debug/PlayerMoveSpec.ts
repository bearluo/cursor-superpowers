import { _decorator, Component, Vec3 } from 'cc';

const { ccclass } = _decorator;

@ccclass('PlayerMoveSpec')
export class PlayerMoveSpec extends Component {
  private readonly last = new Vec3(Number.NaN, Number.NaN, Number.NaN);
  private readonly now = new Vec3();
  private timer = 0;

  update(dt: number): void {
    this.timer += dt;
    if (this.timer < 0.2) return;
    this.timer = 0;

    this.node.getPosition(this.now);
    if (this.now.equals(this.last)) return;
    this.last.set(this.now);
    console.log(`[PlayerMoveSpec] pos=(${this.now.x.toFixed(1)}, ${this.now.y.toFixed(1)})`);
  }
}
