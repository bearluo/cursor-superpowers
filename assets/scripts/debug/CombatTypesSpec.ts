import { _decorator, Component } from 'cc';
import { ProtocolId } from '../systems/combat/CombatTypes';

const { ccclass } = _decorator;

@ccclass('CombatTypesSpec')
export class CombatTypesSpec extends Component {
  start(): void {
    const p: ProtocolId = 'Ignite';
    console.log('[CombatTypesSpec] PASS', p);
  }
}

