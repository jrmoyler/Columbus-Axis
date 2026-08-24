/** Procedural Axis audio. Unlock on the first gesture. */

type Bus = { ctx: AudioContext; master: GainNode; music: GainNode; sfx: GainNode };

let bus: Bus | null = null;
let muted = false;
let droneNodes: { osc: OscillatorNode; gain: GainNode }[] = [];

function now() {
  return bus?.ctx.currentTime ?? 0;
}

export function unlockAudio() {
  if (!bus) {
    const ctx = new AudioContext({ latencyHint: "interactive" });
    const master = ctx.createGain();
    const music = ctx.createGain();
    const sfx = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    music.gain.value = 0.22;
    sfx.gain.value = 0.7;
    music.connect(master);
    sfx.connect(master);
    master.connect(ctx.destination);
    bus = { ctx, master, music, sfx };
  }
  if (bus.ctx.state === "suspended") void bus.ctx.resume();
  startDrone();
}

export function setMuted(next: boolean) {
  muted = next;
  if (!bus) return;
  bus.master.gain.setTargetAtTime(next ? 0 : 0.85, now(), 0.04);
}

export function resumeAudio() {
  if (bus?.ctx.state === "suspended") void bus.ctx.resume();
}

function envGain(duration: number, peak: number, attack = 0.01, release?: number) {
  if (!bus) return null;
  const g = bus.ctx.createGain();
  g.gain.setValueAtTime(0.0001, now());
  g.gain.exponentialRampToValueAtTime(peak, now() + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now() + (release ?? duration));
  g.connect(bus.sfx);
  return g;
}

function tone(freq: number, type: OscillatorType, duration: number, peak: number, detune = 0) {
  if (!bus) return;
  const o = bus.ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  const g = envGain(duration, peak);
  if (!g) return;
  o.connect(g);
  o.start();
  o.stop(now() + duration + 0.05);
}

function noise(duration: number, peak: number, hp = 400, lp = 2400) {
  if (!bus) return;
  const n = bus.ctx.createBuffer(1, Math.floor(bus.ctx.sampleRate * duration), bus.ctx.sampleRate);
  const d = n.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = bus.ctx.createBufferSource();
  src.buffer = n;
  const high = bus.ctx.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = hp;
  const low = bus.ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = lp;
  const g = envGain(duration, peak, 0.005, duration);
  if (!g) return;
  src.connect(high);
  high.connect(low);
  low.connect(g);
  src.start();
}

function startDrone() {
  if (!bus || droneNodes.length) return;
  const specs: [number, OscillatorType, number][] = [
    [55, "sine", 0.05],
    [82.5, "triangle", 0.03],
    [110, "sine", 0.02],
  ];
  for (const [f, type, vol] of specs) {
    const o = bus.ctx.createOscillator();
    const g = bus.ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.value = vol;
    o.connect(g);
    g.connect(bus.music);
    o.start();
    droneNodes.push({ osc: o, gain: g });
  }
  const n = bus.ctx.createBuffer(1, bus.ctx.sampleRate * 2, bus.ctx.sampleRate);
  const d = n.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
  const src = bus.ctx.createBufferSource();
  src.buffer = n;
  src.loop = true;
  const bp = bus.ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 280;
  bp.Q.value = 0.6;
  const g = bus.ctx.createGain();
  g.gain.value = 0.035;
  src.connect(bp);
  bp.connect(g);
  g.connect(bus.music);
  src.start();
}

export function sfxSelect() {
  const r = 1 + (Math.random() * 2 - 1) * 0.06;
  tone(880 * r, "triangle", 0.08, 0.07);
  tone(1320 * r, "sine", 0.05, 0.03);
}

export function sfxPlace() {
  noise(0.22, 0.18, 80, 900);
  tone(90, "sine", 0.28, 0.16);
  tone(180, "triangle", 0.18, 0.06);
  tone(740, "sine", 0.12, 0.04);
}

export function sfxCoin() {
  const r = 1 + (Math.random() * 2 - 1) * 0.08;
  tone(980 * r, "square", 0.07, 0.05);
  tone(1480 * r, "sine", 0.14, 0.07);
}

export function sfxTick() {
  tone(620 + Math.random() * 80, "square", 0.04, 0.03);
}

export function sfxDraw() {
  noise(0.12, 0.08, 1200, 5000);
  tone(420, "triangle", 0.1, 0.05);
}

export function sfxEvent() {
  tone(196, "sawtooth", 0.4, 0.08);
  tone(247, "triangle", 0.45, 0.06);
  tone(311, "sine", 0.5, 0.05);
}

export function sfxWin() {
  [261, 329, 392, 523].forEach((f, i) => {
    setTimeout(() => tone(f, "triangle", 0.35, 0.08), i * 90);
  });
}

export function sfxLose() {
  tone(196, "sawtooth", 0.5, 0.07);
  tone(147, "sine", 0.7, 0.08);
}

export function sfxError() {
  tone(140, "square", 0.12, 0.05);
}

export function sfxTakeover() {
  noise(0.3, 0.2, 60, 700);
  tone(70, "sine", 0.4, 0.18);
  tone(440, "triangle", 0.2, 0.06);
}
