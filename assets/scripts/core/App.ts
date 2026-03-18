import { _decorator, Component, director } from 'cc';
import { EventBus } from './EventBus';
import { EVENTS, SCENES } from './Constants';

const { ccclass } = _decorator;

@ccclass('App')
export class App extends Component {
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    void this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    // 这里先做“最小启动链”，后续再逐步接入：日志、网络、配置、systems 等
    EventBus.emit(EVENTS.AppReady, { ts: Date.now() });

    // 首屏：Login
    await this.gotoScene(SCENES.Login);
  }

  private async gotoScene(name: string): Promise<void> {
    if (director.getScene()?.name === name) return;
    EventBus.emit(EVENTS.SceneChange, { to: name });
    await new Promise<void>((resolve, reject) => {
      director.loadScene(name, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
