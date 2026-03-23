import { _decorator, Component } from 'cc';
import { EventBus } from '../../core/EventBus';
import { EVENTS } from '../../core/Constants';

const { ccclass, property } = _decorator;

@ccclass('PlayerHealth')
export class PlayerHealth extends Component {
  @property
  maxHp = 100;

  hp = 100;

  get isDead(): boolean {
    return this.hp <= 0;
  }

  private offHudReady: (() => void) | null = null;

  onEnable(): void {
    this.offHudReady = EventBus.on(EVENTS.BattleHUDReady, () => {
      this.emitHealth();
    });
    // HUD 已先于玩家挂载时，补发一次（不等待下一次 BattleHUDReady）
    this.emitHealth();
  }

  onDisable(): void {
    this.offHudReady?.();
    this.offHudReady = null;
  }

  start(): void {
    this.hp = this.maxHp;
    this.emitHealth();
  }

  /** @returns 是否已死亡 */
  applyDamage(amount: number): boolean {
    if (this.isDead || amount <= 0) return this.isDead;
    this.hp = Math.max(0, this.hp - amount);
    this.emitHealth();
    return this.isDead;
  }

  /** 向 HUD 同步当前血量（含 BattleHUDReady 触发时的补发） */
  emitHealth(): void {
    EventBus.emit(EVENTS.PlayerHealthChanged, { hp: this.hp, maxHp: this.maxHp });
  }
}
