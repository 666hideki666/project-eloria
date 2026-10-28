import { describe, expect, it, vi } from "vitest";
import { GameWorld } from "../src/game/GameWorld";
import type { InputFrame } from "../src/game/types";
import { ancientForestSourceToWorld } from "../src/stage/maps/ancientForestMap";
import { Layer1AnomalySequence, LAYER1_ANOMALY_PAGES } from "../src/ui/layer1Anomaly";
import { fieldBannerText, fieldMessageLayout } from "../src/ui/FieldMessages";
import { Renderer } from "../src/render/Renderer";
import { EffectPool } from "../src/effects/EffectPool";

const input = (y = 0): InputFrame => ({ move: { x: 0, y }, held: new Set(), pressed: new Set(), mode: "keyboard" });
function reach(world: GameWorld, room: string, y: number) {
  for (let i = 0; i < 240; i++) {
    world.update(1 / 60, input(y));
    if (world.caveGuidePending) world.caveGuidePending = false; // Simulate the standalone guide closing before fade-in.
    if (world.roomId === room && world.roomTransitionOpacity === 0) return;
  }
  throw new Error(`No transition to ${room}`);
}
function enter(world: GameWorld) {
  world.active.pos = ancientForestSourceToWorld({ x: 825.5, y: 110.5 });
  reach(world, "mossRootRuins", -1);
}

describe("first ordinary Forest to Layer 1 entry", () => {
  it("freezes actors, attacks, timers and resources until completion, then never replays on return", () => {
    const world = new GameWorld({ mode: "stage", initialPhase: "playing", enableLayer1Anomaly: true });
    enter(world);
    expect(world.layer1AnomalyPending).toBe(true);
    const frozen = { time: world.time, party: JSON.stringify(world.party), enemies: JSON.stringify(world.enemies) };
    for (let i = 0; i < 120; i++) world.update(1 / 60, {
      ...input(-1), held: new Set(["attack"]), pressed: new Set(["attack", "special", "switch", "pause", "interact"]),
    });
    expect(world.time).toBe(frozen.time);
    expect(JSON.stringify(world.party)).toBe(frozen.party);
    expect(JSON.stringify(world.enemies)).toBe(frozen.enemies);
    expect(world.phase).toBe("playing");
    expect(world.musicScene).toBe("exploration");
    world.layer1AnomalyPending = false;
    world.caveGuidePending = false;
    world.update(1 / 60, input());
    expect(world.time).toBeGreaterThan(frozen.time);
    reach(world, "ancientForest", 1);
    for (let i = 0; i < 60; i++) world.update(1 / 60, input());
    enter(world);
    expect(world.layer1AnomalyPending).toBe(false);
  });

  it("does not arm for QA/direct start, DEV selection or a different starting layer", () => {
    for (const world of [
      new GameWorld({ mode: "stage", initialPhase: "playing" }),
      new GameWorld({ mode: "stage", initialPhase: "playing", enableLayer1Anomaly: true }),
    ]) {
      if (world.startDevelopmentLayer("ancientForest")) enter(world);
      expect(world.layer1AnomalyPending).toBe(false);
    }
    const direct = new GameWorld({ mode: "stage", initialPhase: "playing", initialRoomId: "mossRootRuins", enableLayer1Anomaly: true });
    expect(direct.layer1AnomalyPending).toBe(false);
    const qa = new GameWorld({ mode: "stage", initialPhase: "playing", enableLayer1Anomaly: false });
    enter(qa); expect(qa.layer1AnomalyPending).toBe(false);
  });
});

