// Procedural Web Audio synthesizer for car exploration and UI feedback
// Zero external sound files; respects user mute preferences and browser autoplay policies.

class SoundManager {
  private ctx: AudioContext | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private enabled: boolean = false;

  constructor() {
    this.enabled = localStorage.getItem('snc_sound') === 'true';
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    localStorage.setItem('snc_sound', this.enabled ? 'true' : 'false');
    if (!this.enabled && this.engineGain) {
      this.engineGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
    return this.enabled;
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.setupEngine();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private setupEngine() {
    if (!this.ctx) return;
    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

      this.engineOsc2.type = 'sine';
      this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);

      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.engineOsc.connect(filter);
      this.engineOsc2.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start();
      this.engineOsc2.start();
    } catch {
      // AudioContext unavailable
    }
  }

  public updateCar(speedRatio: number, isAccelerating: boolean) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.engineGain || !this.engineOsc || !this.engineOsc2) return;

    const t = this.ctx.currentTime;
    const absSpeed = Math.abs(speedRatio);

    if (absSpeed > 0.02 || isAccelerating) {
      const targetGain = Math.min(0.06, 0.015 + absSpeed * 0.045);
      this.engineGain.gain.setTargetAtTime(targetGain, t, 0.08);

      const freq1 = 45 + absSpeed * 80;
      const freq2 = 90 + absSpeed * 160;
      this.engineOsc.frequency.setTargetAtTime(freq1, t, 0.08);
      this.engineOsc2.frequency.setTargetAtTime(freq2, t, 0.08);
    } else {
      this.engineGain.gain.setTargetAtTime(0, t, 0.15);
    }
  }

  public playBrake() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch {}
  }

  public playChime() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + idx * 0.06;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.05, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.36);
      });
    } catch {}
  }
}

export const sound = new SoundManager();
