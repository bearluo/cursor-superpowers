import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

@ccclass('ViewBase')
export class ViewBase extends Component {
  onShow(_data?: unknown): void {
    // override in subclasses
  }

  onHide(): void {
    // override in subclasses
  }
}

