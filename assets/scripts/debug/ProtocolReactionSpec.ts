import { _decorator, Component } from 'cc';
import { ProtocolSystem } from '../systems/combat/ProtocolSystem';

const { ccclass } = _decorator;

@ccclass('ProtocolReactionSpec')
export class ProtocolReactionSpec extends Component {
  start(): void {
    const s = new ProtocolSystem();
    s.apply('E1', 'Ignite', 60);
    s.apply('E1', 'Arc', 60);
    const reactions = s.consumeReactions('E1');
    const ok = reactions.indexOf('OverheatDischarge') !== -1;
    console.log(ok ? '[ProtocolReactionSpec] PASS' : '[ProtocolReactionSpec] FAIL', reactions);
  }
}

