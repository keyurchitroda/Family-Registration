/** Short pleasant success tone using Web Audio API (no asset file). */
export function playSuccessSound(): void {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.value = 0.08;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.12);
    o.onended = () => void ctx.close();
  } catch {
    /* ignore */
  }
}
