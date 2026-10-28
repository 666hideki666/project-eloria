/** Modal presentation input, including keys already held when a scene starts. */
export class PresentationInput {
  private readonly down = new Set<string>();
  private readonly releaseRequired = new Set<string>();
  public constructor(private readonly root: HTMLElement, private readonly active: () => boolean,
    private readonly advance: () => void, private readonly skip: () => void) {
    window.addEventListener("keydown", this.keyDown, true);
    window.addEventListener("keyup", this.keyUp, true);
    window.addEventListener("pointerdown", this.pointerDown, true);
    window.addEventListener("click", this.clickOutside, true);
    window.addEventListener("blur", this.blur);
  }
  public begin(): void { for (const key of this.down) this.releaseRequired.add(key); }
  public end(): void { for (const key of this.down) this.releaseRequired.add(key); }
  private readonly keyDown = (event: KeyboardEvent): void => {
    this.down.add(event.code);
    if (event.code === "KeyM") return;
    if (!this.active()) {
      if (this.releaseRequired.has(event.code)) { event.preventDefault(); event.stopImmediatePropagation(); }
      return;
    }
    document.body.dataset.input = "keyboard";
    this.releaseRequired.add(event.code);
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.repeat) return;
    if (event.code === "Tab") {
      const buttons = [...this.root.querySelectorAll<HTMLButtonElement>("button:not([disabled])")].filter(b => !b.hidden);
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
    } else if (event.code === "Escape") this.skip();
    else if (["Enter", "Space", "KeyE"].includes(event.code)) {
      const button = document.activeElement;
      if (event.code !== "KeyE" && button instanceof HTMLButtonElement && this.root.contains(button)) button.click();
      else this.advance();
    }
  };
  private readonly keyUp = (event: KeyboardEvent): void => {
    this.down.delete(event.code);
    const held = this.releaseRequired.delete(event.code);
    if (event.code !== "KeyM" && (held || this.active())) event.preventDefault();
  };
  private readonly pointerDown = (event: PointerEvent): void => {
    if (this.active() && !this.root.contains(event.target as Node)) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  private readonly clickOutside = (event: MouseEvent): void => {
    if (this.active() && !this.root.contains(event.target as Node)) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  private readonly blur = (): void => { this.down.clear(); this.releaseRequired.clear(); };
  public destroy(): void {
    window.removeEventListener("keydown", this.keyDown, true); window.removeEventListener("keyup", this.keyUp, true);
    window.removeEventListener("pointerdown", this.pointerDown, true); window.removeEventListener("click", this.clickOutside, true);
    window.removeEventListener("blur", this.blur);
  }
}
