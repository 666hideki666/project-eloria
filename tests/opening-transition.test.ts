import { describe, expect, it } from "vitest";
import { OpeningTransition } from "../src/ui/openingTransition";

describe("title to prologue transition", () => {
  it("darkens for a second, finishes music in black, then reveals the first scene before narration", () => {
    const t = new OpeningTransition();
    expect(t.phase).toBe("idle");
    expect(t.start(false)).toBe(true);
    t.update(.5, false);
    expect(t.opacity).toBeCloseTo(.5);
    expect(t.sceneVisible).toBe(false);
    t.update(.5, false);
    expect(t.phase).toBe("black");
    expect(t.opacity).toBe(1);
    expect(t.sceneVisible).toBe(false);
    t.update(.5, false);
    expect(t.phase).toBe("prologue-in");
    expect(t.sceneVisible).toBe(true);
    expect(t.complete).toBe(false);
    expect(t.opacity).toBe(1);
    t.update(.4, false);
    expect(t.opacity).toBeCloseTo(.5);
    expect(t.complete).toBe(false);
    t.update(.41, false);
    expect(t.phase).toBe("done");
    expect(t.opacity).toBe(0);
    expect(t.active).toBe(false);
  });

  it("does not restart on duplicate START or move backwards with a negative delta", () => {
    const t = new OpeningTransition();
    t.start(false);
    t.update(.7, false);
    const shade = t.opacity;
    expect(t.start(false)).toBe(false);
    t.update(-5, false);
    expect(t.opacity).toBe(shade);
    t.update(10, false);
    expect(t.complete).toBe(true);
    expect(t.start(false)).toBe(false);
  });

  it("removes visual fades with reduced motion while preserving the full music fade time", () => {
    const t = new OpeningTransition();
    t.start(true);
    t.update(1.49, true);
    expect(t.opacity).toBe(0);
    expect(t.sceneVisible).toBe(false);
    expect(t.complete).toBe(false);
    t.update(.02, true);
    expect(t.sceneVisible).toBe(true);
    expect(t.complete).toBe(true);
  });

  it("freezes visual motion on a live preference change without cutting the music short", () => {
    const t = new OpeningTransition();
    t.start(false);
    t.update(.5, false);
    const shade = t.opacity;
    t.update(.2, true);
    expect(t.opacity).toBe(shade);
    expect(t.complete).toBe(false);
    t.update(.7, false);
    expect(t.opacity).toBe(shade);
    expect(t.complete).toBe(false);
    t.update(.11, false);
    expect(t.complete).toBe(true);
  });

  it("clears all transition state on return or skip and permits a fresh START", () => {
    for (const elapsed of [.5, 1.2, 1.9, 3]) {
      const t = new OpeningTransition();
      t.start(false);
      t.update(elapsed, false);
      t.reset();
      expect(t.phase).toBe("idle");
      expect(t.opacity).toBe(0);
      expect(t.sceneVisible).toBe(false);
      expect(t.start(false)).toBe(true);
      t.update(.5, false);
      expect(t.opacity).toBeCloseTo(.5);
    }
  });
});
