import { describe, expect, it } from "vitest";
import { GameWorld } from "../src/game/GameWorld";
import type { CharacterId, InputFrame } from "../src/game/types";
import { ANCIENT_FOREST, ancientForestSourceToWorld, ancientForestWorldToSource } from "../src/stage/maps/ancientForestMap";
import { isAncientForestPositionWalkable } from "../src/stage/ancientForestCollision";
import { CRYSTAL_ALTAR } from "../src/stage/maps/crystalAltarMap";
import { ChapterSequence } from "../src/ui/chapterSequence";
import { FOREST_RETURN_SCENES } from "../src/ui/forestReturnScenes";

const input = (x = 0, y = 0, interact = false): InputFrame => ({ move: { x, y }, held: new Set(), pressed: new Set(interact ? ["interact"] : []), mode: "keyboard" });
function sealReady() {
  const w = new GameWorld({ mode: "stage", initialRoomId: "crystalAltar", initialPhase: "playing" });
  w.setVelgranBossForQa("seal"); w.update(1 / 60);
  for (let i = 0; i < 100 && w.snapshot.dialogue; i++) w.update(.05, input(0, 0, i % 4 === 0));
  w.active.pos = { x: CRYSTAL_ALTAR.sealStone.x, y: CRYSTAL_ALTAR.sealStone.y + 40 };
  w.update(1 / 60, input(0, 0, true));
  expect(w.sealCinematicPending).toBe(true);
  return w;
}
function arrive(w: GameWorld) {
  for (let i = 0; i < 90 && !w.forestReturnCinematicPending; i++) w.update(1 / 60, input(1, -1, true));
  expect(w.roomId).toBe("ancientForest"); expect(w.roomTransitionOpacity).toBe(0);
  expect(w.forestReturnCinematicPending).toBe(true);
}
function walk(w: GameWorld, native: { x: number; y: number }) {
  const target = ancientForestSourceToWorld(native);
  for (let i = 0; i < 2000; i++) {
    const dx = target.x - w.active.pos.x, dy = target.y - w.active.pos.y;
    if (Math.hypot(dx, dy) < 1.5) return;
    w.update(1 / 120, input(dx, dy));
    expect(isAncientForestPositionWalkable(w.active.pos, w.active.radius, { villageExitOpen: true })).toBe(true);
  }
  throw new Error(`Cannot walk to ${JSON.stringify(native)} from ${JSON.stringify(w.active.pos)}`);
}

