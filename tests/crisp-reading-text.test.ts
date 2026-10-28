import { describe, expect, it } from "vitest";
import { EffectPool } from "../src/effects/EffectPool";
import { fieldPromptText, projectEffectText, fieldMessageLayout } from "../src/ui/FieldMessages";
import { GameWorld } from "../src/game/GameWorld";

describe("display-resolution reading text", () => {
  it("shares existing prompt data but suppresses it behind reading and blocking UI", () => {
    const snapshot = new GameWorld({ mode: "stage", initialPhase: "playing" }).snapshot;
    const s = { ...snapshot, dialogue: null, bannerTimer: 0, interactionPrompt: "E　晶石に触れる" };
    expect(fieldPromptText(s, false)).toBe(s.interactionPrompt);
    expect(fieldPromptText(s, true)).toBe("");
    expect(fieldPromptText({ ...s, phase: "paused" }, false)).toBe("");
    expect(fieldPromptText({ ...s, roomTransitionOpacity: .1 }, false)).toBe("");
    expect(fieldPromptText({ ...s, bannerTimer: 1 }, false)).toBe("");
    expect(fieldPromptText({ ...s, dialogue: { sourceId: "test", text: "会話", pageIndex: 0, pageCount: 1, fullyVisible: true } }, false)).toBe("");
  });
  it("projects far-world effects through the camera and reads movement/fade from the pool", () => {
    const pool = new EffectPool(1);
    const effect = pool.spawn({ kind: "text", pos: { x: 1200, y: 800 }, velocity: { x: 0, y: -18 }, life: 1, size: 8, alpha: .8 });
    const view = { mode: "stage", stageLayer: "mossRootRuins", camera: { x: 1000, y: 700, viewportWidth: 640, viewportHeight: 360 } } as const;
    expect(projectEffectText(effect, view, 1280, 720)).toEqual({ x: 400, y: 200, fontSize: 16, opacity: .8 });
    pool.update(.9);
    const p = projectEffectText(effect, view, 1280, 720);
    expect(p.y).toBe(168);
    expect(p.opacity).toBeCloseTo(.8 * .1 / .18);
    const frozen = projectEffectText(effect, view, 1280, 720);
    expect(projectEffectText(effect, view, 1280, 720)).toEqual(frozen);
    expect(projectEffectText(effect, { ...view, mode: "arena" }, 640, 360).x).toBe(1200);
    pool.update(.11); expect(effect.active).toBe(false);
  });
  it("freezes text effect position and lifetime on pause while retaining other ambient effects", () => {
    const world = new GameWorld({ mode: "stage", initialPhase: "playing" });
    const text = world.effects.spawn({ kind: "text", pos: { x: 100, y: 100 }, velocity: { x: 0, y: -18 }, life: 1 });
    const dust = world.effects.spawn({ kind: "dust", pos: { x: 100, y: 100 }, life: 1 });
    world.phase = "paused";
    for (let i = 0; i < 60; i++) world.update(1 / 60);
    expect(text.life).toBe(1); expect(text.pos.y).toBe(100);
    expect(dust.life).toBeLessThan(1);
    world.phase = "playing"; world.update(1 / 60);
    expect(text.life).toBeLessThan(1); expect(text.pos.y).toBeLessThan(100);
  });
  it("places notifications below the actual wrapped DOM boss gauge", () => {
    const r = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height });
    const field = r(0, 40, 667, 375), party = r(8, 48, 190, 120), controls = r(590, 48, 68, 40);
    const p = fieldMessageLayout(field, party, controls, true, 96);
    expect(p.top).toBe(106);
    expect(p.top + field.top).toBeGreaterThan(40 + 96);
    expect(p.left).toBeGreaterThan(party.right);
  });
});
