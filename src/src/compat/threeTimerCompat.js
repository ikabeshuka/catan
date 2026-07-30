export * from 'three-original';

import { Timer } from 'three-original';

/**
 * React Three Fiber 9 still instantiates THREE.Clock internally. Three r183+
 * warns as soon as that deprecated constructor runs, so expose the legacy
 * clock surface through Timer until Fiber adopts Timer natively.
 */
class TimerBackedClock {
  constructor(autoStart = true) {
    this.autoStart = autoStart;
    this.startTime = 0;
    this.oldTime = 0;
    this.elapsedTime = 0;
    this.running = false;
    this.timer = new Timer();
  }

  start() {
    this.timer.dispose();
    this.timer = new Timer();
    this.timer.update();
    this.startTime = performance.now();
    this.oldTime = this.startTime;
    this.elapsedTime = 0;
    this.running = true;
  }

  stop() {
    this.getElapsedTime();
    this.running = false;
    this.autoStart = false;
  }

  getElapsedTime() {
    this.getDelta();
    return this.elapsedTime;
  }

  getDelta() {
    if (this.autoStart && !this.running) {
      this.start();
      return 0;
    }
    if (!this.running) return 0;
    this.timer.update();
    const delta = this.timer.getDelta();
    this.oldTime = performance.now();
    this.elapsedTime += delta;
    return delta;
  }

  dispose() {
    this.timer.dispose();
  }
}

export { TimerBackedClock as Clock };
