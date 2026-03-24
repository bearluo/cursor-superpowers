import { _decorator, Component, director, game } from 'cc';
import { EventBus } from '../../core/EventBus';
import { EVENTS } from '../../core/Constants';

const { ccclass } = _decorator;

type CorruptionPayload = { value: number };
type ReactionPayload = { reactionId: string };
type MeltdownPayload = { eventType: string; stage: number };
type OverloadPayload = { phase: 'ready' | 'overloading' | 'decay' | 'cooldown' };
type RunEndPayload = { victory: boolean };
type DefeatPayload = { reason: string };
type ReinforcementPayload = { count: number };
type EnemyAlivePayload = { alive: number };

function mapToRecord(map: Map<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  map.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

@ccclass('RunTelemetry')
export class RunTelemetry extends Component {
  private readonly off: Array<() => void> = [];
  private startedAtSec = 0;

  private reactionCount = 0;
  private reactionByType = new Map<string, number>();

  private overloadPressedCount = 0;
  private overloadStartedCount = 0;
  private lastOverloadPhase: OverloadPayload['phase'] = 'ready';

  private maxCorruption = 0;
  private thresholdTimes: Array<{ value: number; tSec: number }> = [];
  private thresholdReached = new Set<number>();

  private meltdownCount = 0;
  private meltdownByType = new Map<string, number>();
  private reinforcementWaves = 0;
  private reinforcementEnemyTotal = 0;
  private maxAliveEnemies = 0;

  private defeatReason = 'unknown';

  onEnable(): void {
    this.startedAtSec = game.totalTime / 1000;
    this.off.push(
      EventBus.on(EVENTS.ReactionTriggered, (p: ReactionPayload) => {
        this.reactionCount += 1;
        this.reactionByType.set(p.reactionId, (this.reactionByType.get(p.reactionId) ?? 0) + 1);
      }),
      EventBus.on(EVENTS.InputOverloadPressed, () => {
        this.overloadPressedCount += 1;
      }),
      EventBus.on(EVENTS.OverloadStateChanged, (p: OverloadPayload) => {
        if (this.lastOverloadPhase !== 'overloading' && p.phase === 'overloading') {
          this.overloadStartedCount += 1;
        }
        this.lastOverloadPhase = p.phase;
      }),
      EventBus.on(EVENTS.CorruptionChanged, (p: CorruptionPayload) => {
        this.maxCorruption = Math.max(this.maxCorruption, p.value);
        this.tryRecordThreshold(33, p.value);
        this.tryRecordThreshold(66, p.value);
        this.tryRecordThreshold(100, p.value);
      }),
      EventBus.on(EVENTS.MeltdownTriggered, (p: MeltdownPayload) => {
        this.meltdownCount += 1;
        const key = `${p.eventType}@S${p.stage}`;
        this.meltdownByType.set(key, (this.meltdownByType.get(key) ?? 0) + 1);
      }),
      EventBus.on(EVENTS.PlayerDefeated, (p: DefeatPayload) => {
        this.defeatReason = p.reason;
      }),
      EventBus.on(EVENTS.ReinforcementSpawned, (p: ReinforcementPayload) => {
        this.reinforcementWaves += 1;
        this.reinforcementEnemyTotal += p.count;
      }),
      EventBus.on(EVENTS.EnemyAliveChanged, (p: EnemyAlivePayload) => {
        this.maxAliveEnemies = Math.max(this.maxAliveEnemies, p.alive);
      }),
      EventBus.on(EVENTS.RunEnded, (p: RunEndPayload) => {
        this.printSummary(p.victory);
      }),
    );
  }

  onDisable(): void {
    for (const fn of this.off) fn();
    this.off.length = 0;
  }

  private tryRecordThreshold(threshold: number, value: number): void {
    if (value < threshold || this.thresholdReached.has(threshold)) return;
    this.thresholdReached.add(threshold);
    this.thresholdTimes.push({ value: threshold, tSec: this.elapsedSec() });
  }

  private elapsedSec(): number {
    return game.totalTime / 1000 - this.startedAtSec;
  }

  private printSummary(victory: boolean): void {
    const summary = {
      victory,
      durationSec: Number(this.elapsedSec().toFixed(2)),
      reactionCount: this.reactionCount,
      reactionByType: mapToRecord(this.reactionByType),
      overloadPressedCount: this.overloadPressedCount,
      overloadStartedCount: this.overloadStartedCount,
      maxCorruption: Number(this.maxCorruption.toFixed(2)),
      thresholdTimes: this.thresholdTimes.map((x) => ({ threshold: x.value, tSec: Number(x.tSec.toFixed(2)) })),
      meltdownCount: this.meltdownCount,
      meltdownByType: mapToRecord(this.meltdownByType),
      reinforcementWaves: this.reinforcementWaves,
      reinforcementEnemyTotal: this.reinforcementEnemyTotal,
      maxAliveEnemies: this.maxAliveEnemies,
      defeatReason: victory ? null : this.defeatReason,
    };
    console.log('[RunTelemetry] summary', summary);
  }
}

