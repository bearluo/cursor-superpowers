import type { ProtocolId, ReactionId, StatusStack } from './CombatTypes';

export type ProtocolStacks = Record<ProtocolId, StatusStack>;

export type ReactionRule = {
  id: ReactionId;
  requires: readonly ProtocolId[];
  minStack?: StatusStack;
};

// 反应规则表（MVP：硬编码）。
// 设计意图：systems 层只提供“可查询规则”，不依赖 UI/场景；后续可替换为数据表或 ScriptableObject。
const RULES: readonly ReactionRule[] = [
  { id: 'OverheatDischarge', requires: ['Ignite', 'Arc'], minStack: 1 },
  { id: 'Superconduct', requires: ['Freeze', 'Arc'], minStack: 1 },
  { id: 'ThermalShock', requires: ['Ignite', 'Freeze'], minStack: 1 },
  { id: 'ToxicFlame', requires: ['Toxin', 'Ignite'], minStack: 1 },
  { id: 'NeuroPulse', requires: ['Toxin', 'Arc'], minStack: 1 },
] as const;

export function getTriggeredReactions(stacks: ProtocolStacks): ReactionRule[] {
  const triggered: ReactionRule[] = [];

  for (const rule of RULES) {
    // minStack 表示“参与反应的每个协议至少要有多少叠层”。
    const min = rule.minStack ?? 1;
    const ok = rule.requires.every((p) => (stacks[p] ?? 0) >= min);
    if (ok) triggered.push(rule);
  }

  return triggered;
}

