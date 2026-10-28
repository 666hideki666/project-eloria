import kyle from "../../assets/ui/portraits/kyle/kyle-hud-portrait-64px-v1.png?url";
import nadi from "../../assets/ui/portraits/nadi/nadi-hud-portrait-64px-v1.png?url";
import meru from "../../assets/ui/portraits/mel/mel-hud-portrait-64px-v1.png?url";
import type { GameWorld } from "../game/GameWorld";
import { CaveGuideSequence, guideGaugeDemo } from "./caveGuide";
import { PresentationInput } from "./PresentationInput";

export class CaveGuideController {
  private sequence: CaveGuideSequence | null = null;
  private readonly motion = matchMedia("(prefers-reduced-motion: reduce)");
  private readonly input: PresentationInput;
  private readonly next: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly heading: HTMLElement;
  private readonly controls: HTMLElement;
  private readonly detail: HTMLElement;
  private readonly faces: HTMLElement;
  private readonly gauge: HTMLElement;
  private readonly gaugeFill: HTMLElement;
  private readonly demoLabel: HTMLElement;
  private readonly live: HTMLElement;
  private announcement = "";
  private initial = false;
  private origin: "initial" | "pause" | "status" = "initial";
  private readonly reopen: HTMLElement;
  public constructor(private readonly root: HTMLElement, private readonly world: GameWorld,
    private readonly release: () => void, private readonly fieldFocus: HTMLElement, private readonly help: HTMLButtonElement,
    private readonly game: HTMLElement, private readonly statusHelp: HTMLButtonElement, private readonly statusOpen: () => boolean) {
    root.innerHTML = `<section class="cave-guide-panel"><header><small>操作ガイド</small><button class="cave-guide-skip" type="button">閉じる / スキップ</button></header>
      <h2></h2><div class="cave-guide-faces"><figure><img src="${kyle}" alt=""><figcaption>カイル</figcaption></figure><figure><img src="${nadi}" alt=""><figcaption>ナディ</figcaption></figure><figure><img src="${meru}" alt=""><figcaption>メル</figcaption></figure></div>
      <p class="cave-guide-controls"></p><p class="cave-guide-detail"></p>
      <div class="cave-guide-gauge" aria-hidden="true"><span></span><i></i><i></i></div><p class="cave-guide-demo" aria-hidden="true"></p>
      <p class="cave-guide-reopen">操作方法は、いつでも左上のキャラ名を選び、状態画面の「操作方法」から見られます。</p>
      <p class="cave-guide-live" aria-live="polite" aria-atomic="true"></p><footer><small>ポーズの「操作を見る」からも見直せます。</small><button class="cave-guide-next" type="button">次へ</button></footer></section>`;
    this.next = root.querySelector(".cave-guide-next")!; this.panel = root.querySelector(".cave-guide-panel")!;
    this.heading = root.querySelector("h2")!;
    this.controls = root.querySelector(".cave-guide-controls")!; this.detail = root.querySelector(".cave-guide-detail")!;
    this.faces = root.querySelector(".cave-guide-faces")!; this.gauge = root.querySelector(".cave-guide-gauge")!;
    this.gaugeFill = this.gauge.querySelector("span")!; this.demoLabel = root.querySelector(".cave-guide-demo")!;
    this.live = root.querySelector(".cave-guide-live")!;
    this.reopen = root.querySelector(".cave-guide-reopen")!;
    this.input = new PresentationInput(root, () => this.blocking || this.world.caveGuidePending, this.advance, this.skip);
    this.next.addEventListener("click", this.advance); root.querySelector(".cave-guide-skip")!.addEventListener("click", this.skip);
    help.addEventListener("click", this.openManual);
    statusHelp.addEventListener("click", this.openFromStatus);
  }
  public get blocking(): boolean { return this.sequence !== null; }
  private begin(origin: "initial" | "pause" | "status"): void {
    this.origin = origin;
    const initial = origin === "initial";
    this.initial = initial; this.sequence = new CaveGuideSequence(); this.announcement = "";
    this.input.begin(); this.release(); this.root.hidden = false;
    this.root.dataset.source = origin; this.game.inert = true; this.game.setAttribute("aria-hidden", "true"); this.render();
    if (!initial) this.next.focus();
  }
  private readonly openManual = (event: MouseEvent): void => {
    if (!this.blocking && this.world.phase === "paused" && !this.world.presentationLocked) {
      if (event instanceof PointerEvent && ["touch", "pen"].includes(event.pointerType)) document.body.dataset.input = "touch";
      this.begin("pause");
    }
  };
  private readonly openFromStatus = (event: MouseEvent): void => {
    if (!this.blocking && this.statusOpen() && this.world.phase === "playing" && !this.world.inputLocked) {
      if (event instanceof PointerEvent && ["touch", "pen"].includes(event.pointerType)) document.body.dataset.input = "touch";
      this.begin("status");
    }
  };
  public update(delta: number): void {
    if (this.sequence && ((this.initial && !this.world.caveGuidePending) ||
        (this.origin === "pause" && this.world.phase !== "paused") ||
        (this.origin === "status" && (!this.statusOpen() || this.world.phase !== "playing")))) { this.finish(); return; }
    if (!this.blocking && this.world.caveGuidePending) this.begin("initial");
    if (!this.sequence) return;
    if (!document.hidden) this.sequence.update(delta);
    this.render();
  }
  private render(): void {
    const s = this.sequence;
    if (!s) return;
    this.root.dataset.phase = s.phase; this.root.dataset.card = String(s.card);
    this.root.dataset.mode = document.body.dataset.input === "touch" ? "touch" : "keyboard";
    this.root.classList.toggle("is-suspended", document.hidden);
    if (s.phase === "done") { this.finish(); return; }
    this.panel.hidden = false;
    const touch = this.root.dataset.mode === "touch";
    this.heading.textContent = s.card === 0 ? "３人を切り替える" : "技と３段のゲージ";
    this.reopen.hidden = s.card !== 1;
    this.faces.hidden = s.card !== 0; this.gauge.hidden = s.card !== 1; this.demoLabel.hidden = s.card !== 1;
    const controls = s.card === 0 ? touch ? "画面の「交代」ボタン" : "Space：キャラクター交代"
      : touch ? "J 通常攻撃　K 特殊技　L 大技\n画面右下の各ボタンをタップ" : "J：通常攻撃　K：特殊技　L：大技";
    const detail = s.card === 0 ? "交代ボタンで、カイル・ナディ・メルを順番に操作できます。"
      : "技ゲージは５秒で１段たまります。特殊技は１段、大技は３段を使います。";
    if (this.controls.textContent !== controls) this.controls.textContent = controls;
    if (this.detail.textContent !== detail) this.detail.textContent = detail;
    if (s.card === 1) {
      const demo = guideGaugeDemo(s.age, this.motion.matches);
      this.gaugeFill.style.width = `${demo.charge / 3 * 100}%`;
      const label = this.motion.matches ? "特殊技：１段消費　／　大技：３段消費" :
        demo.spending ? `${demo.cost === 1 ? "特殊技" : "大技"}で${demo.cost}段消費` : `５秒で１段　―　${demo.cost === 1 ? "特殊技" : "大技"}の例`;
      if (this.demoLabel.textContent !== label) this.demoLabel.textContent = label;
    }
    this.next.textContent = s.card === 0 ? "次へ" : this.initial ? "洞窟へ進む" : "閉じる";
    const announcement = `${s.card}:${touch}`;
    if (this.announcement !== announcement) {
      this.announcement = announcement; this.live.textContent = `${this.heading.textContent}。${controls}。${detail}${s.card === 1 ? this.reopen.textContent : ""}`;
      this.next.focus();
      this.next.scrollIntoView({ block: "nearest" });
    }
  }
  private finish(): void {
    if (!this.sequence) return;
    this.sequence = null; this.root.hidden = true; this.input.end(); this.release();
    this.game.inert = false; this.game.removeAttribute("aria-hidden");
    if (this.initial) { this.world.caveGuidePending = false; this.fieldFocus.focus(); }
    else requestAnimationFrame(() => (this.origin === "status" ? this.statusHelp : this.help).focus());
  }
  private readonly advance = (event?: Event): void => {
    if (!this.sequence || (event instanceof MouseEvent && event.detail >= 2)) return;
    if (event instanceof PointerEvent && event.pointerType !== "mouse" && event.pointerType) document.body.dataset.input = "touch";
    this.sequence.advance(performance.now()); this.render();
  };
  private readonly skip = (): void => { this.sequence?.skip(); this.render(); };
  public destroy(): void {
    this.input.destroy(); this.next.removeEventListener("click", this.advance);
    this.root.querySelector(".cave-guide-skip")!.removeEventListener("click", this.skip); this.help.removeEventListener("click", this.openManual); this.statusHelp.removeEventListener("click", this.openFromStatus);
    this.root.hidden = true; this.game.inert = false; this.game.removeAttribute("aria-hidden");
  }
}
