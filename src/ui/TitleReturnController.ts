import type { GameWorld } from "../game/GameWorld";
import { PresentationInput } from "./PresentationInput";

/** A clean title document gives START fresh world/controller state and no QA query. */
export class TitleReturnController {
  private age = 0;
  private active = false;
  private completed = false;
  private readonly motion = matchMedia("(prefers-reduced-motion: reduce)");
  private readonly input: PresentationInput;
  public constructor(private readonly root: HTMLElement, private readonly world: GameWorld,
    private readonly release: () => void, private readonly returnToTitle = () => {
      window.location.replace(new URL(window.location.pathname, window.location.origin).href);
    }) {
    this.input = new PresentationInput(root, () => world.titleReturnPending, () => {}, () => {});
  }
  public update(delta: number): void {
    if (!this.world.titleReturnPending || this.completed) return;
    if (!this.active) { this.active = true; this.input.begin(); this.release(); this.root.hidden = false; }
    if (!document.hidden) this.age += Math.max(0, delta);
    const duration = this.motion.matches ? .1 : .4;
    this.root.style.opacity = String(Math.min(1, this.age / duration));
    if (this.age >= duration) { this.completed = true; this.returnToTitle(); }
  }
  public destroy(): void { this.input.destroy(); this.root.hidden = true; }
}
