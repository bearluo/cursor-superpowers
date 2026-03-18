import {
  BlockInputEvents,
  Color,
  director,
  Graphics,
  instantiate,
  Node,
  Prefab,
  RenderRoot2D,
  Widget,
} from 'cc';
import { BundleManager } from '../../services/BundleManager';
import { ViewBase } from './ViewBase';

export type ViewKey = string;

export type UILayer = 'SceneHUD' | 'Page' | 'Popup' | 'Overlay' | 'Guide' | 'Tip' | 'Debug';

const LAYER_ORDER: UILayer[] = ['SceneHUD', 'Page', 'Popup', 'Overlay', 'Guide', 'Tip', 'Debug'];

/** 有 modal 的 view 的打开顺序，最后一项为当前“最顶层 modal” */
const MODAL_LAYERS: UILayer[] = ['Popup', 'Overlay', 'Guide'];

type OpenOptions = {
  bundle: string;
  prefabPath: string;
  parent?: Node;
  layer?: UILayer;
  data?: unknown;
  /**
   * modal: 是否参与“灰色蒙版”逻辑
   * - true：使用全局唯一共享 dim（不叠加多块灰），并创建透明节点做输入拦截/点击关闭
   * - 典型：Popup/Overlay/Guide
   */
  modal?: boolean;
  /**
   * blockInput: 是否吞掉遮罩上的输入（默认 true）
   */
  blockInput?: boolean;
  /**
   * closeOnMask: 点击遮罩是否关闭该 view（默认 false）
   * - 普通弹窗可 true；Loading/强制引导应为 false
   */
  closeOnMask?: boolean;
};

type OpenedEntry = {
  node: Node;
  layer: UILayer;
  /** 仅做输入拦截/closeOnMask，无视觉（不参与灰色） */
  inputMask?: Node;
};

/** open 被 close 取消时抛出 */
export class CancelledError extends Error {
  override name = 'CancelledError';
}

/** open 因场景切换或 parent 失效而中止时抛出 */
export class AbortedError extends Error {
  override name = 'AbortedError';
}

type RollbackFn = () => void;

type OpenTxn = {
  key: ViewKey;
  seq: number;
  cancelled: boolean;
  committed: boolean;
  rollbackStack: RollbackFn[];
  registerRollback: (fn: RollbackFn) => void;
  cancel: () => void;
  rollback: () => void;
  throwIfInvalid: () => void;
};

export class UIManager {
  private static root: Node | null = null;
  private static layers = new Map<UILayer, Node>();
  private static opened = new Map<ViewKey, OpenedEntry>();
  private static pageKey: ViewKey | null = null;
  private static popupStack: ViewKey[] = [];

  /** 全局唯一“灰色蒙版”节点，随当前最顶层 modal 移动，避免多重叠加加深 */
  private static sharedDimNode: Node | null = null;
  /** 所有带 modal 的 view 的 key，按打开顺序；最后一项为当前最顶层 modal */
  private static modalStack: ViewKey[] = [];
  /**
   * in-flight 事务：key -> 当前正在 open 的事务（含 promise 与 cancel/rollback）
   */
  private static inFlight = new Map<ViewKey, OpenTxn & { promise: Promise<Node> }>();
  /** 全局递增序号：用于保证异步 open 的显示顺序与调用顺序一致 */
  private static openSeq = 0;
  /** viewKey -> 序号（越大越靠上） */
  private static order = new Map<ViewKey, number>();

  static ensureRoot(): Node {
    if (this.root && this.root.isValid) return this.root;
    const scene = director.getScene();
    const node = new Node('UIRoot');
    node.addComponent(RenderRoot2D);
    let widget = node.addComponent(Widget);
    widget.isAlignTop = true;
    widget.isAlignBottom = true;
    widget.isAlignRight = true;
    widget.isAlignLeft = true;
    widget.top = 0;
    widget.left = 0;
    widget.right = 0;
    widget.bottom = 0;
    scene.addChild(node);
    this.root = node;
    this.layers.clear();
    this.order.clear();
    this.modalStack = [];
    this.popupStack = [];
    this.pageKey = null;
    return node;
  }

  static ensureLayers(): void {
    const root = this.ensureRoot();

    for (const layer of LAYER_ORDER) {
      const existing = this.layers.get(layer);
      if (existing && existing.isValid) continue;

      const node = new Node(`Layer_${layer}`);
      node.parent = root;
      this.layers.set(layer, node);
    }

    // 固定 siblingIndex，保证层级顺序稳定
    for (let i = 0; i < LAYER_ORDER.length; i++) {
      const layer = LAYER_ORDER[i];
      const node = this.layers.get(layer);
      if (node && node.isValid) node.setSiblingIndex(i);
    }
  }

