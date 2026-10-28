export const PROLOGUE_SCENES = [
  {
    id: "anomaly", label: "村の異変",
    narration: [
      "それは、村の井戸に灯った青い光から始まった。",
      "輝きは古い根を伝い、静かな朝へ少しずつ広がっていく。",
    ],
  },
  {
    id: "village-roots-nadi", label: "根が村道へ",
    narration: [
      "森へ続く道にまで異変が現れ、人々は足を止めた。",
      "ナディは村人を守り、その源を確かめると決めた。",
    ],
  },
  {
    id: "conversation", label: "井戸のほとりで",
    narration: [
      "井戸のほとりに集まったのは、思いの異なる三人だった。",
      "ナディは村を、カイルは封印石を、メルは晶石の声を追っていた。",
    ],
  },
  {
    id: "map-shard-clue", label: "地図と晶片",
    narration: [
      "古い地図の印と、小さな晶片の光が示す先は同じ。",
      "それは、古の森の奥にある洞窟だった。",
    ],
  },
  {
    id: "village-farewell", label: "村を託す",
    narration: [
      "ナディは心配する村人に、少し森の様子を見てくると伝えた。",
      "カイルとメルも、それぞれ気になる手がかりを確かめるつもりだった。",
    ],
  },
  {
    id: "departure", label: "古の森へ",
    narration: [
      "村の喧騒が遠ざかるほど、森は深い静けさに包まれた。",
      "三人は青い光を追い、木々の奥へ足を踏み入れた。",
    ],
  },
] as const;

const CHARACTERS_PER_SECOND = 28;
const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
const SCENE_CHARACTERS = PROLOGUE_SCENES.map(scene =>
  Array.from(segmenter.segment(scene.narration.join("\n")), part => part.segment));

export type OpeningPhase = "title" | "prologue" | "leaving" | "done";

/** Presentation state only: the world stays in intro until the single handoff. */
export class OpeningSequence {
  public phase: OpeningPhase = "title";
  public sceneIndex = 0;
  private age = 0;
  private visibleCount = 0;
  private lastAdvanceAt = -Infinity;

  public get scene() { return PROLOGUE_SCENES[this.sceneIndex]!; }
  public get fullText(): string { return this.scene.narration.join("\n"); }
  public get fullyVisible(): boolean { return this.visibleCount >= SCENE_CHARACTERS[this.sceneIndex]!.length; }
  public get text(): string { return SCENE_CHARACTERS[this.sceneIndex]!.slice(0, this.visibleCount).join(""); }

  public start(reducedMotion = false): boolean {
    if (this.phase !== "title") return false;
    this.phase = "prologue";
    this.age = 0;
    this.visibleCount = reducedMotion ? SCENE_CHARACTERS[this.sceneIndex]!.length : 0;
    return true;
  }

  public advance(now: number, reducedMotion = false): boolean {
    if (this.phase !== "prologue" || now - this.lastAdvanceAt < 180) return false;
    this.lastAdvanceAt = now;
    if (!this.fullyVisible) {
      this.visibleCount = SCENE_CHARACTERS[this.sceneIndex]!.length;
      return true;
    }
    if (this.sceneIndex + 1 >= PROLOGUE_SCENES.length) return this.skip();
    this.sceneIndex += 1;
    this.age = 0;
    this.visibleCount = reducedMotion ? SCENE_CHARACTERS[this.sceneIndex]!.length : 0;
    return true;
  }

  public skip(): boolean {
    if (this.phase !== "prologue") return false;
    this.phase = "leaving";
    this.age = 0;
    return true;
  }

  /** Returns true exactly once, when the fade has completed. */
  public update(delta: number, reducedMotion: boolean): boolean {
    if (this.phase === "prologue") {
      this.age += Math.max(0, delta);
      const length = SCENE_CHARACTERS[this.sceneIndex]!.length;
      this.visibleCount = reducedMotion ? length : Math.min(length,
        Math.max(this.visibleCount, Math.floor(this.age * CHARACTERS_PER_SECOND)));
      return false;
    }
    if (this.phase !== "leaving") return false;
    this.age += Math.max(0, delta);
    if (this.phase === "leaving" && this.age >= (reducedMotion ? 0.08 : 0.4)) {
      this.phase = "done";
      return true;
    }
    return false;
  }

  public reset(): void {
    this.phase = "title";
    this.sceneIndex = 0;
    this.age = 0;
    this.visibleCount = 0;
    this.lastAdvanceAt = -Infinity;
  }
}

export function shouldShowOpening(mode: "stage" | "arena", developmentDirectStart: boolean): boolean {
  return mode === "stage" && !developmentDirectStart;
}
