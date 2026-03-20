import { EventBus } from '../../core/EventBus';
import { EVENTS } from '../../core/Constants';
import type { ProtocolId } from '../../systems/combat/CombatTypes';
import { EnemyAgent } from './EnemyAgent';
import { ProtocolSystem } from '../../systems/combat/ProtocolSystem';
import { OverloadSystem } from '../../systems/run/OverloadSystem';

type AutoAttackHooks = {
  getEnemies: () => EnemyAgent[];
  onEnemyKilled: (enemy: EnemyAgent) => void;
};

export class AutoAttackSystem {
  damage = 14;
  attackIntervalMs = 650;
  reactionDamage = 18;
  reactionMultiplier = 1;

  private timerMs = 0;
  private readonly pairs: ReadonlyArray<[ProtocolId, ProtocolId]> = [
    ['Ignite', 'Arc'],
    ['Freeze', 'Arc'],
    ['Ignite', 'Freeze'],
    ['Toxin', 'Ignite'],
    ['Toxin', 'Arc'],
  ];
  private pairIndex = 0;

  constructor(
    private readonly protocol: ProtocolSystem,
    private readonly overload: OverloadSystem,
    private readonly hooks: AutoAttackHooks,
  ) {}

  tick(dtMs: number): void {
    this.timerMs += dtMs;
    if (this.timerMs < this.attackIntervalMs) return;
    this.timerMs = 0;
    this.attackNearest();
  }

  private attackNearest(): void {
    const enemies = this.hooks.getEnemies().filter((e) => !e.isDead);
    const target = enemies[0];
    if (!target) return;

    const baseDmg = this.overload.isOverloading ? this.damage * 1.35 : this.damage;
    const killedByBase = target.applyDamage(baseDmg);

    const [p1, p2] = this.pairs[this.pairIndex % this.pairs.length];
    this.pairIndex += 1;
    const stackDelta = this.overload.isOverloading ? 80 : 60;
    this.protocol.apply(target.enemyId, p1, stackDelta);
    this.protocol.apply(target.enemyId, p2, stackDelta);
    const reactions = this.protocol.consumeReactions(target.enemyId);
    for (const reactionId of reactions) {
      EventBus.emit(EVENTS.ReactionTriggered, { reactionId, enemyId: target.enemyId });
      const reactionDmg = this.reactionDamage * this.reactionMultiplier * (this.overload.isOverloading ? 1.5 : 1);
      const killedByReaction = target.applyDamage(reactionDmg);
      if (killedByReaction) {
        this.hooks.onEnemyKilled(target);
        return;
      }
      for (const splash of enemies) {
        if (splash === target || splash.isDead) continue;
        const dead = splash.applyDamage(reactionDmg * 0.4);
        if (dead) this.hooks.onEnemyKilled(splash);
      }
    }

    if (killedByBase) this.hooks.onEnemyKilled(target);
  }
}
