import guardianArt from "../../assets/concepts/epilogue/eloria-epilogue-guardian-after-battle-v1.png?url";
import meruArt from "../../assets/concepts/epilogue/eloria-epilogue-meru-speaks-to-stone-v1.png?url";
import entrustedArt from "../../assets/concepts/epilogue/eloria-epilogue-seal-stone-entrusted-v1.png?url";
import type { GameWorld } from "../game/GameWorld";
import { CHAPTER_SCENES, ChapterSequence, type CinematicScene } from "./chapterSequence";
import { PresentationInput } from "./PresentationInput";
import "./chapter.css";

export interface CinematicOptions {
  scenes: readonly CinematicScene[];
  artwork: readonly string[];
  label: string;
  lastAction: string;
  active: () => boolean;
  ready: () => boolean;
  complete: () => void;
  calm?: boolean;
}

export class ChapterCinematicController {
  private readonly sequence: ChapterSequence;
  private readonly motion = matchMedia("(prefers-reduced-motion: reduce)");
  private readonly input: PresentationInput;
  private readonly images: HTMLImageElement[];
  private started = false;
  private scene = -1;
  private readonly next: HTMLButtonElement;
  private readonly previous: HTMLButtonElement;
  private readonly text: HTMLElement;
  private readonly size: HTMLElement;
  private readonly speaker: HTMLElement;
  private readonly live: HTMLElement;
  public constructor(private readonly root: HTMLElement, private readonly world: GameWorld,
    private readonly game: HTMLElement, private readonly release: () => void, private readonly focus: HTMLElement,
    private readonly options?: CinematicOptions) {
    this.sequence = new ChapterSequence(options?.scenes ?? CHAPTER_SCENES);
    root.innerHTML = `<div class="prologue-artwork" aria-hidden="true"></div><div class="chapter-light" aria-hidden="true"></div>
      <span class="prologue-scene-label"></span><button class="chapter-back opening-small" type="button">前の場面</button>
      <button class="chapter-skip opening-small" type="button">スキップ</button>
      <div class="prologue-caption"><strong class="chapter-speaker"></strong><div class="prologue-copy" aria-hidden="true"><p class="prologue-size"></p><p class="prologue-text"></p></div>
      <p class="chapter-live sr-only" aria-live="polite" aria-atomic="true"></p><button class="prologue-advance" type="button">全文を表示</button><small>タップ / E / Enter / Space</small></div><div class="opening-fade" aria-hidden="true"></div>`;
    this.next = root.querySelector(".prologue-advance")!; this.previous = root.querySelector(".chapter-back")!;
    this.text = root.querySelector(".prologue-text")!; this.size = root.querySelector(".prologue-size")!;
    this.live = root.querySelector(".chapter-live")!; this.speaker = root.querySelector(".chapter-speaker")!;
    this.images = (options?.artwork ?? [guardianArt, meruArt, entrustedArt]).map((src, index) => {
      const img = new Image(); img.alt = ""; img.className = "prologue-art"; img.src = src;
      img.dataset.scene = (options?.scenes ?? CHAPTER_SCENES)[index]!.id; img.addEventListener("error", () => { img.hidden = true; });
      root.querySelector(".prologue-artwork")!.append(img); return img;
    });
    this.input = new PresentationInput(root, () => this.blocking, this.advance, this.skip);
    this.next.addEventListener("click", this.advance); this.previous.addEventListener("click", this.back);
    root.querySelector(".chapter-skip")!.addEventListener("click", this.skip); root.addEventListener("click", this.onArtwork);
  }
  public get blocking(): boolean { return this.options?.active() ?? this.world.sealCinematicPending; }
  public update(delta: number): void {
    if (!this.blocking) {
      if (!this.root.hidden) { this.root.hidden = true; this.game.inert = false; this.game.removeAttribute("aria-hidden"); this.input.end(); this.release(); }
      return;
    }
    if (!this.started) {
      this.started = true; this.input.begin(); this.release();
      this.root.hidden = false; this.game.inert = true; this.game.setAttribute("aria-hidden", "true");
    }
    if (this.options && !this.options.ready()) { this.root.dataset.phase = "transfer"; return; }
    if (this.sequence.phase === "idle") { this.sequence.begin(this.motion.matches); this.next.focus(); }
    this.root.classList.toggle("is-suspended", document.hidden);
    if (!document.hidden && this.sequence.update(delta, this.motion.matches)) {
      this.root.hidden = true; this.input.end(); this.release();
      this.game.inert = false; this.game.removeAttribute("aria-hidden"); if (this.options) this.options.complete(); else this.world.completeSealCinematic();
      this.focus.focus();
      return;
    }
    this.render();
  }
  private render(): void {
    const s = this.sequence;
    this.root.dataset.phase = s.phase; this.root.dataset.scene = s.scene.id; this.root.dataset.fullyVisible = String(s.fullyVisible);
    this.root.classList.toggle("is-calm", this.options?.calm || s.sceneIndex === 2);
    if (this.scene !== s.sceneIndex) {
      this.scene = s.sceneIndex;
      this.images.forEach((img, i) => img.classList.toggle("is-current", i === this.scene));
      this.root.querySelector(".prologue-scene-label")!.textContent = `${this.options?.label ?? "森の封印石"}　${this.scene + 1} / ${s.sceneCount}`;
      this.size.textContent = s.fullText; this.speaker.textContent = s.scene.speaker; this.speaker.hidden = !s.scene.speaker;
      this.live.textContent = `${s.scene.speaker ? s.scene.speaker + "。" : ""}${s.scene.narration.join(" ")}`;
    }
    if (this.text.textContent !== s.text) this.text.textContent = s.text;
    this.next.textContent = !s.fullyVisible ? "全文を表示" : s.sceneIndex === s.sceneCount - 1 ? this.options?.lastAction ?? "封印石を受け取る" : "次へ";
    this.previous.disabled = s.sceneIndex === 0 || s.phase !== "story"; this.next.disabled = s.phase !== "story";
    this.root.querySelector<HTMLButtonElement>(".chapter-skip")!.disabled = s.phase !== "story";
  }
  private readonly advance = (event?: Event): void => {
    if (!this.blocking || this.sequence.phase !== "story" || (event instanceof MouseEvent && event.detail >= 2)) return;
    this.sequence.advance(performance.now(), this.motion.matches); this.render();
  };
  private readonly back = (): void => { if (this.sequence.phase !== "story") return; this.sequence.back(performance.now(), this.motion.matches); this.render(); };
  private readonly skip = (): void => { if (this.sequence.phase !== "story") return; this.sequence.skip(); this.render(); };
  private readonly onArtwork = (event: MouseEvent): void => { if (!(event.target as Element).closest("button")) this.advance(event); };
  public destroy(): void {
    this.input.destroy(); this.root.hidden = true; this.game.inert = false; this.game.removeAttribute("aria-hidden");
    this.next.removeEventListener("click", this.advance); this.previous.removeEventListener("click", this.back);
    this.root.querySelector(".chapter-skip")!.removeEventListener("click", this.skip); this.root.removeEventListener("click", this.onArtwork);
  }
}
