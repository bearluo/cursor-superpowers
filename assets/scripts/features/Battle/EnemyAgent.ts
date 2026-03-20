import { _decorator, Component, Node, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('EnemyAgent')
export class EnemyAgent extends Component {
  @property
  speed = 120;

  hp = 100;
  enemyId = '';
  target: Node | null = null;

  private readonly dir = new Vec3();
  private readonly pos = new Vec3();
  private readonly targetPos = new Vec3();

  get isDead(): boolean {
    return this.hp <= 0;
  }

  update(dt: number): void {
    if (this.isDead) return;
    if (!this.target) return;
    this.node.getPosition(this.pos);
    this.target.getPosition(this.targetPos);
    Vec3.subtract(this.dir, this.targetPos, this.pos);
    if (this.dir.lengthSqr() <= 1e-4) return;
    Vec3.normalize(this.dir, this.dir);
    this.pos.x += this.dir.x * this.speed * dt;
    this.pos.y += this.dir.y * this.speed * dt;
    this.node.setPosition(this.pos);
  }

  applyDamage(amount: number): boolean {
    this.hp = Math.max(0, this.hp - amount);
    return this.isDead;
  }
}
