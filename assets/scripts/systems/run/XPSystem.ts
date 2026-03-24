import { EventBus } from '../../core/EventBus';
import { EVENTS } from '../../core/Constants';

export type XpOrbTier = 'S' | 'M' | 'L';
export type XpDropInput = {
  power: number;
  enemyId: string;
};

const ORB_XP: Record<XpOrbTier, number> = {
  S: 1,
  M: 3,
  L: 8,
};

export class XPSystem {
  rewardLevel = 1;
  xpCurrent = 0;
  xpNeedCurrent = this.getXpNeed(1);

  emitProgress(): void {
    EventBus.emit(EVENTS.XpProgressChanged, {
      xpCurrent: this.xpCurrent,
      xpNeed: this.xpNeedCurrent,
      rewardLevel: this.rewardLevel,
    });
  }

  onEnemyKilled(input: XpDropInput): number {
    const tier = this.rollOrbTier(input.power);
    const xp = ORB_XP[tier];
    EventBus.emit(EVENTS.XpOrbDropped, { enemyId: input.enemyId, tier, xp, power: input.power });
    return xp;
  }

  collectXp(amount: number): void {
    if (amount <= 0) return;
    this.xpCurrent += amount;
    EventBus.emit(EVENTS.XpCollected, { amount, xpCurrent: this.xpCurrent });

    let triggered = false;
    while (this.xpCurrent >= this.xpNeedCurrent) {
      this.xpCurrent -= this.xpNeedCurrent;
      this.rewardLevel += 1;
      this.xpNeedCurrent = this.getXpNeed(this.rewardLevel);
      triggered = true;
    }

    this.emitProgress();
    if (triggered) EventBus.emit(EVENTS.RewardReadyByXp, { rewardLevel: this.rewardLevel });
  }

  private getXpNeed(level: number): number {
    return Math.round(8 + 3 * level + 1.5 * Math.pow(level, 1.35));
  }

  private rollOrbTier(power: number): XpOrbTier {
    const safe = Math.max(0.5, power);
    const s = 60 / safe;
    const m = 30 * Math.sqrt(safe);
    const l = 10 * safe;
    const sum = s + m + l;
    const r = Math.random() * sum;
    if (r < s) return 'S';
    if (r < s + m) return 'M';
    return 'L';
  }
}

