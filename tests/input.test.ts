import { describe, expect, it } from "vitest";
import { InputBuffer } from "../src/input/InputController";

describe("InputBuffer", () => {
  it("maps movement keys and normalizes diagonal movement", () => {
    const input = new InputBuffer();
    input.setKey("KeyW", true);
    input.setKey("KeyD", true);

    const frame = input.consumeFrame();

    expect(frame.move.x).toBeCloseTo(Math.SQRT1_2);
    expect(frame.move.y).toBeCloseTo(-Math.SQRT1_2);
    expect(frame.mode).toBe("keyboard");
  });

  it("opens the status input with I without triggering an interaction or ability", () => {
    const input = new InputBuffer();
    input.setKey("KeyI", true);
    const first = input.consumeFrame();
    expect([...first.pressed]).toEqual(["status"]);
    expect(first.move).toEqual({ x: 0, y: 0 });
    input.setKey("KeyI", true, true);
    expect(input.consumeFrame().pressed.size).toBe(0);
  });

  it("reports edge-triggered actions only once while a key is held", () => {
    const input = new InputBuffer();
    input.setKey("KeyL", true);
    expect(input.consumeFrame().pressed.has("ultimate")).toBe(true);

    input.setKey("KeyL", true, true);
    const heldFrame = input.consumeFrame();
    expect(heldFrame.held.has("ultimate")).toBe(true);
    expect(heldFrame.pressed.has("ultimate")).toBe(false);

    input.setKey("KeyL", false);
    input.setKey("KeyL", true);
    expect(input.consumeFrame().pressed.has("ultimate")).toBe(true);
  });
});