  static getLayerRoot(layer: UILayer): Node {
    this.ensureLayers();
    const node = this.layers.get(layer);
    if (!node || !node.isValid) throw new Error(`UI layer not ready: ${layer}`);
    return node;
  }

  /** 仅做输入拦截与点击关闭，无视觉，避免多重灰蒙版叠加加深 */
  private static createInputMask(
    layerRoot: Node,
    key: ViewKey,
    opts: Pick<OpenOptions, 'blockInput' | 'closeOnMask'>,
  ): Node {
    const mask = new Node(`Msk_Block__${key}`);
    mask.parent = layerRoot;

    const widget = mask.addComponent(Widget);
    widget.isAlignTop = true;
    widget.isAlignBottom = true;
    widget.isAlignRight = true;
    widget.isAlignLeft = true;
    widget.top = 0;
    widget.left = 0;
    widget.right = 0;
    widget.bottom = 0;

    if (opts.blockInput ?? true) {
      mask.addComponent(BlockInputEvents);
    }
    if (opts.closeOnMask) {
      mask.on(Node.EventType.TOUCH_END, () => this.close(key));
    }
    return mask;
  }

  private static createSharedDim(): Node {
    const node = new Node('SharedDim');
    const widget = node.addComponent(Widget);
    widget.isAlignTop = true;
    widget.isAlignBottom = true;
    widget.isAlignRight = true;
    widget.isAlignLeft = true;
    widget.top = 0;
    widget.left = 0;
    widget.right = 0;
    widget.bottom = 0;

    const g = node.addComponent(Graphics);
    g.fillColor = new Color(0, 0, 0, 180);
    const size = 1e4;
    g.rect(-size / 2, -size / 2, size, size);
    g.fill();

    return node;
  }

  /** 将共享 dim 放到“当前最顶层 modal”之下，无 modal 时隐藏 */
  private static updateSharedDim(): void {
    // 栈顶可能仍在异步加载中：从栈顶往下找第一个已真正打开的 modal
    let topKey: ViewKey | undefined;
    for (let i = this.modalStack.length - 1; i >= 0; i--) {
      const k = this.modalStack[i];
      const entry = this.opened.get(k);
      if (entry?.node?.isValid) {
        topKey = k;
        break;
      }
    }

    if (!topKey) {
      if (this.sharedDimNode && this.sharedDimNode.isValid) {
        this.sharedDimNode.active = false;
      }
      return;
    }

    const entry = this.opened.get(topKey);
    if (!entry?.node?.isValid) return;

    const layerRoot = entry.node.parent;
    if (!layerRoot) return;

    if (!this.sharedDimNode || !this.sharedDimNode.isValid) {
      this.sharedDimNode = this.createSharedDim();
    }
    this.sharedDimNode.active = true;
    this.sharedDimNode.parent = layerRoot;
    const idx = entry.node.getSiblingIndex();
    this.sharedDimNode.setSiblingIndex(Math.max(0, idx - 1));
  }

  /** 按 order 重排某个 layer 下的子节点，使显示顺序与调用顺序一致 */
  private static reorderLayer(layer: UILayer): void {
    const layerRoot = this.layers.get(layer);
    if (!layerRoot || !layerRoot.isValid) return;

    // 只重排由 UIManager 打开的 view（以及 SharedDim / inputMask 这种由 UIManager 创建的）
    const children = layerRoot.children.slice();
    children.sort((a, b) => {
      // SharedDim：固定在“当前最顶层 modal view”之下，由 updateSharedDim 控制 siblingIndex
      if (a.name === 'SharedDim') return -1;
      if (b.name === 'SharedDim') return 1;

      // 输入遮罩：命名 Msk_Block__<key>，应位于对应 view 之下
      const aKey = a.name.startsWith('Msk_Block__') ? a.name.substring('Msk_Block__'.length) : null;
      const bKey = b.name.startsWith('Msk_Block__') ? b.name.substring('Msk_Block__'.length) : null;

      if (aKey && !bKey) return -1;
      if (!aKey && bKey) return 1;
      if (aKey && bKey) {
        return (this.order.get(aKey) ?? 0) - (this.order.get(bKey) ?? 0);
      }

      // 普通 view：按 key 的 order 排序（找不到则放最底）
      const aOrder = this.order.get(a.name) ?? this.order.get(a.uuid) ?? 0;
      const bOrder = this.order.get(b.name) ?? this.order.get(b.uuid) ?? 0;
      return aOrder - bOrder;
    });

    // 按排序结果设置 siblingIndex
    for (let i = 0; i < children.length; i++) {
      const n = children[i];
      if (n && n.isValid) n.setSiblingIndex(i);
    }
  }

