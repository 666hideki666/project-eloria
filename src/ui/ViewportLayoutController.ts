export interface VisibleViewport {
  width: number;
  height: number;
  left: number;
  top: number;
}

/** Display pixels only. The renderer and camera retain their 640×360 coordinates. */
export function fitGameViewport(view: VisibleViewport) {
  const width = Math.min(view.width, view.height * 16 / 9);
  const height = width * 9 / 16;
  return { ...view, fieldWidth: width, fieldHeight: height,
    fieldLeft: (view.width - width) / 2, fieldTop: (view.height - height) / 2 };
}

export class ViewportLayoutController {
  private readonly viewport = window.visualViewport;
  private frame = 0;
  public constructor(private readonly root: HTMLElement) {
    window.addEventListener("resize", this.schedule);
    window.addEventListener("orientationchange", this.schedule);
    document.addEventListener("fullscreenchange", this.schedule);
    this.viewport?.addEventListener("resize", this.schedule);
    this.viewport?.addEventListener("scroll", this.schedule);
    this.update();
  }
  private readonly schedule = (): void => {
    if (!this.frame) this.frame = requestAnimationFrame(this.update);
  };
  private readonly update = (): void => {
    this.frame = 0;
    // Do not counteract an intentional accessibility pinch zoom outside controls.
    if (this.viewport && Math.abs(this.viewport.scale - 1) > .01) return;
    const layout = fitGameViewport({
      width: this.viewport?.width ?? window.innerWidth,
      height: this.viewport?.height ?? window.innerHeight,
      left: this.viewport?.offsetLeft ?? 0,
      top: this.viewport?.offsetTop ?? 0,
    });
    if (layout.width <= 0 || layout.height <= 0) return;
    for (const [key, value] of Object.entries(layout)) {
      this.root.style.setProperty(`--view-${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`, `${value}px`);
    }
  };
  public destroy(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    window.removeEventListener("resize", this.schedule);
    window.removeEventListener("orientationchange", this.schedule);
    document.removeEventListener("fullscreenchange", this.schedule);
    this.viewport?.removeEventListener("resize", this.schedule);
    this.viewport?.removeEventListener("scroll", this.schedule);
  }
}
