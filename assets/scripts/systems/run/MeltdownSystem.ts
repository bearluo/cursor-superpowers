import { EventBus } from '../../core/EventBus';
import { EVENTS } from '../../core/Constants';
import type { CorruptionSystem } from './CorruptionSystem';

// MVP 失控事件种类（先只 emit 类型，不做实体生成；后续可被 EnemySpawner/SceneHazard 等订阅）。
export type MeltdownEventType = 'HunterSpawned' | 'ProtocolLockout' | 'EnvironmentHazard';

export type MeltdownPayload = {
  eventType: MeltdownEventType;
  stage: number; // 跨越到的新阶段
};

// MeltdownSystem 是"腐化阈值观察者"：
// - 订阅 CorruptionSystem 广播的 CorruptionChanged
// - 当 stage 升高（跨阈值）时，依照 stage 选择失控事件类型并广播 MeltdownTriggered
// - 自身不产生状态，只做触发转发，UI/World 系统通过 MeltdownTriggered 订阅响应
export class MeltdownSystem {
  // 跟踪已到达的最高 stage，避免同一 stage 重复触发
  private lastStage: number;

  // 三种失控事件按 stage 循环选取（MVP 简单策略；后续可改为权重随机/剧情锁定）
  private readonly eventTypes: readonly MeltdownEventType[] = [
    'HunterSpawned',
    'ProtocolLockout',
    'EnvironmentHazard',
  ];

  constructor(corruption: CorruptionSystem) {
    this.lastStage = corruption.getStage();

    EventBus.on(EVENTS.CorruptionChanged, (payload: { stage: number }) => {
      if (payload.stage > this.lastStage) {
        this.lastStage = payload.stage;
        this.trigger(payload.stage);
      }
    });
  }

  private trigger(stage: number): void {
    // stage 1/2/3 依次对应 index 0/1/2
    const eventType = this.eventTypes[(stage - 1) % this.eventTypes.length];
    const p: MeltdownPayload = { eventType, stage };
    EventBus.emit(EVENTS.MeltdownTriggered, p);
  }
}
