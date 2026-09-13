// Ironvale — tiny WebAudio sound effects (no assets).
let ctx = null;
let muted = false;

export function initAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    } catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function blip(freq, dur, type = 'square', vol = 0.04, slide = 0, delay = 0) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch (e) { /* ignore */ }
}

export const sfx = {
  chop:  () => blip(160, 0.08, 'square', 0.05, -60),
  mine:  () => blip(90, 0.07, 'square', 0.05, 40),
  hit:   () => blip(120, 0.12, 'sawtooth', 0.06, -70),
  swing: () => blip(300, 0.06, 'triangle', 0.03, 220),
  coin:  () => { blip(880, 0.07, 'sine', 0.05); blip(1320, 0.1, 'sine', 0.05, 0, 0.06); },
  eat:   () => blip(220, 0.1, 'triangle', 0.05, 60),
  ui:    () => blip(500, 0.04, 'square', 0.025),
  levelup: () => { [440, 554, 659, 880].forEach((f, i) => blip(f, 0.12, 'square', 0.04, 0, i * 0.09)); },
  death: () => blip(200, 0.5, 'sawtooth', 0.06, -160),
  quest: () => { [523, 659, 784].forEach((f, i) => blip(f, 0.14, 'triangle', 0.05, 0, i * 0.1)); }
};
