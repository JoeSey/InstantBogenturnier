// Confirms a score tap was registered by the app — added after trainers on iPad/iPhone
// reported mistyped scores from not noticing a tap hadn't registered. True haptic
// feedback (Vibration API) isn't available at all on iOS/iPadOS Safari or in an
// installed PWA there (Apple doesn't expose it to web content), so audio + a screen
// flash are the only cross-platform confirmation channels available here.
let audioCtx: AudioContext | undefined;

export function playConfirmTone(): void {
  try {
    const AudioCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    audioCtx ??= new AudioCtor();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') void ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  } catch {
    // Web Audio unsupported/blocked — the screen flash still confirms visually.
  }
}
