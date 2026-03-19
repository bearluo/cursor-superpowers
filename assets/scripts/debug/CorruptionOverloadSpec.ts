import { _decorator, Component } from 'cc';
import { CorruptionSystem } from '../systems/run/CorruptionSystem';
import { OverloadSystem } from '../systems/run/OverloadSystem';

const { ccclass } = _decorator;

@ccclass('CorruptionOverloadSpec')
export class CorruptionOverloadSpec extends Component {
  start(): void {
    const c = new CorruptionSystem([33, 66, 100]);
    const o = new OverloadSystem();
    c.add(10, 'time');
    o.startOverload();
    c.add(20, 'overload');
    const ok = c.value === 30 && o.isOverloading;
    console.log(ok ? '[CorruptionOverloadSpec] PASS' : '[CorruptionOverloadSpec] FAIL', c.value, o.isOverloading);
  }
}

