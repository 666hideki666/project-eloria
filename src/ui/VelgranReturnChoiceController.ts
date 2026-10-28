import type { GameWorld } from "../game/GameWorld";
import { PresentationInput } from "./PresentationInput";

export class VelgranReturnChoiceController {
  private readonly input: PresentationInput;
  private readonly entrance: HTMLButtonElement;
  private readonly stay: HTMLButtonElement;
  private readonly hint: HTMLElement;
  private active = false;
  private openedAt = 0;
  public constructor(private readonly root: HTMLElement, private readonly world: GameWorld,
    private readonly game: HTMLElement, private readonly release: () => void, private readonly fieldFocus: HTMLElement) {
    root.innerHTML = `<section class="velgran-return-card"><h2 id="velgran-return-heading">洞窟の入り口へ戻りますか？</h2>
      <div class="velgran-return-buttons"><button type="button" data-return="entrance">洞窟の入り口に戻る</button>
      <button type="button" data-return="stay">このままここにいる</button></div><small></small></section>`;
    this.entrance = root.querySelector('[data-return="entrance"]')!;
    this.stay = root.querySelector('[data-return="stay"]')!; this.hint = root.querySelector("small")!;
    // Navigation runs before the modal input guard, which still records held arrows.
    window.addEventListener("keydown", this.navigate, true);
    this.input = new PresentationInput(root, () => this.blocking, this.advance, () => this.choose(false));
    this.entrance.addEventListener("click", this.onEntrance); this.stay.addEventListener("click", this.onStay);
  }
  public get blocking(): boolean { return this.world.velgranReturnChoicePending || this.world.revisitReturnActive; }
  public update(): void {
    if (!this.blocking) {
      if (this.active) this.finish();
      return;
    }
    if (!this.active) {
      this.active = true; this.openedAt = performance.now(); this.input.begin(); this.release();
      this.game.inert = true; this.game.setAttribute("aria-hidden", "true");
      this.root.hidden = false; this.stay.focus();
    }
    this.root.hidden = !this.world.velgranReturnChoicePending;
    this.hint.textContent = document.body.dataset.input === "touch" ? "ボタンをタップして選択" : "Tab / ← → で選択・E / Enter / Space で決定";
  }
  private finish(): void {
    this.active = false; this.root.hidden = true; this.input.end(); this.release();
    this.game.inert = false; this.game.removeAttribute("aria-hidden"); this.fieldFocus.focus();
  }
  private choose(entrance: boolean, event?: Event): void {
    if (document.hidden || performance.now() - this.openedAt < 220 ||
        (event instanceof MouseEvent && event.detail >= 2)) return;
    if (["touch", "pen"].includes((event as PointerEvent | undefined)?.pointerType ?? "")) document.body.dataset.input = "touch";
    if (!this.world.chooseVelgranReturn(entrance)) return;
    this.release(); this.update();
  }
  private readonly onEntrance = (event: Event): void => this.choose(true, event);
  private readonly onStay = (event: Event): void => this.choose(false, event);
  private readonly advance = (): void => this.choose(document.activeElement === this.entrance);
  private readonly navigate = (event: KeyboardEvent): void => {
    if (!this.world.velgranReturnChoicePending || document.hidden || event.repeat ||
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.code)) return;
    (document.activeElement === this.entrance ? this.stay : this.entrance).focus();
  };
  public destroy(): void {
    this.input.destroy(); window.removeEventListener("keydown", this.navigate, true);
    this.entrance.removeEventListener("click", this.onEntrance); this.stay.removeEventListener("click", this.onStay);
    if (this.active) this.finish();
  }
}
