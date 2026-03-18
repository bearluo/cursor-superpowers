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
} as const;

export const VIEW_KEYS = {
  Login: 'Login',
} as const;

export type ViewKey = (typeof VIEW_KEYS)[keyof typeof VIEW_KEYS];

export const VIEWS: Record<ViewKey, { bundle: string; prefabPath: string }> = {
  // 约定：UI prefab 的加载都走 UIManager + BundleManager
  // 注意：你需要创建对应 prefab，并保证路径匹配（不含扩展名）
  [VIEW_KEYS.Login]: { bundle: BUNDLES.Resources, prefabPath: 'prefabs/ui/Login/UI_Login' },
} as const;

