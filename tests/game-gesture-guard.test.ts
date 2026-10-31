import { afterEach, describe, expect, it, vi } from "vitest";
import { GameGestureGuard } from "../src/ui/GameGestureGuard";

class Surface extends EventTarget {
  public dataset: Record<string, string> = {};
  public constructor(private readonly ancestors: string[] = []) { super(); }
  public closest(selector: string) {
    return selector.split(", ").some(s => this.ancestors.includes(s)) ? this : null;
  }
}
function setup() {
  vi.stubGlobal("Element", Surface);
  const root = new Surface();
  const guard = new GameGestureGuard(root as unknown as HTMLElement);
  const gesture = (type: string, target: Surface = root) => {
    const event = new Event(type, { cancelable: true });
    Object.defineProperty(event, "target", { value: target });
    root.dispatchEvent(event);
    return event.defaultPrevented;
  };
  return { root, guard, gesture };
}
afterEach(() => vi.unstubAllGlobals());
describe("playfield browser gestures", () => {
  it("guards background and game controls only during active play", () => {
    const { root, guard, gesture } = setup();
    expect(gesture("touchend")).toBe(false);
    guard.update(true);
    expect(root.dataset.gameGestures).toBe("playing");
    for (const target of [root, new Surface(["#game"]), new Surface([".touch-action", "button"]), new Surface([".stick-zone"])]) {
      for (const type of ["touchend", "dblclick", "contextmenu", "gesturestart", "gesturechange", "gestureend"]) expect(gesture(type, target)).toBe(true);
    }
    guard.update(false);
    expect(root.dataset.gameGestures).toBe("reading");
    expect(gesture("gesturechange")).toBe(false);
    guard.destroy();
  });
  it("preserves native UI clicks and reading panel gestures", () => {
    const { guard, gesture } = setup(); guard.update(true);
    for (const ancestor of ["button", '[role="button"]', "input", "a", ".field-dialogue", ".status-panel", ".screen-overlay"]) {
      expect(gesture("touchend", new Surface([ancestor]))).toBe(false);
      expect(gesture("dblclick", new Surface([ancestor]))).toBe(false);
    }
    guard.destroy();
  });
  it("does not consume propagation or inject control actions", () => {
    const { root, guard, gesture } = setup(); guard.update(true);
    const action = vi.fn(); root.addEventListener("pointerdown", action);
    const observed = vi.fn(); root.addEventListener("touchend", observed);
    expect(gesture("touchend")).toBe(true);
    expect(observed).toHaveBeenCalledOnce(); expect(action).not.toHaveBeenCalled();
    guard.destroy();
  });
  it("removes listeners and the CSS state on destruction", () => {
    const { root, guard, gesture } = setup(); guard.update(true); guard.destroy();
    expect(root.dataset.gameGestures).toBeUndefined();
    expect(gesture("touchend")).toBe(false); expect(gesture("gesturestart")).toBe(false);
  });
});
