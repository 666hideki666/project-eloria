import type { GameWorld } from "../game/GameWorld";
import type { WorldSnapshot } from "../game/types";
import { MOSS_ROOT_RUINS } from "../stage/maps/mossRootRuinsMap";
import { Layer1AnomalySequence } from "./layer1Anomaly";

export class Layer1AnomalyController {
  private readonly sequence = new Layer1AnomalySequence();
  private readonly motion = matchMedia("(prefers-reduced-motion: reduce)");
  private readonly down = new Set<string>();
  private readonly releaseRequired = new Set<string>();
  private active = false;
  private touchPending = false;
  private announced = -1;
  private firstPageGuardUntil = 0;
  private guardingFirstPage = true;
  private readonly speaker: HTMLElement;
  private readonly text: HTMLElement;
  private readonly live: HTMLElement;
  private readonly next: HTMLButtonElement;
  private readonly skip: HTMLButtonElement;
  private readonly caption: HTMLElement;

  public constructor(private readonly root: HTMLElement, private readonly world: GameWorld,
    private readonly releaseInput: () => void, private readonly focusTarget: HTMLElement,
    private readonly entryTitleActive: () => boolean = () => false) {
    root.innerHTML = `<button class="anomaly-skip" type="button">スキップ <span aria-hidden="true">Esc</span></button>
      <section class="anomaly-caption"><strong class="anomaly-speaker"></strong>
        <div class="anomaly-copy" aria-hidden="true"><p class="anomaly-size"></p><p class="anomaly-text"></p></div>
        <p class="anomaly-live" aria-live="polite" aria-atomic="true"></p>
        <button class="anomaly-next" type="button">全文を表示</button><small>タップ / E / Enter / Space</small></section>`;
    this.speaker = root.querySelector(".anomaly-speaker")!;
    this.text = root.querySelector(".anomaly-text")!;
    this.live = root.querySelector(".anomaly-live")!;
    this.next = root.querySelector(".anomaly-next")!;
    this.skip = root.querySelector(".anomaly-skip")!;
    this.caption = root.querySelector(".anomaly-caption")!;
    this.next.addEventListener("click", this.onAdvance);
    this.caption.addEventListener("click", this.onCaptionClick);
    this.skip.addEventListener("click", this.onSkip);
    window.addEventListener("keydown", this.onKeyDown, true);
    window.addEventListener("keyup", this.onKeyUp, true);
    window.addEventListener("pointerdown", this.onPointerDown, true);
    window.addEventListener("blur", this.onBlur);
  }

  public update(delta: number, titleVisible: boolean): void {
    if (this.world.caveGuidePending) return;
    if (!this.world.layer1AnomalyPending) { this.root.hidden = true; return; }
    if (!this.active) {
      this.active = true;
      this.sequence.begin();
      for (const code of this.down) this.releaseRequired.add(code);
      this.releaseInput();
      return; // Let the existing room title start on this frame first.
    }
    if (document.hidden) return;
    this.sequence.update(delta, titleVisible, this.motion.matches);
    this.render();
  }

  public presentation(snapshot: WorldSnapshot): WorldSnapshot {
    if (!this.world.layer1AnomalyPending || this.motion.matches ||
        (this.sequence.phase !== "pulse" && !(this.sequence.phase === "story" && this.sequence.pageIndex === 0))) return snapshot;
    // A presentation-only cut shows the authored crystal and its existing monsters.
    return { ...snapshot, camera: { ...snapshot.camera,
      x: Math.round(Math.max(0, Math.min(snapshot.worldWidth - 640, MOSS_ROOT_RUINS.crystal.x - 320))),
      y: Math.round(Math.max(0, Math.min(snapshot.worldHeight - 360, MOSS_ROOT_RUINS.crystal.y - 160))),
    } };
  }

  public get visual(): { age: number } | undefined {
    return this.world.layer1AnomalyPending && this.sequence.phase === "pulse" && !this.motion.matches
      ? { age: this.sequence.age } : undefined;
  }

