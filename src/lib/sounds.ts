/**
 * Synthesized celebration fanfare via Web Audio. No asset file, offline-safe.
 * Browsers require a user gesture to start audio — the checkbox tap that
 * triggers the celebration qualifies.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  ac: AudioContext,
  dest: AudioNode,
  freq: number,
  start: number,
  duration: number,
  peak: number
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** Short bright major-arrow fanfare, roughly a second and a half. */
export function playCelebration() {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime + 0.02;
  // Root chord: C5, E5, G5 as a soft pad, arpeggio over the top.
  const root: [number, number, number, number] = [523.25, 659.25, 783.99, 1046.5];
  const master = ac.createGain();
  master.gain.value = 0.5;
  master.connect(ac.destination);
  [0, 1, 2].forEach((i) => tone(ac, master, root[i], now + i * 0.09, 1.5, 0.12));
  [0, 1, 2, 3].forEach((i) => tone(ac, master, root[i] * 2, now + 0.12 + i * 0.13, 0.09, 0.06));
}