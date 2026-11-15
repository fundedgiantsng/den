/**
 * Web Audio API Notification Chime Synthesizer
 * Synthesizes an elegant, soft dual-tone chime (E5 -> G5) without relying on external MP3 assets.
 */
export function playNotificationChime() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.15, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.45);

    // Tone 2: B5 (987.77 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.08);

    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.2, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.65);
  } catch (err) {
    console.warn('Web Audio playback failed or permission denied:', err);
  }
}
