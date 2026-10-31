import { describe, expect, it } from "vitest";
import { InputController } from "../src/input/InputController";
import { fitGameViewport } from "../src/ui/ViewportLayoutController";

class TouchElement extends EventTarget {
  public dataset: Record<string, string> = {};
  public classes = new Set<string>();
  public classList = { add: (s: string) => this.classes.add(s), remove: (s: string) => this.classes.delete(s) };
  public style = { setProperty: (_key: string, _value: string) => {} };
  public setPointerCapture(_id: number): void {}
  public getBoundingClientRect() { return { left: 0, top: 0 }; }
}
function pointer(element: TouchElement, type: string, id: number, x = 0, y = 0) {
  const event = Object.assign(new Event(type, { cancelable: true }), { pointerId: id, pointerType: "touch", clientX: x, clientY: y });
  element.dispatchEvent(event);
  return event;
}
function controls() {
  const target = new EventTarget();
  const input = new InputController(target as Window, () => {});
  const zone = new TouchElement(), stick = new TouchElement(), button = new TouchElement();
  button.dataset.touchAction = "attack";
  input.bindTouch({ zone: zone as unknown as HTMLElement, stick: stick as unknown as HTMLElement,
    actionButtons: [button] as unknown as NodeListOf<HTMLButtonElement> });
  return { input, target, zone, stick, button };
}

describe("mobile gesture input", () => {
  it("holds an action until every captured finger ends or is cancelled", () => {
    const { input, button } = controls();
    pointer(button, "pointerdown", 1); pointer(button, "pointerdown", 2);
    expect(input.consumeFrame().pressed.has("attack")).toBe(true);
    pointer(button, "pointerup", 1);
    expect(input.consumeFrame().held.has("attack")).toBe(true);
    pointer(button, "pointercancel", 2);
    expect(input.consumeFrame().held.has("attack")).toBe(false);
    expect(button.classes.has("is-pressed")).toBe(false);
    input.destroy();
  });
  it("keeps the first joystick finger and releases on lost capture", () => {
    const { input, zone, stick } = controls();
    pointer(zone, "pointerdown", 1, 10, 10);
    pointer(zone, "pointermove", 1, 36, 10);
    expect(input.consumeFrame().move).toEqual({ x: 1, y: 0 });
    pointer(zone, "pointerdown", 2, 100, 100);
    pointer(zone, "pointerup", 2);
    expect(input.consumeFrame().move).toEqual({ x: 1, y: 0 });
    pointer(zone, "lostpointercapture", 1);
    expect(input.consumeFrame().move).toEqual({ x: 0, y: 0 });
    expect(stick.classes.has("is-active")).toBe(false);
    input.destroy();
  });
  it("cancels legacy zoom defaults only on controls and removes guards on destroy", () => {
    const { input, zone, button } = controls();
    for (const element of [zone, button]) for (const type of ["touchend", "dblclick", "contextmenu"]) {
      const event = new Event(type, { cancelable: true }); element.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
    const text = new TouchElement(), pinch = new Event("touchend", { cancelable: true });
    text.dispatchEvent(pinch); expect(pinch.defaultPrevented).toBe(false);
    input.destroy();
    const after = new Event("touchend", { cancelable: true }); button.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
    pointer(button, "pointerdown", 1);
    expect(input.consumeFrame().held.size).toBe(0);
  });
  it("clears joystick and button state when the window loses focus", () => {
    const { input, target, zone, button, stick } = controls();
    pointer(zone, "pointerdown", 1); pointer(zone, "pointermove", 1, 0, -26);
    pointer(button, "pointerdown", 2); target.dispatchEvent(new Event("blur"));
    const frame = input.consumeFrame();
    expect(frame.move).toEqual({ x: 0, y: 0 }); expect(frame.held.size).toBe(0); expect(frame.pressed.size).toBe(0);
    expect(stick.classes.size).toBe(0); expect(button.classes.size).toBe(0);
    input.destroy();
  });
});

describe("visible game viewport", () => {
  it.each([[844, 390, 0, 0], [1024, 768, 0, 0], [390, 844, 0, 0], [820, 340, 12, 32]])(
    "fits a full 16:9 field inside %s×%s at offset %s,%s with equal margins", (width, height, left, top) => {
      const result = fitGameViewport({ width, height, left, top });
      expect(result.left).toBe(left); expect(result.top).toBe(top);
      expect(result.fieldWidth / result.fieldHeight).toBeCloseTo(16 / 9);
      expect(result.fieldLeft).toBeCloseTo(width - result.fieldLeft - result.fieldWidth);
      expect(result.fieldTop).toBeCloseTo(height - result.fieldTop - result.fieldHeight);
      expect(result.fieldLeft).toBeGreaterThanOrEqual(0); expect(result.fieldTop).toBeGreaterThanOrEqual(0);
      expect(result.fieldWidth <= width && result.fieldHeight <= height).toBe(true);
    },
  );
});
