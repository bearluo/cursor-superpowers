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

  /** 可选：过载持续 / 冷却剩余 的进度（与 overloadLabel 同步） */
  @property(ProgressBar)
  overloadBar: ProgressBar | null = null;

  @property(Label)
  reactionToast: Label | null = null;

  @property(Label)
  rewardLabel: Label | null = null;

  @property(ProgressBar)
  playerHpBar: ProgressBar | null = null;

  @property(Label)
  playerHpLabel: Label | null = null;

  @property(Label)
  runEndLabel: Label | null = null;

  /** 更新腐化值显示（0..100） */
  setCorruption(value: number, stage: number): void {
    if (this.corruptionBar) this.corruptionBar.progress = value / 100;
    if (this.corruptionLabel) this.corruptionLabel.string = `腐化: ${value.toFixed(0)}%  [阶段${stage}]`;
    console.log(`[BattleHUDView] 腐化=${value} 阶段=${stage}`);
  }

  /**
   * 更新过载状态显示（过载持续中 / 冷却中 / 可释放）
   * @param cooldownMs 剩余冷却毫秒数（仅非过载时有效）
   * @param cooldownMaxMs 冷却总毫秒数
   * @param overloadDurationMaxMs 过载持续总毫秒数
   */
  setOverload(
    isOverloading: boolean,
    durationRemainMs: number,
    cooldownMs: number,
    cooldownMaxMs: number,
    overloadDurationMaxMs: number,
  ): void {
    let text: string;
    if (isOverloading) {
      text = `过载中 ${(durationRemainMs / 1000).toFixed(1)}s / ${(overloadDurationMaxMs / 1000).toFixed(0)}s`;
    } else if (cooldownMs > 0) {
      text = `冷却中 ${(cooldownMs / 1000).toFixed(1)}s / ${(cooldownMaxMs / 1000).toFixed(0)}s`;
    } else {
      text = '过载就绪 (Space)';
    }
    if (this.overloadLabel) this.overloadLabel.string = text;

    if (this.overloadBar) {
      if (isOverloading && overloadDurationMaxMs > 0) {
        this.overloadBar.progress = durationRemainMs / overloadDurationMaxMs;
      } else if (cooldownMs > 0 && cooldownMaxMs > 0) {
        // 冷却剩余占比（从满条随时间减少）
        this.overloadBar.progress = cooldownMs / cooldownMaxMs;
      } else {
        this.overloadBar.progress = 1;
      }
    }
    console.log(`[BattleHUDView] 过载=${isOverloading} cd=${cooldownMs}ms`);
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

  setRewardOptions(options: Array<{ label: string }>): void {
    const text = options.map((o, idx) => `${idx + 1}.${o.label}`).join('  ');
    if (this.rewardLabel) this.rewardLabel.string = `奖励选择: ${text}`;
    console.log(`[BattleHUDView] 奖励弹出 ${text}`);
  }

  clearRewardChoice(chosenId: string): void {
    if (this.rewardLabel) this.rewardLabel.string = `奖励已选: ${chosenId}`;
    console.log(`[BattleHUDView] 奖励已选 ${chosenId}`);
  }

  showMilestone(text: string): void {
    if (this.reactionToast) this.reactionToast.string = text;
    console.log(`[BattleHUDView] 里程碑 ${text}`);
  }

  setPlayerHealth(hp: number, maxHp: number): void {
    const ratio = maxHp > 0 ? hp / maxHp : 0;
    if (this.playerHpBar) this.playerHpBar.progress = ratio;
    if (this.playerHpLabel) this.playerHpLabel.string = `生命: ${Math.ceil(hp)}/${maxHp}`;
    console.log(`[BattleHUDView] HP ${hp}/${maxHp}`);
  }

  showRunEnd(victory: boolean): void {
    const text = victory ? '胜利' : '失败';
    if (this.runEndLabel) this.runEndLabel.string = `对局结束 — ${text}`;
    console.log(`[BattleHUDView] 对局结束 victory=${victory}`);
  }
}
