import type { EnemyId, ProtocolId, ReactionId, StatusStack } from './CombatTypes';
import { getTriggeredReactions, type ProtocolStacks } from './ReactionTable';

function clampStack(v: number): StatusStack {
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

function emptyStacks(): ProtocolStacks {
  // 显式填满所有协议 key，避免后续访问出现 undefined 分支。
  return { Ignite: 0, Freeze: 0, Toxin: 0, Arc: 0 };
}

// 协议叠层运行时（纯逻辑，不发事件；事件在更高层聚合系统里做）。
// MVP 约束：
// - 叠层范围固定为 0..100
// - 反应触发后直接清空参与反应的协议（后续可替换为“衰减/转移/倍率结算”等更复杂清算）
export class ProtocolSystem {
  private readonly stacksByEnemy = new Map<EnemyId, ProtocolStacks>();

  apply(enemyId: EnemyId, protocol: ProtocolId, delta: number): void {
    const s = this.stacksByEnemy.get(enemyId) ?? emptyStacks();
    s[protocol] = clampStack((s[protocol] ?? 0) + delta);
    this.stacksByEnemy.set(enemyId, s);
  }

  consumeReactions(enemyId: EnemyId): ReactionId[] {
    const s = this.stacksByEnemy.get(enemyId);
    if (!s) return [];

    const reactions: ReactionId[] = [];
    const rules = getTriggeredReactions(s);

    // MVP：把当前“满足条件的反应”全部触发，然后清空参与反应的协议。
    // 注意：如果多条反应共享同一个协议，这里按规则遍历顺序清空，可能影响后续反应的可触发性；
    // 这正是 MVP 的简化点（先保证闭环可玩，后续再引入更精确的清算顺序/优先级）。
    for (const rule of rules) {
      reactions.push(rule.id);
      for (const p of rule.requires) s[p] = 0;
    }

    return reactions;
  }
}

