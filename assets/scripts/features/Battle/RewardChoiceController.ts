import { _decorator, Component } from 'cc';
import { EventBus } from '../../core/EventBus';
import { EVENTS } from '../../core/Constants';
import type { InputRewardChosenPayload } from '../../systems/input/InputTypes';
import { ArenaBattleController } from './ArenaBattleController';

const { ccclass, property } = _decorator;

@ccclass('RewardChoiceController')
export class RewardChoiceController extends Component {
  @property(ArenaBattleController)
  arena: ArenaBattleController | null = null;

  private offered: Array<{ id: string; label: string }> = [];
  private inChoice = false;
  private readonly off: Array<() => void> = [];

  onEnable(): void {
    this.off.push(
      EventBus.on(EVENTS.RunRewardOffered, (p: { options: Array<{ id: string; label: string }> }) => {
        this.offered = p.options;
        this.inChoice = true;
        console.log(`[RewardChoice] options: 1=${p.options[0]?.label} 2=${p.options[1]?.label} 3=${p.options[2]?.label}`);
      }),
      EventBus.on(EVENTS.InputRewardChosen, (p: InputRewardChosenPayload) => {
        if (!this.inChoice) return;
        const chosen = this.offered[p.index];
        if (!chosen) return;
        this.arena?.applyRewardOption(chosen.id);
        this.arena?.director.onRewardChosen(chosen.id);
        this.inChoice = false;
        console.log(`[RewardChoice] chosen ${chosen.id}`);
      }),
    );
  }

  onDisable(): void {
    for (const off of this.off) off();
    this.off.length = 0;
  }
}
