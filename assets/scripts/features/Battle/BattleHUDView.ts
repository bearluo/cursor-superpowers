import { _decorator, Component, Label, ProgressBar } from 'cc';

const { ccclass, property } = _decorator;

// BattleHUDView：纯"渲染层"，只接受外部数据调用，不订阅任何事件，不持有业务逻辑。
// MVP：先用 console.log 占位，Label/ProgressBar 属性在 Creator 里拖拽绑定后可直接生效。
@ccclass('BattleHUDView')
export class BattleHUDView extends Component {
  @property(ProgressBar)
  corruptionBar: ProgressBar | null = null;

  @property(Label)
  corruptionLabel: Label | null = null;

  @property(Label)
  waveLabel: Label | null = null;

  @property(Label)
  overloadLabel: Label | null = null;

  @property(Label)
  reactionToast: Label | null = null;

  /** 更新腐化值显示（0..100） */
  setCorruption(value: number, stage: number): void {
    if (this.corruptionBar) this.corruptionBar.progress = value / 100;
    if (this.corruptionLabel) this.corruptionLabel.string = `腐化: ${value.toFixed(0)}%  [阶段${stage}]`;
    console.log(`[BattleHUDView] 腐化=${value} 阶段=${stage}`);
  }

  /** 更新过载状态显示 */
  setOverload(isOverloading: boolean, remainMs: number): void {
    const text = isOverloading ? `过载中 (${(remainMs / 1000).toFixed(1)}s)` : '过载就绪';
    if (this.overloadLabel) this.overloadLabel.string = text;
    console.log(`[BattleHUDView] 过载=${isOverloading}`);
  }

  /** 更新波次显示 */
  setWave(zone: number, wave: number, state: string): void {
    const text = `区域${zone} 波次${wave} [${state}]`;
    if (this.waveLabel) this.waveLabel.string = text;
    console.log(`[BattleHUDView] ${text}`);
  }

  /** 短暂显示反应提示（MVP：直接赋文字，后续可加计时器自动清除） */
  showReaction(reactionId: string): void {
    if (this.reactionToast) this.reactionToast.string = `⚡ ${reactionId}`;
    console.log(`[BattleHUDView] 反应=${reactionId}`);
  }
}
