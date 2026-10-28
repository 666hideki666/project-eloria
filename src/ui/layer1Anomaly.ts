export const LAYER1_ANOMALY_PAGES = [
  { speaker: "苔根の遺構", text: "洞窟の奥で、青い光が不規則に脈打った。魔物たちは苦しむように暴れ、三人の姿に気づくと、我を失ったように襲いかかってきた。" },
  { speaker: "ナディ", text: "森の魔物まで、こんなふうに……。" },
  { speaker: "メル", text: "この光、晶石が苦しんでいるみたい。" },
  { speaker: "カイル", text: "奥を確かめよう。" },
] as const;
const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
const characters = LAYER1_ANOMALY_PAGES.map(p => Array.from(segmenter.segment(p.text), x => x.segment));

export class Layer1AnomalySequence {
  public phase: "idle" | "waiting-title" | "pulse" | "story" | "done" = "idle";
  public pageIndex = 0;
  public age = 0;
  private visible = 0;
  private lastInput = -Infinity;
  public get page() { return LAYER1_ANOMALY_PAGES[this.pageIndex]!; }
  public get text(): string { return characters[this.pageIndex]!.slice(0, this.visible).join(""); }
  public get fullyVisible(): boolean { return this.visible >= characters[this.pageIndex]!.length; }
  public begin(): void { if (this.phase === "idle") this.phase = "waiting-title"; }
  public update(delta: number, titleVisible: boolean, reduced: boolean): void {
    if (this.phase === "waiting-title") {
      if (titleVisible) return;
      this.phase = reduced ? "story" : "pulse";
      this.age = 0;
    } else if (this.phase === "pulse") {
      this.age += Math.max(0, delta);
      if (this.age >= .4 || reduced) { this.phase = "story"; this.age = 0; }
    } else if (this.phase === "story") {
      this.age += Math.max(0, delta);
      this.visible = Math.max(this.visible, Math.min(characters[this.pageIndex]!.length, Math.floor(this.age * 32)));
    }
    if (this.phase === "story" && reduced) this.visible = characters[this.pageIndex]!.length;
  }
  public advance(now: number, reduced: boolean): boolean {
    if (this.phase !== "story" || now - this.lastInput < 220) return false;
    this.lastInput = now;
    if (!this.fullyVisible) this.visible = characters[this.pageIndex]!.length;
    else if (this.pageIndex + 1 === LAYER1_ANOMALY_PAGES.length) this.phase = "done";
    else {
      this.pageIndex++; this.age = 0;
      this.visible = reduced ? characters[this.pageIndex]!.length : 0;
    }
    return true;
  }
  public skip(): void {
    if (this.phase === "waiting-title" || this.phase === "pulse" || this.phase === "story") this.phase = "done";
  }
}
