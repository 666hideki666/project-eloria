export const CAVE_ENTRY_NARRATION = "三人は顔を見合わせ、暗い洞窟へ踏み出した。";

/** Read time is unchanged by reduced motion; the clock advances only while visible. */
export class CaveEntryTitleSequence {
  public phase: "idle" | "reading" | "done" = "idle";
  public age = 0;
  public get ready(): boolean { return this.phase === "reading" && this.age >= .8; }
  public begin(): void { if (this.phase === "idle") this.phase = "reading"; }
  public update(delta: number): boolean {
    if (this.phase !== "reading") return false;
    this.age += Math.max(0, delta);
    if (this.age < 3.5) return false;
    this.phase = "done";
    return true;
  }
  public advance(): boolean {
    if (!this.ready) return false;
    this.phase = "done";
    return true;
  }
  public skip(): void { this.phase = "done"; }
}
