import { _decorator, Component, instantiate, Node, Prefab, Vec3 } from 'cc';
import { EventBus } from '../../core/EventBus';
import { EVENTS } from '../../core/Constants';
import { CorruptionSystem } from '../../systems/run/CorruptionSystem';
import { MeltdownSystem } from '../../systems/run/MeltdownSystem';
import { OverloadSystem } from '../../systems/run/OverloadSystem';
import { RunDirector } from '../../systems/run/RunDirector';
import { XPSystem } from '../../systems/run/XPSystem';
import { ProtocolSystem } from '../../systems/combat/ProtocolSystem';
import { EnemyAgent } from './EnemyAgent';
import { AutoAttackSystem } from './AutoAttackSystem';
import { PlayerHealth } from './PlayerHealth';
import { XpOrb } from './XpOrb';

const { ccclass, property } = _decorator;

@ccclass('ArenaBattleController')
export class ArenaBattleController extends Component {
  @property(Node)
  player: Node | null = null;

  @property(Node)
  enemiesRoot: Node | null = null;

  @property(Prefab)
  enemyPrefab: Prefab | null = null;

  @property(Node)
  xpRoot: Node | null = null;

  @property(Prefab)
  xpOrbPrefab: Prefab | null = null;

  @property
  contactDamageRadius = 36;

  @property
  contactDps = 28;

  @property
  gatekeeperContactDpsMul = 2.4;

  @property
  reinforcementIntervalSec = 12;

  @property
  aliveCapNormal = 14;

  @property
  aliveCapGatekeeper = 16;

  @property
  spawnFrontBias = 0.8;

  @property
  spawnFrontHalfAngleDeg = 40;

  @property
  minSpawnRadius = 180;

  @property
  maxSpawnRadius = 320;

  director!: RunDirector;
  corruption!: CorruptionSystem;
  overload!: OverloadSystem;
  protocol!: ProtocolSystem;
  meltdown!: MeltdownSystem;
  autoAttack!: AutoAttackSystem;
  xp!: XPSystem;

  private readonly unsubscribes: Array<() => void> = [];
  private timeCorruptionPerSecond = 2;
  private enemyCounter = 0;
  private readonly enemies = new Map<string, EnemyAgent>();
  private playerHealth: PlayerHealth | null = null;
  private rewardChoiceOpen = false;
  private currentWaveState: 'spawning' | 'clearing' = 'spawning';
  private runElapsedSec = 0;
  private reinforcementTimerSec = 0;
  private lastPlayerPos = new Vec3();
  private playerMoveDir = new Vec3(1, 0, 0);

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
    this.xp = new XPSystem();
    this.xp.emitProgress();
    this.autoAttack = new AutoAttackSystem(this.protocol, this.overload, {
      getEnemies: () => [...this.enemies.values()],
      onEnemyKilled: (enemy) => this.onEnemyKilled(enemy),
    });

    this.playerHealth = this.player?.getComponent(PlayerHealth) ?? null;
    if (this.player) this.lastPlayerPos.set(this.player.position);

