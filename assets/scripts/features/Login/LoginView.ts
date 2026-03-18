import { _decorator, Button } from 'cc';
import { ViewBase } from '../../framework/ui/ViewBase';

const { ccclass } = _decorator;

@ccclass('LoginView')
export class LoginView extends ViewBase {
  onShow(_data?: unknown): void {
    // TODO: 绑定按钮、输入框、登录回调等
    let loginBtn = this.node.getChildByName('Btn_Login')
    if (loginBtn) {
      loginBtn.on(Button.EventType.CLICK, () => {
        console.log('登录');
      });
    }
  }
}

