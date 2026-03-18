import { assetManager, Asset, AssetManager } from 'cc';

type __types_globals__Constructor<T = unknown> = new (...args: any[]) => T;

export class BundleManager {
  private static bundles = new Map<string, AssetManager.Bundle>();

  static has(name: string): boolean {
    if (name === 'resources') return true;
    return this.bundles.has(name);
  }

  static async loadBundle(name: string): Promise<AssetManager.Bundle> {
    // 内置 resources bundle：无需 loadBundle
    if (name === 'resources') return assetManager.resources;
    const cached = this.bundles.get(name);
    if (cached) return cached;

    const bundle = await new Promise<AssetManager.Bundle>((resolve, reject) => {
      assetManager.loadBundle(name, (err, b) => {
        if (err || !b) reject(err ?? new Error(`loadBundle failed: ${name}`));
        else resolve(b);
      });
    });

    this.bundles.set(name, bundle);
    return bundle;
  }

  static getBundle(name: string): AssetManager.Bundle | null {
    if (name === 'resources') return assetManager.resources;
    return this.bundles.get(name) ?? null;
  }

  static async loadAsset<T extends Asset>(
    bundleName: string,
    path: string,
    type: __types_globals__Constructor<T>
  ): Promise<T> {
    const bundle = await this.loadBundle(bundleName);
    return await new Promise<T>((resolve, reject) => {
      bundle.load(path, type, (err, asset) => {
        if (err || !asset) reject(err ?? new Error(`loadAsset failed: ${bundleName}:${path}`));
        else resolve(asset as T);
      });
    });
  }

  static async preloadDir(bundleName: string, dir: string): Promise<void> {
    const bundle = await this.loadBundle(bundleName);
    await new Promise<void>((resolve, reject) => {
      bundle.preloadDir(dir, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