  private static createTxn(key: ViewKey, seq: number): OpenTxn {
    const sceneAtStart = director.getScene();
    // 注意：parent/layer 由 open() 决定并在 throwIfInvalid 中校验；txn 本身只提供通用取消/回滚机制
    const rollbackStack: RollbackFn[] = [];
    const runRollback = () => {
      // LIFO rollback
      for (let i = rollbackStack.length - 1; i >= 0; i--) {
        try {
          rollbackStack[i]?.();
        } catch {
          // swallow rollback errors
        }
      }
    };
    const txn: OpenTxn = {
      key,
      seq,
      cancelled: false,
      committed: false,
      rollbackStack,
      registerRollback(fn: RollbackFn) {
        rollbackStack.push(fn);
      },
      cancel() {
        if (txn.cancelled || txn.committed) return;
        txn.cancelled = true;
        runRollback();
      },
      rollback() {
        if (txn.committed) return;
        runRollback();
      },
      throwIfInvalid() {
        if (txn.cancelled) throw new CancelledError(`UI open cancelled: ${key}`);
        // sceneAtStart 只在 open() 内部用于校验；这里提供一个基础兜底，避免“跨场景 commit”
        if (director.getScene() !== sceneAtStart) throw new AbortedError(`UI open aborted (scene changed): ${key}`);
      },
    };
    return txn;
  }

  static async open(key: ViewKey, opts: OpenOptions): Promise<Node> {
    const existing = this.opened.get(key);
    if (existing?.node && existing.node.isValid) return existing.node;

    const inflightTxn = this.inFlight.get(key);
    if (inflightTxn) return await inflightTxn.promise;

    // 先分配调用序号：确保即使异步完成顺序乱了，最终层级仍与调用顺序一致
    const myOrder = ++this.openSeq;
    const txn = this.createTxn(key, myOrder);
    // order 属于“副作用”，需可回滚
    this.order.set(key, myOrder);
    txn.registerRollback(() => this.order.delete(key));

    const p = (async () => {
      // 捕获开始 open 时的场景引用：异步完成后若场景已切换，则放弃挂载并清理
      const sceneAtStart = director.getScene();

      const layer = opts.layer ?? 'Page';
      const parent = opts.parent ?? this.getLayerRoot(layer);
      const parentAtStart = parent;

      // 额外校验点：scene/parent 属于 open() 语义的一部分
      const throwIfAborted = () => {
        txn.throwIfInvalid();
        if (director.getScene() !== sceneAtStart) throw new AbortedError(`UI open aborted (scene changed): ${key}`);
        if (!parentAtStart.isValid) throw new AbortedError(`UI open aborted (parent invalid): ${key}`);
      };

      // popupStack 必须按“调用顺序”记录，因此也要放在第一个 await 之前
      // 注意：此处仅记录顺序；closeTopPopup 会跳过尚未打开的项
      if (layer === 'Popup') {
        const prev = this.popupStack.slice();
        this.popupStack = this.popupStack.filter((k) => k !== key);
        this.popupStack.push(key);
        txn.registerRollback(() => {
          this.popupStack = prev;
        });
      }

      // modalStack 必须按“调用顺序”记录，因此要放在第一个 await 之前
      // 注意：此处只是记录顺序；SharedDim 实际挂载会在 view 真正打开后生效（updateSharedDim 会跳过未打开项）
      const isModalLayer = MODAL_LAYERS.indexOf(layer) >= 0;
      if (opts.modal && isModalLayer) {
        const prev = this.modalStack.slice();
        this.modalStack = this.modalStack.filter((k) => k !== key);
        this.modalStack.push(key);
        this.updateSharedDim();
        txn.registerRollback(() => {
          this.modalStack = prev;
          this.updateSharedDim();
        });
      }

      // 透明输入遮罩：
      // - Popup：建议延后创建（避免“先调用后显示”的遮罩抢输入），但仍要保证排序一致
      // - Overlay/Guide：可根据需要提前创建来阻断输入
      const shouldCreateMaskBeforeLoad = opts.modal && (layer === 'Overlay' || layer === 'Guide');
      const inputMask = shouldCreateMaskBeforeLoad ? this.createInputMask(parent, key, opts) : undefined;
      if (inputMask) {
        txn.registerRollback(() => {
          if (inputMask.isValid) inputMask.destroy();
        });
      }

      let prefab: Prefab;
      try {
        prefab = await BundleManager.loadAsset(opts.bundle, opts.prefabPath, Prefab);
      } catch (e) {
        txn.rollback();
        throw e;
      }

      // 场景变化或父节点失效：直接丢弃，避免 UI 挂到新场景/已销毁节点
      throwIfAborted();

      const node = instantiate(prefab) as Node;
      node.parent = parentAtStart;
      // 让 node 名字与 key 对齐，便于层级排序与排查（不影响 prefab 原本名字）
      node.name = key;

      // Popup/其他层：延后创建输入遮罩，避免异步顺序导致遮罩先于目标 view 抢输入
      const finalInputMask =
        inputMask ??
        (opts.modal ? this.createInputMask(parentAtStart, key, opts) : undefined);
      if (!inputMask && finalInputMask) {
        // 若此事务最终失败/取消，需要清理延后创建的 mask
        txn.registerRollback(() => {
          if (finalInputMask.isValid) finalInputMask.destroy();
        });
      }

      if (finalInputMask && finalInputMask.isValid) {
        // 遮罩在 view 之下（同层），再由 reorderLayer 修正整体顺序
        finalInputMask.setSiblingIndex(Math.max(0, node.getSiblingIndex() - 1));
      }

      const view = node.getComponent(ViewBase);
      view?.onShow(opts.data);

      this.opened.set(key, { node, layer, inputMask: finalInputMask });

      // view 真正打开后，SharedDim 才可能成功挂载；再更新一次
      if (opts.modal && isModalLayer) this.updateSharedDim();

      if (layer === 'Page') {
        if (this.pageKey && this.pageKey !== key) this.close(this.pageKey);
        this.pageKey = key;
      }

      // 确保最终 siblingIndex 顺序与调用顺序一致
      this.reorderLayer(layer);

      txn.committed = true;
      return node;
    })();

    this.inFlight.set(key, { ...txn, promise: p });
    try {
      return await p;
    } catch (e) {
      // aborted / load error：若未 commit，必须回滚副作用
      txn.rollback();
      throw e;
    } finally {
      const cur = this.inFlight.get(key);
      if (cur?.seq === myOrder) this.inFlight.delete(key);
    }
  }

