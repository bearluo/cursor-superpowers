import { _decorator, Component } from 'cc';

const { ccclass } = _decorator;

@ccclass('ArenaBattleSmoke')
export class ArenaBattleSmoke extends Component {
  start(): void {
    console.log('[ArenaBattleSmoke] Attach ArenaBattleController on same node and press Play.');
  }
}