  private render(): void {
    const s = this.sequence;
    this.root.dataset.phase = s.phase;
    this.root.dataset.page = String(s.pageIndex);
    this.root.hidden = s.phase === "waiting-title" || s.phase === "idle" || s.phase === "done";
    this.caption.hidden = s.phase !== "story";
    if (s.phase === "done") { this.finish(); return; }
    if (s.phase === "pulse") {
      if (!this.root.contains(document.activeElement)) this.skip.focus();
      return;
    }
    if (s.phase !== "story") return;
    if (this.announced !== s.pageIndex) {
      this.announced = s.pageIndex;
      if (s.pageIndex === 0) this.firstPageGuardUntil = performance.now() + 220;
      this.speaker.textContent = s.page.speaker;
      this.root.querySelector(".anomaly-size")!.textContent = s.page.text;
      this.live.textContent = `${s.page.speaker}。${s.page.text}`;
      this.next.focus();
    }
    if (this.text.textContent !== s.text) this.text.textContent = s.text;
    const label = !s.fullyVisible ? "全文を表示" : s.pageIndex === 3 ? "探索へ" : "次へ";
    if (this.next.textContent !== label) this.next.textContent = label;
  }

  private finish(): void {
    this.world.layer1AnomalyPending = false;
    this.root.hidden = true;
    this.releaseInput();
    this.focusTarget.focus();
  }
  private readonly onAdvance = (event?: Event): void => {
    if (!this.world.layer1AnomalyPending) return;
    if (this.sequence.phase !== "story") return;
    const now = performance.now();
    // A tap burst continuing from the title must settle before it can send page 1.
    if (this.guardingFirstPage && now < this.firstPageGuardUntil) { this.firstPageGuardUntil = now + 220; return; }
    if (event instanceof MouseEvent && event.detail >= 2) return;
    this.guardingFirstPage = false;
    this.sequence.advance(now, this.motion.matches);
    this.render();
    this.syncTouchMode();
  };
  private readonly onSkip = (): void => {
    if (!this.world.layer1AnomalyPending) return;
    this.sequence.skip(); this.render(); this.syncTouchMode();
  };
  public skipPresentation(): void { this.onSkip(); }
  private readonly onCaptionClick = (event: MouseEvent): void => {
    if (!(event.target as Element).closest("button")) this.onAdvance(event);
  };
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.down.add(event.code);
    if (this.world.caveGuidePending || this.entryTitleActive()) return;
    if (event.code === "KeyM") return;
    if (!this.world.layer1AnomalyPending) {
      if (this.releaseRequired.has(event.code)) { event.preventDefault(); event.stopImmediatePropagation(); }
      return;
    }
    this.releaseRequired.add(event.code);
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.repeat) return;
    if (event.code === "Tab") {
      if (!this.root.hidden) (document.activeElement === this.next ? this.skip : this.caption.hidden ? this.skip : this.next).focus();
    } else if (event.code === "Escape") this.onSkip();
    else if (["Enter", "Space", "KeyE"].includes(event.code)) {
      if (document.activeElement === this.skip && event.code !== "KeyE") this.onSkip();
      else this.onAdvance();
    }
  };
  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.down.delete(event.code);
    if (this.world.caveGuidePending || this.entryTitleActive()) return;
    const held = this.releaseRequired.delete(event.code);
    if (event.code !== "KeyM" && (held || this.world.layer1AnomalyPending)) event.preventDefault();
  };
  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.world.caveGuidePending || this.entryTitleActive()) return;
    if (this.world.layer1AnomalyPending && this.root.contains(event.target as Node) && event.pointerType !== "mouse") {
      this.touchPending = true;
    }
    if (this.world.layer1AnomalyPending && !this.root.contains(event.target as Node)) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  };
  private syncTouchMode(): void {
    // Changing the existing touch layout on pointerdown can move a letterboxed
    // tablet's button before pointerup. Apply the mode after its click instead.
    if (this.touchPending) { document.body.dataset.input = "touch"; this.touchPending = false; }
  }
  private readonly onBlur = (): void => { this.down.clear(); this.releaseRequired.clear(); };
  public destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown, true);
    window.removeEventListener("keyup", this.onKeyUp, true);
    window.removeEventListener("pointerdown", this.onPointerDown, true);
    window.removeEventListener("blur", this.onBlur);
    this.next.removeEventListener("click", this.onAdvance);
    this.caption.removeEventListener("click", this.onCaptionClick);
    this.skip.removeEventListener("click", this.onSkip);
    this.root.hidden = true;
  }
}