  static close(key: ViewKey): void {
    // in-flight 取消：保证 close 可以取消正在异步 open 的 key
    const inflight = this.inFlight.get(key);
    if (inflight) {
      try {
        inflight.cancel();
      } finally {
        // 及时移除，避免后续 open 复用到已取消 promise
        this.inFlight.delete(key);
      }
    }

    const entry = this.opened.get(key);
    if (!entry) return;

    const { node, inputMask } = entry;
    if (!node || !node.isValid) return;

    const wasModal = this.modalStack.indexOf(key) >= 0;

    const view = node.getComponent(ViewBase);
    view?.onHide();
    node.destroy();
    if (inputMask && inputMask.isValid) inputMask.destroy();
    this.opened.delete(key);
    this.order.delete(key);

    if (wasModal) {
      this.modalStack = this.modalStack.filter((k) => k !== key);
      this.updateSharedDim();
    }

    if (this.pageKey === key) this.pageKey = null;
    this.popupStack = this.popupStack.filter((k) => k !== key);

    // 关闭后重排 Popup/Overlay/Guide 所在层，保持顺序稳定
    //（Page 通常单例；其它层按需重排也不会有副作用）
    this.reorderLayer('Popup');
    this.reorderLayer('Overlay');
    this.reorderLayer('Guide');
  }

  static closeTopPopup(): void {
    // 异步 open 可能导致 stack 顶部尚未完成挂载；从后往前找第一个已打开的 popup
    for (let i = this.popupStack.length - 1; i >= 0; i--) {
      const key = this.popupStack[i];
      const entry = this.opened.get(key);
      if (entry?.node?.isValid) {
        this.close(key);
        return;
      }
    }
  }

  static closeAll(): void {
    [...this.opened.keys()].forEach((k) => this.close(k));
    this.modalStack = [];
    this.updateSharedDim();
  }
}

