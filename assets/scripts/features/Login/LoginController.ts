import { _decorator, Component } from 'cc';
import { UIManager } from '../../framework/ui/UIManager';
import { VIEW_KEYS, VIEWS } from '../../core/Constants';

const { ccclass } = _decorator;

@ccclass('LoginController')
export class LoginController extends Component {
  async start(): Promise<void> {
    const cfg = VIEWS[VIEW_KEYS.Login];
    await UIManager.open(VIEW_KEYS.Login, {
      bundle: cfg.bundle,
      prefabPath: cfg.prefabPath,
      layer: 'Page',
    });
  }
}

