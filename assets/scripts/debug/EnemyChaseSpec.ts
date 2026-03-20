import { _decorator, Component, Prefab, Vec3 } from 'cc';
import { ArenaBattleController } from '../features/Battle/ArenaBattleController';

const { ccclass, property } = _decorator;

@ccclass('EnemyChaseSpec')
export class EnemyChaseSpec extends Component {
  @property(ArenaBattleController)
  arena: ArenaBattleController | null = null;

  @property(Prefab)
  enemyPrefab: Prefab | null = null;

  private timer = 0;

  start(): void {
    if (!this.arena) return;
    if (!this.enemyPrefab) return;
    this.arena.startRun();
    this.arena.enemyPrefab = this.enemyPrefab;
    this.arena.spawnEnemy(new Vec3(260, 120, 0));
    console.log('[EnemyChaseSpec] spawned 1 enemy');
  }

  update(dt: number): void {
    if (!this.arena?.player) return;
    const enemy = this.arena.enemiesRoot?.children[0];
    if (!enemy) return;
    this.timer += dt;
    if (this.timer < 0.5) return;
    this.timer = 0;
    const d = Vec3.distance(enemy.position, this.arena.player.position);
    console.log(`[EnemyChaseSpec] distance=${d.toFixed(2)}`);
  }
}
