import { _decorator, Component, Node, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('XpOrb')
export class XpOrb extends Component {
  @property
  magnetRadius = 140;

  @property
  pickupRadius = 22;

  @property
  moveSpeed = 520;

  xpValue = 1;
  target: Node | null = null;
  onCollected: ((xp: number) => void) | null = null;

  private readonly dir = new Vec3();
  private readonly pos = new Vec3();
  private readonly targetPos = new Vec3();
  private consumed = false;

  update(dt: number): void {
    if (this.consumed || !this.target || !this.target.isValid) return;
    this.node.getWorldPosition(this.pos);
    this.target.getWorldPosition(this.targetPos);
    Vec3.subtract(this.dir, this.targetPos, this.pos);
    const dist = this.dir.length();

    if (dist <= this.pickupRadius) {
      this.collect();
      return;
    }
    if (dist > this.magnetRadius) return;

    Vec3.normalize(this.dir, this.dir);
    this.pos.x += this.dir.x * this.moveSpeed * dt;
    this.pos.y += this.dir.y * this.moveSpeed * dt;
    this.node.setWorldPosition(this.pos);
  }

  private collect(): void {
    if (this.consumed) return;
    this.consumed = true;
    this.onCollected?.(this.xpValue);
    this.node.destroy();
  }
}

