import { _decorator, Component } from 'cc';
import { EventBus } from '../core/EventBus';
import { EVENTS } from '../core/Constants';
import { CorruptionSystem } from '../systems/run/CorruptionSystem';
import { MeltdownSystem } from '../systems/run/MeltdownSystem';

const { ccclass } = _decorator;

@ccclass('MeltdownSpec')
export class MeltdownSpec extends Component {
  start(): void {
    const c = new CorruptionSystem([33, 66, 100]);
    const m = new MeltdownSystem(c);
    let got = false;
    EventBus.on(EVENTS.MeltdownTriggered, () => { got = true; });
    c.add(40, 'time'); // 跨越第一个阈值 33
    console.log(got ? '[MeltdownSpec] PASS' : '[MeltdownSpec] FAIL');
    void m;
  }
}
