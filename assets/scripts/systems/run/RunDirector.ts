import { EventBus } from '../../core/EventBus';
import { EVENTS } from '../../core/Constants';
import { WaveSystem } from './WaveSystem';

// MVP 奖励选项（stub）——后续由"协议芯片/被动/临时增益"系统填充真实数据
export type RunRewardOption = {
  id: string;
  label: string;
};

type RunRewardPayload = {
  options: RunRewardOption[];
};

// RunDirector 是局（Run）生命周期的总调度器：
// - 持有 WaveSystem，驱动 zone/wave 推进
// - 监听 WaveSystem 的 reward 状态，发出 RunRewardOffered 供 UI 订阅展示
// - MVP 不依赖 tick：通过手动调用 simulateKill / onRewardChosen 推进（便于 Debug 场景快速验证）
export class RunDirector {
  get currentZone(): number {
    return this.wave.zone;
  }

  get currentWave(): number {
    return this.wave.wave;
  }

  /** 局是否仍在进行（胜利/失败后为 false） */
  isRunActive(): boolean {
    return this.running;
  }

  private readonly wave = new WaveSystem();
  private running = false;
  private pendingRewardOptions: RunRewardOption[] = [];
  private elapsedInWaveSec = 0;
  private gatekeeperKilledInZone = false;

  // MVP：最大 zone 数（后续可配置）
  private readonly maxZones = 3;
  private readonly waveDurationSec = 120;

  startRun(): void {
    this.running = true;
    this.elapsedInWaveSec = 0;
    this.gatekeeperKilledInZone = false;
    this.wave.startZone(1);
    // MVP：假设生成立即完成（无实际 Spawner），直接进入 clearing 阶段
    this.wave.onSpawnComplete();
  }

  tick(dtSec: number): void {
    if (!this.running) return;
    if (dtSec <= 0) return;
    this.elapsedInWaveSec += dtSec;
    if (this.elapsedInWaveSec < this.waveDurationSec) return;
    // 关键约束：守门波次必须击杀守门者后才能过关。
    if (this.wave.isZoneComplete()) {
      if (!this.gatekeeperKilledInZone) return;
      this.elapsedInWaveSec = 0;
      this.advanceZone();
      return;
    }

    this.elapsedInWaveSec = 0;
    const advanced = this.wave.nextWave();
    if (advanced) this.wave.onSpawnComplete();
  }

  /** 模拟击杀一个敌人（Debug 场景 / 真实战斗均调用） */
  simulateKill(): void {
    if (!this.running) return;
    this.wave.onEnemyKilled();
  }

  markGatekeeperKilled(): void {
    this.gatekeeperKilledInZone = true;
  }

  tryOfferRewardByXp(): boolean {
    if (!this.running) return false;
    if (this.pendingRewardOptions.length > 0) return false;
    this.offerReward();
    return true;
  }

  /** 玩家选定奖励后调用 */
  onRewardChosen(optionId: string): void {
    EventBus.emit(EVENTS.RunRewardChosen, { optionId });
    this.pendingRewardOptions = [];
  }

  private advanceZone(): void {
    const nextZone = this.currentZone + 1;
    if (nextZone > this.maxZones) {
      this.running = false;
      EventBus.emit(EVENTS.RunEnded, { victory: true });
      return;
    }
    this.elapsedInWaveSec = 0;
    this.gatekeeperKilledInZone = false;
    this.wave.startZone(nextZone);
    this.wave.onSpawnComplete();
  }

  private offerReward(): void {
    // stub：三个固定奖励选项；后续替换为随机抽取真实数据
    const options: RunRewardOption[] = [
      { id: 'chip_ignite_up', label: '点火协议强化' },
      { id: 'chip_arc_up', label: '电弧协议强化' },
      { id: 'passive_regen', label: '过载后快速冷却' },
    ];
    this.pendingRewardOptions = options;
    const payload: RunRewardPayload = { options };
    EventBus.emit(EVENTS.RunRewardOffered, payload);
  }

  getPendingRewardOptions(): RunRewardOption[] {
    return this.pendingRewardOptions;
  }

  getEnemyAliveCount(): number {
    return this.wave.getEnemyAliveCount();
  }

  addReinforcementEnemies(count: number): void {
    if (!this.running) return;
    this.wave.addEnemyCount(count);
  }

  isGatekeeperWave(): boolean {
    return this.wave.isGatekeeperWave();
  }

  /** 玩家死亡等失败结算 */
  endRunDefeat(): void {
    if (!this.running) return;
    this.running = false;
    EventBus.emit(EVENTS.RunEnded, { victory: false });
  }
}
