export const CHAPTER_SCENES = [
  { id: "guardian-after-battle", label: "乱れる晶光", speaker: "", narration: ["戦いが終わっても、水晶の青い光はまだ揺れていた。", "守護者は三人を見つめ、静かに道を空けた。"] },
  { id: "meru-speaks-to-stone", label: "メルの声", speaker: "メル", narration: ["聞こえるよ。もう、苦しまなくていい。", "森の声を、もう一度聞かせて。"] },
  { id: "seal-stone-entrusted", label: "託された石", speaker: "", narration: ["光は穏やかな輝きに戻り、森晶獣はゆっくりと頭を下げた。", "三人は、託された森の封印石を受け取った。"] },
] as const;
export interface CinematicScene { id: string; label: string; speaker: string; narration: readonly string[]; }
const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });

export class ChapterSequence {
  private readonly characters: string[][];
  public constructor(private readonly scenes: readonly CinematicScene[] = CHAPTER_SCENES) {
    this.characters = scenes.map(s => Array.from(segmenter.segment(s.narration.join("\n")), x => x.segment));
  }
  public get sceneCount(): number { return this.scenes.length; }
  public phase: "idle" | "story" | "leaving" | "done" = "idle";
  public sceneIndex = 0;
  private age = 0;
  private visible = 0;
  private lastInput = -Infinity;
  public get scene() { return this.scenes[this.sceneIndex]!; }
  public get fullText(): string { return this.scene.narration.join("\n"); }
  public get text(): string { return this.characters[this.sceneIndex]!.slice(0, this.visible).join(""); }
  public get fullyVisible(): boolean { return this.visible >= this.characters[this.sceneIndex]!.length; }
  public begin(reduced: boolean): void {
    if (this.phase !== "idle") return;
    this.phase = "story"; this.visible = reduced ? this.characters[0]!.length : 0;
  }
  public advance(now: number, reduced: boolean): void {
    if (this.phase !== "story" || now - this.lastInput < 220) return;
    this.lastInput = now;
    if (!this.fullyVisible) this.visible = this.characters[this.sceneIndex]!.length;
    else if (this.sceneIndex === this.scenes.length - 1) this.skip();
    else { this.sceneIndex++; this.age = 0; this.visible = reduced ? this.characters[this.sceneIndex]!.length : 0; }
  }
  public back(now: number, reduced: boolean): void {
    if (this.phase !== "story" || this.sceneIndex === 0 || now - this.lastInput < 220) return;
    this.lastInput = now; this.sceneIndex--; this.age = 0;
    this.visible = reduced ? this.characters[this.sceneIndex]!.length : 0;
  }
  public skip(): void { if (this.phase === "story") { this.phase = "leaving"; this.age = 0; } }
  /** Emits one completion only after the final fade, including the skip path. */
  public update(delta: number, reduced: boolean): boolean {
    this.age += Math.max(0, delta);
    if (this.phase === "story") this.visible = reduced ? this.characters[this.sceneIndex]!.length :
      Math.max(this.visible, Math.min(this.characters[this.sceneIndex]!.length, Math.floor(this.age * 28)));
    if (this.phase === "leaving" && this.age >= (reduced ? .08 : .4)) { this.phase = "done"; return true; }
    return false;
  }
}
