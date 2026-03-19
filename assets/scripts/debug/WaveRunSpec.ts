import { _decorator, Component } from 'cc';
import { RunDirector } from '../systems/run/RunDirector';

const { ccclass } = _decorator;

@ccclass('WaveRunSpec')
export class WaveRunSpec extends Component {
  start(): void {
    const r = new RunDirector();
    r.startRun();
    const ok = r.currentZone === 1 && r.currentWave === 1;
    console.log(ok ? '[WaveRunSpec] PASS' : '[WaveRunSpec] FAIL', r.currentZone, r.currentWave);
  }
}
