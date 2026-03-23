import { _decorator, Component, instantiate, Node, Prefab, Vec3 } from 'cc';
import { EventBus } from '../../core/EventBus';
import { EVENTS } from '../../core/Constants';
import { CorruptionSystem } from '../../systems/run/CorruptionSystem';
import { MeltdownSystem } from '../../systems/run/MeltdownSystem';
import { OverloadSystem } from '../../systems/run/OverloadSystem';
import { RunDirector } from '../../systems/run/RunDirector';
import { ProtocolSystem } from '../../systems/combat/ProtocolSystem';
import { EnemyAgent } from './EnemyAgent';
import { AutoAttackSystem } from './AutoAttackSystem';
import { PlayerHealth } from './PlayerHealth';

const { ccclass, property } = _decorator;

@ccclass('ArenaBattleController')
export class ArenaBattleController extends Component {
  @property(Node)
  player: Node | null = null;

  @property(Node)
  enemiesRoot: Node | null = null;

  @property(Prefab)
  enemyPrefab: Prefab | null = null;

  @property
  contactDamageRadius = 36;

  @property
  contactDps = 28;

  director!: RunDirector;
  corruption!: CorruptionSystem;
  overload!: OverloadSystem;
  protocol!: ProtocolSystem;
  meltdown!: MeltdownSystem;
  autoAttack!: AutoAttackSystem;

  private readonly unsubscribes: Array<() => void> = [];
  private timeCorruptionPerSecond = 2;
  private enemyCounter = 0;
  private readonly enemies = new Map<string, EnemyAgent>();
  private playerHealth: PlayerHealth | null = null;
  private rewardChoiceOpen = false;

  // 供 Bootstrap/场景装配读取的默认竞技场边界
  readonly arenaBounds = {
    minX: -360,
    maxX: 360,
    minY: -220,
    maxY: 220,
  } as const;

  start(): void {
    this.corruption = new CorruptionSystem([33, 66, 100]);
    this.overload = new OverloadSystem();
    this.protocol = new ProtocolSystem();
    this.meltdown = new MeltdownSystem(this.corruption);
    this.director = new RunDirector();
    this.autoAttack = new AutoAttackSystem(this.protocol, this.overload, {
      getEnemies: () => [...this.enemies.values()],
      onEnemyKilled: (enemy) => this.onEnemyKilled(enemy),
    });

    this.playerHealth = this.player?.getComponent(PlayerHealth) ?? null;

    this.unsubscribes.push(
      EventBus.on(EVENTS.RunRewardOffered, () => {
        this.rewardChoiceOpen = true;
        EventBus.emit(EVENTS.BattleFlowPaused, { paused: true, reason: 'reward' as const });
      }),
      EventBus.on(EVENTS.RunRewardChosen, () => {
        this.rewardChoiceOpen = false;
        EventBus.emit(EVENTS.BattleFlowPaused, { paused: false });
      }),
      EventBus.on(EVENTS.InputOverloadPressed, () => {
        if (!this.director.isRunActive() || this.rewardChoiceOpen) return;
        const wasOverloading = this.overload.isOverloading;
        this.overload.startOverload();
        const justStarted = !wasOverloading && this.overload.isOverloading;
        if (justStarted) {
          this.corruption.add(5, 'overload');
          console.log('[ArenaBattleController] overload started');
        } else {
          if (wasOverloading) {
            const remain = (this.overload.durationMsRemaining / 1000).toFixed(1);
            console.log(`[ArenaBattleController] overload ignored: already overloading (${remain}s left)`);
          } else {
            const cooldown = (this.overload.cooldownMs / 1000).toFixed(1);
            console.log(`[ArenaBattleController] overload ignored: cooling down (${cooldown}s left)`);
          }
        }
      }),
      EventBus.on(EVENTS.WaveChanged, (p: { state: string }) => {
        if (p.state === 'spawning') this.spawnWaveEnemies();
      }),
    );
    console.log('[ArenaBattleController] initialized');
  }

  startRun(): void {
    this.director.startRun();
  }

  update(dt: number): void {
    if (!this.director.isRunActive()) return;

    if (this.rewardChoiceOpen) return;

    const dtMs = dt * 1000;
    this.overload.tick(dtMs);
    this.corruption.add(this.timeCorruptionPerSecond * dt, 'time');
    this.autoAttack.tick(dtMs);
    this.tickPlayerContactDamage(dt);
  }

  onDestroy(): void {
    for (const off of this.unsubscribes) off();
    this.unsubscribes.length = 0;
  }

  spawnEnemy(position: Vec3): EnemyAgent {
    const root = this.enemiesRoot ?? this.node;
    const enemyNode = instantiate(this.enemyPrefab!);
    enemyNode.name = `Enemy_${this.enemyCounter}`;
    root.addChild(enemyNode);
    enemyNode.setPosition(position);
    const enemy = enemyNode.addComponent(EnemyAgent);
    enemy.enemyId = `E${this.enemyCounter}`;
    enemy.target = this.player;
    this.enemies.set(enemy.enemyId, enemy);
    this.enemyCounter += 1;
    return enemy;
  }

  getEnemies(): EnemyAgent[] {
    return [...this.enemies.values()].filter((e) => !e.isDead);
  }

  private onEnemyKilled(enemy: EnemyAgent): void {
    if (!this.enemies.has(enemy.enemyId)) return;
    this.enemies.delete(enemy.enemyId);
    enemy.node.destroy();
    this.director.simulateKill();
    console.log(`[ArenaBattleController] enemy killed ${enemy.enemyId}`);
  }

  applyRewardOption(optionId: string): void {
    if (optionId === 'chip_ignite_up') this.autoAttack.damage += 4;
    if (optionId === 'chip_arc_up') this.autoAttack.reactionMultiplier += 0.25;
    if (optionId === 'passive_regen') this.timeCorruptionPerSecond = Math.max(0.6, this.timeCorruptionPerSecond - 0.4);
    console.log(
      `[ArenaBattleController] reward applied ${optionId} (dmg=${this.autoAttack.damage}, reactionMul=${this.autoAttack.reactionMultiplier.toFixed(2)}, corruptionRate=${this.timeCorruptionPerSecond.toFixed(2)})`,
    );
  }

  private spawnWaveEnemies(): void {
    const count = this.director.getEnemyAliveCount();
    for (let i = 0; i < count; i += 1) {
      const x = this.arenaBounds.maxX - 80 - i * 50;
      const y = this.arenaBounds.maxY - 80 - (i % 4) * 60;
      this.spawnEnemy(new Vec3(x, y, 0));
    }
    console.log(`[ArenaBattleController] spawned enemies for wave: ${count}`);
  }

  private tickPlayerContactDamage(dt: number): void {
    if (!this.player?.isValid || !this.playerHealth || this.playerHealth.isDead) return;
    const p = this.player.worldPosition;
    const r = this.contactDamageRadius;
    const r2 = r * r;
    let touching = false;
    for (const e of this.enemies.values()) {
      if (e.isDead) continue;
      const dx = e.node.worldPosition.x - p.x;
      const dy = e.node.worldPosition.y - p.y;
      if (dx * dx + dy * dy <= r2) {
        touching = true;
        break;
      }
    }
    if (!touching) return;
    if (this.playerHealth.applyDamage(this.contactDps * dt)) {
      this.onPlayerDefeated();
    }
  }

  private onPlayerDefeated(): void {
    console.log('[ArenaBattleController] player defeated');
    EventBus.emit(EVENTS.BattleFlowPaused, { paused: true, reason: 'defeat' as const });
    this.director.endRunDefeat();
  }
}
