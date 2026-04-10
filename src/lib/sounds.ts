/**
 * Lightweight UI sound effects using Web Audio API.
 * No external files needed – all sounds are synthesized.
 */

/** Check if sounds are muted via accessibility settings */
function isMuted(): boolean {
  try {
    const saved = localStorage.getItem("a11y-settings");
    if (saved) {
      const settings = JSON.parse(saved);
      return settings.muteSounds === true;
    }
  } catch {}
  return false;
}

let audioCtx: AudioContext | null = null;

async function getCtx(): Promise<AudioContext> {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (autoplay policy)
  if (audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    } catch (e) {
      console.warn("[Sounds] AudioContext resume failed:", e);
    }
  }
  return audioCtx;
}

/** Soft chime – played when a new message arrives */
export function playMessageTone() {
  if (isMuted()) return;
  void (async () => {
    try {
      const ctx = await getCtx();
      const now = ctx.currentTime;

      const notes = [523.25, 659.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.08, now + i * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.4);
      });
    } catch {
      // Silently fail – sounds are non-critical
    }
  })();
}

/** Short click – played when voice recording starts */
export function playVoiceStartClick() {
  if (isMuted()) return;
  void (async () => {
    try {
      const ctx = await getCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Silently fail
    }
  })();
}

/** Soft descending tone – played when voice recording stops */
export function playVoiceStopClick() {
  if (isMuted()) return;
  void (async () => {
    try {
      const ctx = await getCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Silently fail
    }
  })();
}

/* ── Ringtone (repeating melodic phone ring) ── */

let ringtoneInterval: ReturnType<typeof setInterval> | null = null;
let ringtoneOscillators: OscillatorNode[] = [];
let ringtoneGains: GainNode[] = [];

async function playRingMelody() {
  if (isMuted()) return;
  try {
    const ctx = await getCtx();
    const now = ctx.currentTime;

    // Melodic ring pattern: ascending two-note pattern, repeated twice
    // Similar to iPhone/modern phone ringtone feel
    const pattern: [number, number, number][] = [
      // [frequency, startOffset, duration]
      [587.33, 0, 0.15],     // D5
      [880, 0.16, 0.15],     // A5
      [587.33, 0.4, 0.15],   // D5
      [880, 0.56, 0.15],     // A5
    ];

    for (const [freq, offset, dur] of pattern) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.18, now + offset + 0.02);
      gain.gain.setValueAtTime(0.18, now + offset + dur - 0.03);
      gain.gain.linearRampToValueAtTime(0, now + offset + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + dur + 0.01);
      ringtoneOscillators.push(osc);
      ringtoneGains.push(gain);
    }
  } catch (e) {
    console.warn("[Sounds] Ring melody failed:", e);
  }
}

/** Start a repeating ringtone (ring ~0.7s, pause ~1.5s) */
export function startRingtone() {
  stopRingtone();
  console.log("[Sounds] Starting ringtone");
  void playRingMelody();
  ringtoneInterval = setInterval(() => void playRingMelody(), 2200);
}

/** Stop the ringtone */
export function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  ringtoneOscillators.forEach((osc) => {
    try { osc.stop(); } catch {}
  });
  ringtoneOscillators = [];
  ringtoneGains = [];
}

/** Short whoosh – played when sending a message */
export function playSendTone() {
  if (isMuted()) return;
  void (async () => {
    try {
      const ctx = await getCtx();
      const now = ctx.currentTime;

      // Quick ascending sweep ("whoosh")
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Silently fail
    }
  })();
}

/** Very subtle pop – played when speech playback starts */
export function playStartListenPop() {
  if (isMuted()) return;
  void (async () => {
    try {
      const ctx = await getCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Silently fail
    }
  })();
}
