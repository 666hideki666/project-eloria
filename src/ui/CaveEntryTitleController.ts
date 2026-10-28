import { CAVE_ENTRY_NARRATION, CaveEntryTitleSequence } from "./caveEntryTitle";
import { PresentationInput } from "./PresentationInput";

export class CaveEntryTitleController {
  private readonly sequence = new CaveEntryTitleSequence();
  private readonly input: PresentationInput;
  private readonly next: HTMLButtonElement;
  private readonly hint: HTMLElement;
  public constructor(private readonly root: HTMLElement, private readonly title: HTMLElement,
    private readonly release: () => void, private readonly closeTitle: () => void,
    private readonly skipAnomaly: () => void, private readonly focus: HTMLElement) {
    root.innerHTML = `<section class="cave-entry-caption"><p role="status" aria-live="polite" aria-atomic="true"></p>
      <button type="button" disabled>次へ</button><small></small></section>`;
    this.next = root.querySelector("button")!; this.hint = root.querySelector("small")!;
    root.tabIndex = -1;
    this.input = new PresentationInput(root, () => this.blocking, this.advance, this.skip);
    this.next.addEventListener("click", this.advance); root.addEventListener("click", this.onArtwork);
    document.addEventListener("visibilitychange", this.visibility);
  }
  public get blocking(): boolean { return this.sequence.phase === "reading"; }
  public begin(): void {
    if (this.sequence.phase !== "idle") return;
    this.sequence.begin(); this.input.begin(); this.release();
    this.root.hidden = false; this.title.classList.add("is-cave-story");
    this.root.querySelector("p")!.textContent = CAVE_ENTRY_NARRATION;
    this.render(); this.visibility(); this.root.focus();
  }
  public update(delta: number): void {
    if (!this.blocking || document.hidden) return;
    if (this.sequence.update(delta)) this.finish();
    else this.render();
  }
  private render(): void {
    const becameReady = this.next.disabled && this.sequence.ready;
    this.next.disabled = !this.sequence.ready;
    this.root.dataset.ready = String(this.sequence.ready);
    this.hint.textContent = this.sequence.ready ? "E / Enter / Space・タップで次へ（自動でも進みます）" : "このままでも自動で進みます";
    if (becameReady) this.next.focus();
  }
  private finish(): void {
    this.root.hidden = true; this.input.end(); this.release(); this.closeTitle();
    this.title.classList.remove("is-cave-story", "is-suspended"); this.focus.focus();
  }
  private readonly advance = (event?: Event): void => {
    if (document.hidden || (event instanceof MouseEvent && event.detail >= 2)) return;
    if (this.sequence.advance()) this.finish();
  };
  private readonly skip = (): void => {
    if (document.hidden || !this.blocking) return;
    this.sequence.skip(); this.finish(); this.skipAnomaly();
  };
  private readonly onArtwork = (event: MouseEvent): void => {
    if (!(event.target as Element).closest("button")) this.advance(event);
  };
  private readonly visibility = (): void => { this.title.classList.toggle("is-suspended", document.hidden && this.blocking); };
  public destroy(): void {
    this.input.destroy(); this.next.removeEventListener("click", this.advance); this.root.removeEventListener("click", this.onArtwork);
    document.removeEventListener("visibilitychange", this.visibility); this.root.hidden = true;
    this.title.classList.remove("is-cave-story", "is-suspended");
  }
}
