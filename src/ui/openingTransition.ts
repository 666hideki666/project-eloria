export const OPENING_TRANSITION = {
  titleDarken: 1,
  musicFade: 1.5,
  sceneReveal: 0.8,
} as const;

const smooth = (value: number): number => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};

/** Visible-time clock: the controller does not tick it while the document is hidden. */
export class OpeningTransition {
  private started = false;
  private age = 0;
  private reduced = false;
  private frozenOpacity = 0;

  public get complete(): boolean {
    const duration = OPENING_TRANSITION.musicFade + (this.reduced ? 0 : OPENING_TRANSITION.sceneReveal);
    return this.started && this.age >= duration;
  }
  public get active(): boolean { return this.started && !this.complete; }
  public get sceneVisible(): boolean { return this.started && this.age >= OPENING_TRANSITION.musicFade; }
  public get musicBlendReady(): boolean { return this.started && this.age >= OPENING_TRANSITION.titleDarken; }
  public get phase(): "idle" | "title-out" | "black" | "prologue-in" | "done" {
    if (!this.started) return "idle";
    if (this.complete) return "done";
    if (this.sceneVisible) return "prologue-in";
    return !this.reduced && this.age >= OPENING_TRANSITION.titleDarken ? "black" : "title-out";
  }
  public get opacity(): number {
    if (!this.active) return 0;
    if (this.reduced) return this.frozenOpacity;
    if (this.age < OPENING_TRANSITION.titleDarken) return smooth(this.age / OPENING_TRANSITION.titleDarken);
    if (!this.sceneVisible) return 1;
    return 1 - smooth((this.age - OPENING_TRANSITION.musicFade) / OPENING_TRANSITION.sceneReveal);
  }

  public start(reducedMotion: boolean): boolean {
    if (this.started) return false;
    this.started = true;
    this.reduced = reducedMotion;
    return true;
  }

  public update(delta: number, reducedMotion: boolean): void {
    if (!this.active) return;
    if (reducedMotion && !this.reduced) {
      // Stop visual motion at the current shade without shortening the music fade.
      this.frozenOpacity = this.opacity;
      this.reduced = true;
    }
    this.age += Math.max(0, delta);
  }

  public reset(): void {
    this.started = false;
    this.age = 0;
    this.reduced = false;
    this.frozenOpacity = 0;
  }
}
