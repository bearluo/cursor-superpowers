export const SCENES = {
  Launch: 'Launch',
  Login: 'Login',
  Lobby: 'Lobby',
} as const;

export const BUNDLES = {
  // 注意：很多平台/团队流程里 main 包资源不允许运行时动态加载
  // 约定：动态加载使用内置 resources bundle 或自定义业务 bundle
  Resources: 'resources',
  Battle: 'battle',
  Tutorial: 'tutorial',
  // 约定：活动包名用 activity_xxx
} as const;

export const EVENTS = {
  AppReady: 'app:ready',
  SceneChange: 'scene:change',
  InputMove: 'input:move',
  InputOverloadPressed: 'input:overload-pressed',
  InputRewardChosen: 'input:reward-chosen',
  /** 战斗流程暂停（奖励选择、玩家死亡等），用于暂停移动/自动战斗等 */
  BattleFlowPaused: 'battle:flow-paused',
  /** 玩家生命值变化，供 HUD 显示 */
  PlayerHealthChanged: 'combat:player-health-changed',
  /** 战斗 HUD 已挂载并注册监听后发出，供 PlayerHealth 等补发一次当前状态 */
  BattleHUDReady: 'ui:battle-hud-ready',
  // 约定：事件名用“域:动作”，便于在 Creator 控制台/日志里按域过滤。
  CombatStarted: 'combat:started',
  CombatTick: 'combat:tick',
  ProtocolApplied: 'combat:protocol-applied',
  ReactionTriggered: 'combat:reaction-triggered',
  CorruptionChanged: 'run:corruption-changed',
  OverloadStateChanged: 'run:overload-state-changed',
  WaveChanged: 'run:wave-changed',
  RunRewardOffered: 'run:reward-offered',
  RunRewardChosen: 'run:reward-chosen',
  RunEnded: 'run:ended',
  // 腐化值跨越阈值时触发，MeltdownSystem 负责侦听并发出
  MeltdownTriggered: 'run:meltdown-triggered',
} as const;

export const VIEW_KEYS = {
  Login: 'Login',
  Battle: 'Battle',
} as const;

export type ViewKey = (typeof VIEW_KEYS)[keyof typeof VIEW_KEYS];

export const VIEWS: Record<ViewKey, { bundle: string; prefabPath: string }> = {
  // 约定：UI prefab 的加载都走 UIManager + BundleManager
  // 注意：你需要创建对应 prefab，并保证路径匹配（不含扩展名）
  [VIEW_KEYS.Login]: { bundle: BUNDLES.Resources, prefabPath: 'prefabs/ui/Login/UI_Login' },
  [VIEW_KEYS.Battle]: { bundle: BUNDLES.Resources, prefabPath: 'prefabs/ui/Battle/HUD_Battle' },
} as const;

