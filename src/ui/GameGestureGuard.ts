/** Suppress browser gestures across the live playfield, including letterboxing.
 * Reading states remove the ancestor restriction so panels can scroll/pinch.
 * This never dispatches an action or changes a control's hit area.
 */
export class GameGestureGuard {
  private playing = false;
  private readonly events = ["touchend", "dblclick", "contextmenu", "gesturestart", "gesturechange", "gestureend"] as const;

  public constructor(private readonly root: HTMLElement) {
    this.update(false);
    for (const type of this.events) root.addEventListener(type, this.preventGesture, { capture: true, passive: false });
  }

  public update(playing: boolean): void {
    this.playing = playing;
    const state = playing ? "playing" : "reading";
    if (this.root.dataset.gameGestures !== state) this.root.dataset.gameGestures = state;
  }

  private readonly preventGesture = (event: Event): void => {
    if (!this.playing || !event.cancelable) return;
    const target = event.target;
    const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
    if (element?.closest(".field-dialogue, .status-panel, .screen-overlay")) return;
    // Native UI needs its synthetic click after touchend (pause and party HUD).
    // Game controls use pointer events and keep their existing local guards.
    const control = element?.closest(".touch-action, .stick-zone, #game");
    if (!control && element?.closest('button, a, input, select, textarea, [role="button"], [contenteditable]:not([contenteditable="false"])')) return;
    event.preventDefault();
  };

  public destroy(): void {
    for (const type of this.events) this.root.removeEventListener(type, this.preventGesture, true);
    this.playing = false;
    delete this.root.dataset.gameGestures;
  }
}
