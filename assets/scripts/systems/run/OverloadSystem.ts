import { EventBus } from '../../core/EventBus';
import { EVENTS } from '../../core/Constants';

export type OverloadStatePayload = {
  isOverloading: boolean;
  cooldownMs: number;
  durationMsRemaining: number;
  /** 冷却总时长（用于 HUD 进度条比例） */
  cooldownMaxMs: number;
  /** 过载持续总时长（用于 HUD 进度条比例） */
  overloadDurationMaxMs: number;
};

// 主动过载系统（最小状态机）。
// 设计意图：外部只需要订阅 `EVENTS.OverloadStateChanged` 来更新 HUD/按钮状态。
export class OverloadSystem {
  isOverloading = false;
  cooldownMs = 0;
  durationMsRemaining = 0;

  // MVP：先用常量时长与冷却。后续可以从“角色/芯片/难度”注入数值。
  private readonly overloadDurationMs = 6000;
  private readonly overloadCooldownMs = 12000;

  startOverload(): void {
    if (this.isOverloading) return;
    if (this.cooldownMs > 0) return;

    this.isOverloading = true;
    this.durationMsRemaining = this.overloadDurationMs;
    this.emit();
  }

  endOverload(): void {
    if (!this.isOverloading) return;
    this.isOverloading = false;
    this.durationMsRemaining = 0;
    this.cooldownMs = this.overloadCooldownMs;
    this.emit();
  }

  tick(dtMs: number): void {
    if (dtMs <= 0) return;

    if (this.isOverloading) {
      this.durationMsRemaining = Math.max(0, this.durationMsRemaining - dtMs);
      this.emit();
      if (this.durationMsRemaining <= 0) this.endOverload();
      return;
    }

    if (this.cooldownMs > 0) {
      this.cooldownMs = Math.max(0, this.cooldownMs - dtMs);
      this.emit();
    }
  }

  private emit(): void {
    const payload: OverloadStatePayload = {
      isOverloading: this.isOverloading,
      cooldownMs: this.cooldownMs,
      durationMsRemaining: this.durationMsRemaining,
      cooldownMaxMs: this.overloadCooldownMs,
      overloadDurationMaxMs: this.overloadDurationMs,
    };
    EventBus.emit(EVENTS.OverloadStateChanged, payload);
  }
}

