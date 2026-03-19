import { EventBus } from '../../core/EventBus';
import { EVENTS } from '../../core/Constants';

// 波次状态机：每个波次经历 spawning → clearing → reward 三个阶段。
// MVP 简化：reward 阶段由 RunDirector 驱动（手动推进），不在 WaveSystem 内自动跳转。
export type WaveState = 'spawning' | 'clearing' | 'reward';

export type WaveChangedPayload = {
  zone: number;
  wave: number;
  state: WaveState;
};

// MVP 奖励数据结构（stub，后续填充具体选项内容）
export type RewardOption = {
  id: string;
  label: string;
};

export class WaveSystem {
  zone = 0;
  wave = 0;
  state: WaveState = 'spawning';

  // MVP：每个 zone 固定 3 波；后续可配置化
  private readonly wavesPerZone = 3;
  private enemyAliveCount = 0;

  /** 启动指定 zone 的第一波 */
  startZone(zone: number): void {
    this.zone = zone;
    this.wave = 1;
    this.state = 'spawning';
    this.enemyAliveCount = this.spawnCountForWave(zone, 1);
    this.emit();
  }

  /** 手动通知一个敌人被击杀，自动判断是否清场 */
  onEnemyKilled(): void {
    if (this.state !== 'clearing') return;
    this.enemyAliveCount = Math.max(0, this.enemyAliveCount - 1);
    if (this.enemyAliveCount <= 0) {
      this.state = 'reward';
      this.emit();
    }
  }

  /** 生成完毕后转入 clearing 阶段（Spawner 调用完成后手动触发） */
  onSpawnComplete(): void {
    if (this.state !== 'spawning') return;
    this.state = 'clearing';
    this.emit();
  }

  /** 奖励选择完毕后推进到下一波 */
  nextWave(): boolean {
    if (this.state !== 'reward') return false;

    if (this.wave < this.wavesPerZone) {
      this.wave += 1;
      this.state = 'spawning';
      this.enemyAliveCount = this.spawnCountForWave(this.zone, this.wave);
      this.emit();
      return true;
    }
    // 本 zone 已清空，由 RunDirector 推进 zone
    return false;
  }

  isWaveCleared(): boolean {
    return this.state === 'reward';
  }

  isZoneComplete(): boolean {
    return this.state === 'reward' && this.wave >= this.wavesPerZone;
  }

  // MVP：简单公式，zone 越高、wave 越靠后，敌人越多
  private spawnCountForWave(zone: number, wave: number): number {
    return 2 + (zone - 1) * 2 + (wave - 1);
  }

  private emit(): void {
    const p: WaveChangedPayload = { zone: this.zone, wave: this.wave, state: this.state };
    EventBus.emit(EVENTS.WaveChanged, p);
  }
}