describe("automatic chapter return", () => {
  it.each<CharacterId>(["kyle", "nadi", "meru"])("preserves %s and party resources/progress, arrives at the cave and commits once", active => {
    const w = sealReady(); w.activeId = active; w.exp = 321;
    w.primaryCrystalActivated = true; w.crystalPathUnlocked = true;
    w.party.forEach((p, i) => { p.hp = 23 + i; p.mp = 7 + i; p.techCharge = 1.25 + i / 4; });
    const resources = () => w.party.map(p => ({ hp: p.hp, mp: p.mp, tech: p.techCharge }));
    const before = resources(), time = w.time;
    w.drainAudioEvents();
    expect(w.completeForestReturnCinematic()).toBe(false);
    expect(w.completeSealCinematic()).toBe(true); expect(w.completeSealCinematic()).toBe(false);
    expect(w.phase).toBe("playing"); expect(w.inputLocked).toBe(true); expect(w.togglePause()).toBe(false);
    w.confirm(); arrive(w);
    expect(w.activeId).toBe(active); expect(w.active.pos).toEqual(ANCIENT_FOREST.caveReturnSpawn);
    expect(w.active.facing).toEqual({ x: 0, y: 1 });
    expect(resources()).toEqual(before); expect(w.exp).toBe(321); expect(w.time).toBe(time);
    expect(w.primaryCrystalActivated && w.crystalPathUnlocked).toBe(true);
    expect(w.musicScene).toBe("ancientForest"); expect(w.snapshot.stageLayer).toBe("ancientForest");
    for (let i = 0; i < 90; i++) w.update(1 / 60, input(1, 1, true));
    expect(w.time).toBe(time); expect(resources()).toEqual(before);
    expect(w.drainAudioEvents().filter(e => e.kind === "forestSealStone" && e.variant === 1)).toHaveLength(1);
    expect(w.completeForestReturnCinematic()).toBe(true); expect(w.completeForestReturnCinematic()).toBe(false);
    w.update(1 / 60, input(0, 1));
    expect(w.inputLocked).toBe(false); expect(w.time).toBeGreaterThan(time);
    expect(w.completeSealCinematic()).toBe(false);
  });

  it("walks from cave arrival through the existing redline road and freezes once at its south edge", () => {
    const w = sealReady(); w.completeSealCinematic(); arrive(w); w.completeForestReturnCinematic();
    walk(w, { x: 777, y: 160 }); walk(w, { x: 777, y: 1000 });
    expect(w.titleReturnPending).toBe(false);
    for (let i = 0; i < 100 && !w.titleReturnPending; i++) w.update(1 / 120, input(0, 1));
    expect(w.titleReturnPending).toBe(true); expect(ancientForestWorldToSource(w.active.pos).y).toBeGreaterThanOrEqual(1021);
    const frozen = { pos: { ...w.active.pos }, time: w.time, party: JSON.stringify(w.party) };
    for (let i = 0; i < 100; i++) { w.update(1 / 60, input(1, -1, true)); w.confirm(); w.togglePause(); }
    expect(w.active.pos).toEqual(frozen.pos); expect(w.time).toBe(frozen.time); expect(JSON.stringify(w.party)).toBe(frozen.party);
    expect(w.phase).toBe("playing");
  });

  it("rejects the village exit before acquisition while preserving ordinary arena clear", () => {
    const w = new GameWorld({ mode: "stage", initialPhase: "playing" });
    w.active.pos = ancientForestSourceToWorld({ x: 777, y: 1000 });
    for (let i = 0; i < 120; i++) w.update(1 / 60, input(0, 1));
    expect(ancientForestWorldToSource(w.active.pos).y).toBeLessThanOrEqual(1010);
    expect(w.titleReturnPending).toBe(false); expect(w.banner).toContain("洞窟");
    const arena = new GameWorld({ mode: "arena", initialPhase: "playing" });
    arena.phase = "cleared"; const wave = arena.wave; arena.confirm();
    expect(arena.wave).toBe(wave + 1); expect(arena.phase).toBe("playing"); expect(arena.titleReturnPending).toBe(false);
  });

  it("holds initial cave entry at black before the title/anomaly, then resumes fade-in", () => {
    const w = new GameWorld({ mode: "stage", initialPhase: "playing", enableLayer1Anomaly: true });
    w.active.pos = ancientForestSourceToWorld({ x: 825.5, y: 110.5 });
    for (let i = 0; i < 90 && !w.caveGuidePending; i++) w.update(1 / 60, input(0, -1));
    expect(w.roomId).toBe("mossRootRuins"); expect(w.roomTransitionOpacity).toBe(1); expect(w.caveGuidePending).toBe(true);
    expect(w.layer1AnomalyPending).toBe(false);
    const pos = { ...w.active.pos }, time = w.time;
    for (let i = 0; i < 60; i++) w.update(1 / 60, input(1, 1, true));
    expect(w.roomTransitionOpacity).toBe(1); expect(w.active.pos).toEqual(pos); expect(w.time).toBe(time);
    w.caveGuidePending = false;
    for (let i = 0; i < 30; i++) w.update(1 / 60);
    expect(w.roomTransitionOpacity).toBe(0); expect(w.layer1AnomalyPending).toBe(true);
  });

  it("uses exactly two return scenes with continuous text, back and one skip completion", () => {
    const s = new ChapterSequence(FOREST_RETURN_SCENES); s.begin(false); s.update(.2, false);
    expect(s.sceneCount).toBe(2); expect(s.fullyVisible).toBe(false);
    s.advance(1000, false); expect(s.text).toBe(FOREST_RETURN_SCENES[0]!.narration.join("\n"));
    s.advance(1300, false); expect(s.sceneIndex).toBe(1); expect(s.scene.speaker).toBe("ナディ");
    s.update(10, false); expect(s.text).toContain("三人は、静けさ");
    s.back(1600, true); expect(s.sceneIndex).toBe(0); expect(s.fullyVisible).toBe(true);
    s.skip(); s.skip(); expect(s.update(.4, false)).toBe(true); expect(s.update(1, false)).toBe(false);
  });
});
