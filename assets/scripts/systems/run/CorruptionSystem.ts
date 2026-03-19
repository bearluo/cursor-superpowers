import { EventBus } from '../../core/EventBus';
import { EVENTS } from '../../core/Constants';

export type CorruptionAddReason = 'time' | 'overload' | 'reaction' | 'other';

function clamp01to100(v: number): number {
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

// 腐化值系统（纯运行时状态 + 事件广播）。
// 设计意图：UI 与其他系统只订阅 `EVENTS.CorruptionChanged`，不要直接依赖此类的内部实现。
export class CorruptionSystem {
  value = 0;

  constructor(public readonly thresholds: [number, number, number]) {}

  add(amount: number, reason: CorruptionAddReason): void {
    const prev = this.value;
    this.value = clamp01to100(this.value + amount);
    const stage = this.getStage();
    EventBus.emit(EVENTS.CorruptionChanged, {
      prevValue: prev,
      value: this.value,
      stage,
      reason,
    });
  }

  getStage(): 0 | 1 | 2 | 3 {
    const [t1, t2, t3] = this.thresholds;
    // stage 是“跨阈值触发器”的输入：只关心落在哪个区间（而不是具体数值）。
    if (this.value >= t3) return 3;
    if (this.value >= t2) return 2;
    if (this.value >= t1) return 1;
    return 0;
  }
}

