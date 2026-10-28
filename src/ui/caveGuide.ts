export class CaveGuideSequence {
  public phase: "cards" | "done" = "cards";
  public card = 0;
  public age = 0;
  private lastInput = -Infinity;
  public update(delta: number): void {
    this.age += Math.max(0, delta);
  }
  public advance(now: number): void {
    if (this.phase === "done" || now - this.lastInput < 220) return;
    this.lastInput = now;
    if (this.card === 0) this.card = 1;
    else this.phase = "done";
    this.age = 0;
  }
  public skip(): void { this.phase = "done"; }
}

/** A five-second final segment, then a 1- or 3-segment spend; not a gameplay gauge. */
export function guideGaugeDemo(age: number, reduced: boolean) {
  if (reduced) return { charge: 3, cost: 3, spending: false };
  const t = age % 14, cost = t < 7 ? 1 : 3, step = t % 7;
  return { charge: step >= 5.7 ? 0 : cost - 1 + Math.min(1, step / 5), cost, spending: step >= 5.7 };
}
