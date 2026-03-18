type Handler<T = unknown> = (payload: T) => void;

export class EventBus {
  private static listeners = new Map<string, Set<Handler>>();

  static on<T = unknown>(event: string, handler: Handler<T>): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(handler as Handler);
    this.listeners.set(event, set);
    return () => this.off(event, handler);
  }

  static off<T = unknown>(event: string, handler: Handler<T>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(handler as Handler);
    if (set.size === 0) this.listeners.delete(event);
  }

  static emit<T = unknown>(event: string, payload: T): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // copy 避免回调里 off/on 影响迭代
    [...set].forEach((h) => h(payload));
  }
}

