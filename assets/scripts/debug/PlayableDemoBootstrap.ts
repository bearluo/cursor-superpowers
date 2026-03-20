import { _decorator, Component, Node, Prefab } from 'cc';
import { ArenaBattleController } from '../features/Battle/ArenaBattleController';
import { BattleHUDController } from '../features/Battle/BattleHUDController';
import { BattleHUDView } from '../features/Battle/BattleHUDView';
import { PlayerMotor } from '../features/Battle/PlayerMotor';
import { RewardChoiceController } from '../features/Battle/RewardChoiceController';
import { KeyboardInputController } from '../features/Input/KeyboardInputController';
import { VIEW_KEYS } from '../core/Constants';
import { VIEWS } from '../core/Constants';
import { UIManager } from '../framework/ui/UIManager';

const { ccclass, property } = _decorator;

@ccclass('PlayableDemoBootstrap')
export class PlayableDemoBootstrap extends Component {
  @property(Node)
  enemiesRoot: Node | null = null;

  @property(Prefab)
  enemyPrefab: Prefab | null = null;

  @property(Node)
  player: Node | null = null;

  async start(): Promise<void> {
    if (!this.enemiesRoot) return;
    if (!this.enemyPrefab) return;
    if (!this.player) return;

    const inputNode = new Node('Input');
    this.node.addChild(inputNode);
    inputNode.addComponent(KeyboardInputController);

    const playerMotor = this.player.addComponent(PlayerMotor);

    const battleNode = new Node('Battle');
    this.node.addChild(battleNode);
    const arena = battleNode.addComponent(ArenaBattleController);
    arena.player = this.player;
    arena.enemiesRoot = this.enemiesRoot;
    arena.enemyPrefab = this.enemyPrefab;

    playerMotor.minX = arena.arenaBounds.minX;
    playerMotor.maxX = arena.arenaBounds.maxX;
    playerMotor.minY = arena.arenaBounds.minY;
    playerMotor.maxY = arena.arenaBounds.maxY;

    const cfg = VIEWS[VIEW_KEYS.Battle];
    const hudView = await UIManager.open(VIEW_KEYS.Battle, {
      bundle: cfg.bundle,
      prefabPath: cfg.prefabPath,
      layer: 'SceneHUD',
    });
    const hudNode = new Node('HUD');
    this.node.addChild(hudNode);
    const hudCtrl = hudNode.addComponent(BattleHUDController);
    hudCtrl.view = hudView.getComponent(BattleHUDView);

    const rewardNode = new Node('RewardChoice');
    this.node.addChild(rewardNode);
    const reward = rewardNode.addComponent(RewardChoiceController);
    reward.arena = arena;

    arena.startRun();
    console.log('[PlayableDemoBootstrap] ready: WASD move, Space overload, 1/2/3 choose reward');
  }
}