    this.unsubscribes.push(
      EventBus.on(EVENTS.RunRewardOffered, () => {
        this.rewardChoiceOpen = true;
        EventBus.emit(EVENTS.BattleFlowPaused, { paused: true, reason: 'reward' as const });
      }),
      EventBus.on(EVENTS.RunRewardChosen, () => {
        this.rewardChoiceOpen = false;
        EventBus.emit(EVENTS.BattleFlowPaused, { paused: false });
      }),
      EventBus.on(EVENTS.RewardReadyByXp, (p: { rewardLevel: number }) => {
        const offered = this.director.tryOfferRewardByXp();
        console.log(`[ArenaBattleController] RewardReadyByXp level=${p.rewardLevel}, offered=${offered}`);
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
      EventBus.on(EVENTS.WaveChanged, (p: { state: 'spawning' | 'clearing' }) => {
        this.currentWaveState = p.state;
        if (p.state === 'spawning') {
          this.spawnWaveEnemies();
        }
        if (p.state === 'clearing') {
          this.reinforcementTimerSec = this.reinforcementIntervalSec;
        }
        if (p.state === 'clearing' && this.director.isGatekeeperWave()) {
          EventBus.emit(EVENTS.BattleFlowPaused, { paused: false });
          console.log('[ArenaBattleController] Gatekeeper wave started');
        }
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

    this.runElapsedSec += dt;
    this.updatePlayerMoveDir();

    const dtMs = dt * 1000;
    this.overload.tick(dtMs);
    this.corruption.add(this.timeCorruptionPerSecond * dt, 'time');
    this.autoAttack.tick(dtMs);
    this.tickPlayerContactDamage(dt);
    this.tickReinforcement(dt);
    this.director.tick(dt);
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
    this.emitAliveChanged();
    return enemy;
  }

  getEnemies(): EnemyAgent[] {
    return [...this.enemies.values()].filter((e) => !e.isDead);
  }

  private onEnemyKilled(enemy: EnemyAgent): void {
    if (!this.enemies.has(enemy.enemyId)) return;
    this.enemies.delete(enemy.enemyId);
    const deathPos = enemy.node.worldPosition.clone();
    if (enemy.isGatekeeper) this.director.markGatekeeperKilled();
    enemy.node.destroy();
    this.director.simulateKill();
    const power = enemy.isGatekeeper ? 3 : 1;
    const gained = this.xp.onEnemyKilled({ power, enemyId: enemy.enemyId });
    this.spawnXpOrb(gained, deathPos);
    this.emitAliveChanged();
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
    const gatekeeperWave = this.director.isGatekeeperWave();
    const count = this.director.getEnemyAliveCount();
    const center = this.getSpawnCenter();
    for (let i = 0; i < count; i += 1) {
      const enemy = this.spawnEnemy(this.sampleSpawnPosition(center));
      if (gatekeeperWave) enemy.setupAsGatekeeper();
    }
    console.log(
      `[ArenaBattleController] spawned enemies for wave: ${count}${gatekeeperWave ? ' (GATEKEEPER)' : ''}`,
    );
  }

  private tickPlayerContactDamage(dt: number): void {
    if (!this.player?.isValid || !this.playerHealth || this.playerHealth.isDead) return;
    const p = this.player.worldPosition;
    const r = this.contactDamageRadius;
    const r2 = r * r;
    let touchingDps = 0;
    for (const e of this.enemies.values()) {
      if (e.isDead) continue;
      const dx = e.node.worldPosition.x - p.x;
      const dy = e.node.worldPosition.y - p.y;
      if (dx * dx + dy * dy <= r2) {
        touchingDps += e.isGatekeeper ? this.contactDps * this.gatekeeperContactDpsMul : this.contactDps;
      }
    }
    if (touchingDps <= 0) return;
    if (this.playerHealth.applyDamage(touchingDps * dt)) {
      this.onPlayerDefeated();
    }
  }

  private onPlayerDefeated(): void {
    console.log('[ArenaBattleController] player defeated');
    EventBus.emit(EVENTS.PlayerDefeated, { reason: 'contact' });
    EventBus.emit(EVENTS.BattleFlowPaused, { paused: true, reason: 'defeat' as const });
    this.director.endRunDefeat();
  }

  private spawnXpOrb(xpValue: number, centerPos: Vec3): void {
    const root = this.xpRoot ?? this.node;
    const node = this.xpOrbPrefab ? instantiate(this.xpOrbPrefab) : new Node('XpOrb');
    root.addChild(node);
    const offsetX = (Math.random() - 0.5) * 28;
    const offsetY = (Math.random() - 0.5) * 28;
    node.setWorldPosition(centerPos.x + offsetX, centerPos.y + offsetY, centerPos.z);
    const orb = node.getComponent(XpOrb) ?? node.addComponent(XpOrb);
    orb.xpValue = xpValue;
    orb.target = this.player;
    orb.onCollected = (xp) => {
      this.xp.collectXp(xp);
    };
  }

  private tickReinforcement(dt: number): void {
    if (this.currentWaveState !== 'clearing') return;
    if (this.director.isGatekeeperWave()) return;
    this.reinforcementTimerSec -= dt;
    if (this.reinforcementTimerSec > 0) return;
    this.reinforcementTimerSec = this.reinforcementIntervalSec;

    const cap = this.director.isGatekeeperWave() ? this.aliveCapGatekeeper : this.aliveCapNormal;
    const alive = this.enemies.size;
    const room = Math.max(0, cap - alive);
    if (room <= 0) return;

    const batch = this.getReinforcementBatchCount();
    const spawnCount = Math.min(batch, room);
    if (spawnCount <= 0) return;

    const center = this.getSpawnCenter();
    for (let i = 0; i < spawnCount; i += 1) {
      this.spawnEnemy(this.sampleSpawnPosition(center));
    }
    this.director.addReinforcementEnemies(spawnCount);
    EventBus.emit(EVENTS.ReinforcementSpawned, {
      count: spawnCount,
      alive: this.enemies.size,
      cap,
      wave: this.director.currentWave,
      zone: this.director.currentZone,
    });
    console.log(`[ArenaBattleController] reinforcement +${spawnCount} (alive=${this.enemies.size}/${cap})`);
  }

  private getReinforcementBatchCount(): number {
    if (this.runElapsedSec < 20) return 1;
    if (this.runElapsedSec < 40) return 2;
    return 3;
  }

  private getSpawnCenter(): Vec3 {
    return this.player?.position ?? new Vec3(0, 0, 0);
  }

  private sampleSpawnPosition(center: Vec3): Vec3 {
    const useFront = Math.random() < this.spawnFrontBias;
    const baseAngle = Math.atan2(this.playerMoveDir.y, this.playerMoveDir.x);
    const half = (this.spawnFrontHalfAngleDeg * Math.PI) / 180;
    const angle = useFront
      ? baseAngle + (Math.random() * 2 - 1) * half
      : Math.random() * Math.PI * 2;
    const radius = this.minSpawnRadius + Math.random() * Math.max(1, this.maxSpawnRadius - this.minSpawnRadius);
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + Math.sin(angle) * radius;
    return new Vec3(
      Math.min(this.arenaBounds.maxX, Math.max(this.arenaBounds.minX, x)),
      Math.min(this.arenaBounds.maxY, Math.max(this.arenaBounds.minY, y)),
      0,
    );
  }

  private updatePlayerMoveDir(): void {
    if (!this.player) return;
    const p = this.player.position;
    const dx = p.x - this.lastPlayerPos.x;
    const dy = p.y - this.lastPlayerPos.y;
    const len2 = dx * dx + dy * dy;
    if (len2 > 1e-4) {
      const inv = 1 / Math.sqrt(len2);
      this.playerMoveDir.set(dx * inv, dy * inv, 0);
      this.lastPlayerPos.set(p);
    }
  }

  private emitAliveChanged(): void {
    const cap = this.director.isGatekeeperWave() ? this.aliveCapGatekeeper : this.aliveCapNormal;
    EventBus.emit(EVENTS.EnemyAliveChanged, {
      alive: this.enemies.size,
      cap,
      wave: this.director.currentWave,
      zone: this.director.currentZone,
    });
  }
}
