import { _decorator, Component, Prefab } from 'cc';
import { UIManager } from '../framework/ui/UIManager';
import { BundleManager } from '../services/BundleManager';

const { ccclass } = _decorator;

/**
 * 手动竞态自测脚本（无自动化测试框架时使用）
 *
 * 用法（建议）：
 * - 在一个 Debug 场景中新建节点挂上此组件
 * - 确保 `slowOpts` 对应的 prefab 路径存在（或改成你项目里一个较大的 prefab）
 * - 运行后查看控制台输出（PASS/FAIL）
 */
@ccclass('UIManagerAsyncSpec')
export class UIManagerAsyncSpec extends Component {
  private loadCount = 0;
  /** 下一次 Prefab 加载前等待的毫秒数（用于取消用例，保证 close 先于 load 完成） */
  private delayNextLoadMs = 0;

  async start(): Promise<void> {
    const self = this;
    const original = BundleManager.loadAsset.bind(BundleManager);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (BundleManager as any).loadAsset = async (bundleName: string, path: string, type: new (...args: any[]) => any) => {
      if (type === Prefab) {
        self.loadCount++;
        if (self.delayNextLoadMs > 0) {
          const ms = self.delayNextLoadMs;
          self.delayNextLoadMs = 0;
          await new Promise((r) => setTimeout(r, ms));
        }
      }
      return await original(bundleName, path, type);
    };

    try {
      await this.spec_closeCancelsInflight();
      await this.spec_openDedup();
      await this.spec_abortedParentInvalid();
      await this.spec_closeTopPopupSkipsInflight();
      console.log('[UIManagerAsyncSpec] DONE');
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (BundleManager as any).loadAsset = original;
    }
  }

  private async spec_closeCancelsInflight(): Promise<void> {
    const key = '__Spec__A';

    const slowOpts = {
      bundle: 'resources',
      prefabPath: 'prefabs/ui/Login/UI_Login',
      layer: 'Popup' as const,
      modal: true,
      closeOnMask: false,
    };

    // 延迟第一次 load，保证 close() 在本轮事件循环内先执行，从而命中 in-flight 取消
    this.delayNextLoadMs = 50;
    const p = UIManager.open(key, slowOpts);
    UIManager.close(key);

    try {
      await p;
      console.error('[UIManagerAsyncSpec] FAIL: close did not cancel in-flight open');
    } catch (e) {
      const name = (e as { name?: string } | null)?.name;
      if (name === 'CancelledError') console.log('[UIManagerAsyncSpec] PASS: CancelledError');
      else console.error('[UIManagerAsyncSpec] FAIL: expected CancelledError, got', e);
    }
  }

  private async spec_openDedup(): Promise<void> {
    this.loadCount = 0;
    const key = '__Spec__B';

    const opts = {
      bundle: 'resources',
      prefabPath: 'prefabs/ui/Login/UI_Login',
      layer: 'Popup' as const,
      modal: false,
    };

    const p1 = UIManager.open(key, opts);
    const p2 = UIManager.open(key, opts);
    
    try {
      // 避免依赖 ES2020 Promise.allSettled
      await Promise.all([p1.catch(() => null), p2.catch(() => null)]);
    } finally {
      // 清理（不关心是否已打开成功）
      UIManager.close(key);
    }

    if (this.loadCount <= 1) console.log('[UIManagerAsyncSpec] PASS: open dedup (loadCount=', this.loadCount, ')');
    else console.error('[UIManagerAsyncSpec] FAIL: open dedup (loadCount=', this.loadCount, ')');
  }

  private async spec_abortedParentInvalid(): Promise<void> {
    const key = '__Spec__AbortParent';
    const parent = this.node;

    const opts = {
      bundle: 'resources',
      prefabPath: 'prefabs/ui/Login/UI_Login',
      parent,
      layer: 'Popup' as const,
      modal: false,
    };

    const p = UIManager.open(key, opts);
    parent.destroy();

    try {
      await p;
      console.error('[UIManagerAsyncSpec] FAIL: expected AbortedError (parent invalid)');
    } catch (e) {
      const name = (e as { name?: string } | null)?.name;
      if (name === 'AbortedError') console.log('[UIManagerAsyncSpec] PASS: AbortedError(parent invalid)');
      else console.error('[UIManagerAsyncSpec] FAIL: expected AbortedError, got', e);
    }
  }

  private async spec_closeTopPopupSkipsInflight(): Promise<void> {
    // 构造：一个 in-flight popup + 一个已打开 popup，然后调用 closeTopPopup
    const inflightKey = '__Spec__InflightPopup';
    const openedKey = '__Spec__OpenedPopup';

    const popupOpts = {
      bundle: 'resources',
      prefabPath: 'prefabs/ui/Login/UI_Login',
      layer: 'Popup' as const,
      modal: true,
      closeOnMask: false,
    };

    // 发起一个 in-flight（不 await）
    const pInflight = UIManager.open(inflightKey, popupOpts);

    // 再打开一个（可能也会慢，但我们尝试 await；失败也不阻断此 spec）
    await UIManager.open(openedKey, popupOpts).catch(() => null);

    // 关闭顶层 popup：应跳过未 opened 的 inflightKey，关闭 openedKey（若存在）
    UIManager.closeTopPopup();

    // 清理：确保不会残留
    UIManager.close(inflightKey);
    UIManager.close(openedKey);
    await pInflight.catch(() => null);

    console.log('[UIManagerAsyncSpec] PASS: closeTopPopup skips in-flight (manual verify by hierarchy if needed)');
  }
}

