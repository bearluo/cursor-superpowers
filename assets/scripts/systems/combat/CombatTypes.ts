export type ProtocolId = 'Ignite' | 'Freeze' | 'Toxin' | 'Arc';
export type StatusStack = number; // 0..100

export type EnemyId = string;
export type PlayerId = 'P1';

export type ReactionId =
  | 'OverheatDischarge'
  | 'Superconduct'
  | 'ThermalShock'
  | 'ToxicFlame'
  | 'NeuroPulse';

export type CombatTickMs = number;

export type Corruption = {
  value: number; // 0..100
  thresholds: [number, number, number]; // e.g. [33,66,100]
};