describe("approved anomaly narration", () => {
  it("waits for the central title, shows a 0.4-second pulse, then waits for input on each approved page", () => {
    const s = new Layer1AnomalySequence(); s.begin();
    s.update(10, true, false); expect(s.phase).toBe("waiting-title");
    s.update(.1, false, false); expect(s.phase).toBe("pulse");
    s.update(.39, false, false); expect(s.phase).toBe("pulse");
    s.update(.02, false, false); expect(s.phase).toBe("story");
    expect(s.text).toBe("");
    for (const [index, page] of LAYER1_ANOMALY_PAGES.entries()) {
      s.update(10, false, false);
      expect(s.pageIndex).toBe(index); expect(s.text).toBe(page.text);
      expect(s.advance(1000 + index * 300, false)).toBe(true);
      expect(s.advance(1050 + index * 300, false)).toBe(false);
    }
    expect(s.phase).toBe("done");
    expect(LAYER1_ANOMALY_PAGES[0].text).toBe("洞窟の奥で、青い光が不規則に脈打った。魔物たちは苦しむように暴れ、三人の姿に気づくと、我を失ったように襲いかかってきた。");
    expect(LAYER1_ANOMALY_PAGES.slice(1).map(p => p.text)).toEqual(["森の魔物まで、こんなふうに……。", "この光、晶石が苦しんでいるみたい。", "奥を確かめよう。"]);
  });
  it("reveals the current page before advancing and rejects duplicate inputs", () => {
    const s = new Layer1AnomalySequence(); s.begin(); s.update(0, false, false); s.update(2, false, false);
    s.update(.1, false, false); expect(s.text.length).toBeGreaterThan(0);
    s.advance(1000, false); expect(s.text).toBe(s.page.text); expect(s.pageIndex).toBe(0);
    s.advance(1100, false); expect(s.pageIndex).toBe(0);
    s.advance(1250, false); expect(s.pageIndex).toBe(1); expect(s.text).toBe("");
  });
  it("skips safely and omits motion and typing for reduced motion", () => {
    const s = new Layer1AnomalySequence(); s.begin(); s.update(0, false, true);
    expect(s.phase).toBe("story"); expect(s.text).toBe(s.page.text);
    s.advance(1000, true); expect(s.text).toBe(s.page.text);
    s.skip(); expect(s.phase).toBe("done");
    const waiting = new Layer1AnomalySequence(); waiting.begin(); waiting.skip(); expect(waiting.phase).toBe("done");
  });
});

describe("crisp stage messages", () => {
  it("keeps dialogue, titles, story, pause and transitions ahead of notifications", () => {
    const s = { mode: "stage", phase: "playing", dialogue: null, banner: "解除クリスタルが光った", bannerTimer: 2, roomTransitionOpacity: 0 } as const;
    expect(fieldBannerText(s, false)).toBe(s.banner);
    expect(fieldBannerText(s, true)).toBe("");
    expect(fieldBannerText({ ...s, bannerTimer: 0 }, false)).toBe("");
    expect(fieldBannerText({ ...s, phase: "paused" }, false)).toBe("");
    expect(fieldBannerText({ ...s, roomTransitionOpacity: .1 }, false)).toBe("");
    expect(fieldBannerText({ ...s, dialogue: { sourceId: "crystal", pageIndex: 0, pageCount: 1, text: "会話", fullyVisible: true } }, false)).toBe("");
    expect(fieldBannerText({ ...s, mode: "arena" }, false)).toBe(s.banner);
  });
  it("uses a lane clear of party/pause rectangles and below the boss gauge at different sizes", () => {
    const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height });
    for (const [width, height] of [[1600, 900], [844, 390], [667, 375], [1024, 576]]) {
      const field = rect(0, 0, width!, height!);
      const party = rect(10, 10, width! < 900 ? 190 : 264, 130);
      const controls = rect(width! - 100, 10, 90, 80);
      for (const boss of [false, true]) {
        const p = fieldMessageLayout(field, party, controls, boss);
        expect(p.left).toBeGreaterThanOrEqual(party.right);
        expect(p.left + p.width).toBeLessThanOrEqual(controls.left);
        expect(p.width).toBeGreaterThan(240);
        if (boss) expect(p.top).toBeGreaterThan(38 / 360 * height!);
      }
    }
  });
  it("leaves text effects exclusively to DOM across every canvas effect layer", () => {
    const pool = new EffectPool(6);
    for (const layer of ["back", "front", "hud"] as const) pool.spawn({ kind: "text", text: "EXP +12", pos: { x: 1000, y: 600 }, layer });
    const spark = pool.spawn({ kind: "spark", pos: { x: 1000, y: 600 }, layer: "front" });
    const drawEffect = vi.fn();
    const renderer = { effectPool: pool, drawEffect };
    const drawEffects = (Renderer.prototype as unknown as { drawEffects(layer: string): void }).drawEffects;
    for (const layer of ["back", "front", "hud"]) drawEffects.call(renderer, layer);
    expect(drawEffect).toHaveBeenCalledExactlyOnceWith(spark);
  });
});
