import { describe, expect, it } from "vitest";
import { GameWorld } from "../src/game/GameWorld";
import type { InputFrame } from "../src/game/types";
import { ChapterSequence, CHAPTER_SCENES } from "../src/ui/chapterSequence";
import { CaveGuideSequence, guideGaugeDemo } from "../src/ui/caveGuide";
import { CRYSTAL_ALTAR } from "../src/stage/maps/crystalAltarMap";
import { MOSS_ROOT_ENCOUNTERS } from "../src/stage/maps/mossRootRuinsMap";
import { LIGHTWING_ENCOUNTERS } from "../src/stage/maps/lightwingCrystalCavernMap";
import { DEPTHS_ENCOUNTERS } from "../src/stage/maps/spiritClothStonescaleDepthsMap";
const input = (pressed: InputFrame["pressed"] = new Set()): InputFrame => ({ move: { x: 0, y: 0 }, held: new Set(), pressed, mode: "keyboard" });
function closeDialogue(world: GameWorld) {
  for (let i = 0; i < 100 && world.snapshot.dialogue; i++) world.update(.05, input(i % 4 === 0 ? new Set(["interact"]) : new Set()));
  expect(world.snapshot.dialogue).toBeNull();
}

describe("chapter end commits only after its cinematic", () => {
  it("keeps the seal solid, freezes on contact and grants completion and acquisition audio once", () => {
    const world = new GameWorld({ mode: "stage", initialRoomId: "crystalAltar", initialPhase: "playing" });
    world.setVelgranBossForQa("seal"); world.update(1 / 60); closeDialogue(world);
    expect(world.forestSealStoneObtained).toBe(false); expect(world.phase).toBe("playing");
    world.active.pos = { x: CRYSTAL_ALTAR.sealStone.x, y: CRYSTAL_ALTAR.sealStone.y + 40 };
    world.drainAudioEvents(); world.update(1 / 60, input(new Set(["interact"])));
    expect(world.sealCinematicPending).toBe(true); expect(world.snapshot.dialogue).toBeNull();
    expect(world.snapshot.velgran?.phase).toBe("blessing"); expect(world.forestSealStoneObtained).toBe(false);
    const before = { time: world.time, party: JSON.stringify(world.party), boss: JSON.stringify(world.snapshot.velgran) };
    for (let i = 0; i < 120; i++) world.update(1 / 60, { ...input(new Set(["interact", "pause", "attack", "switch"])), move: { x: 1, y: 1 } });
    expect(world.time).toBe(before.time); expect(JSON.stringify(world.party)).toBe(before.party); expect(JSON.stringify(world.snapshot.velgran)).toBe(before.boss);
    expect(world.togglePause()).toBe(false); world.confirm(); expect(world.phase).toBe("playing");
    expect(world.completeSealCinematic()).toBe(true); expect(world.completeSealCinematic()).toBe(false);
    expect(world.phase).toBe("playing"); expect(world.chapterReturnActive).toBe(true); expect(world.forestSealStoneObtained).toBe(true); expect(world.snapshot.velgran?.sealStoneVisible).toBe(true);
    expect(world.snapshot.velgran?.phase).toBe("cleared");
    expect(world.drainAudioEvents().filter(e => e.kind === "forestSealStone" && e.variant === 1)).toHaveLength(1);
  });
  it("continues both sentences, reveals before advancing, supports back and one completion after a fade", () => {
    const s = new ChapterSequence(); s.begin(false); s.update(.2, false);
    expect(s.text.length).toBeGreaterThan(0); expect(s.fullyVisible).toBe(false);
    s.advance(1000, false); expect(s.text).toBe(s.fullText); s.advance(1100, false); expect(s.sceneIndex).toBe(0);
    s.advance(1300, false); expect(s.sceneIndex).toBe(1); s.back(1600, false); expect(s.sceneIndex).toBe(0);
    s.update(10, false); expect(s.text).toBe(CHAPTER_SCENES[0].narration.join("\n"));
    s.advance(1900, false); s.update(10, false); s.advance(2200, false); s.update(10, false); s.advance(2500, false);
    expect(s.phase).toBe("leaving"); expect(s.update(.2, false)).toBe(false); expect(s.update(.21, false)).toBe(true); expect(s.update(1, false)).toBe(false);
  });
  it("allows reduced motion and skip without waiting for any image or text timer", () => {
    const s = new ChapterSequence(); s.begin(true); expect(s.text).toBe(s.fullText);
    s.skip(); s.skip(); expect(s.update(.09, true)).toBe(true); expect(s.update(1, true)).toBe(false);
    expect(CHAPTER_SCENES[1].speaker).toBe("メル"); expect(CHAPTER_SCENES[2].narration[1]).toContain("託された");
  });
});

describe("separate, optional controls guidance", () => {
  it("starts immediately with two input-controlled cards and can be skipped", () => {
    const s = new CaveGuideSequence(); expect(s.phase).toBe("cards"); expect(s.card).toBe(0);
    s.update(10); expect(s.phase).toBe("cards"); expect(s.card).toBe(0);
    s.advance(1000); expect(s.card).toBe(1); s.advance(1100); expect(s.phase).toBe("cards");
    s.advance(1300); expect(s.phase).toBe("done");
    const manual = new CaveGuideSequence(); expect(manual.phase).toBe("cards"); manual.skip(); expect(manual.phase).toBe("done");
  });
  it("demonstrates a five-second segment and exact one/three segment costs", () => {
    expect(guideGaugeDemo(2.5, false).charge).toBe(.5); expect(guideGaugeDemo(5, false).charge).toBe(1);
    expect(guideGaugeDemo(6, false)).toEqual({ charge: 0, cost: 1, spending: true });
    expect(guideGaugeDemo(7, false).charge).toBe(2); expect(guideGaugeDemo(12, false).charge).toBe(3);
    expect(guideGaugeDemo(13, false)).toEqual({ charge: 0, cost: 3, spending: true });
    expect(guideGaugeDemo(100, true).charge).toBe(3);
  });
});

describe("onboarding cleanup preserves combat", () => {
  it("leaves each encounter functional with no enemy weakness dialogue or repeated keys", () => {
    for (const group of MOSS_ROOT_ENCOUNTERS) {
      const w = new GameWorld({ mode: "stage", initialRoomId: "mossRootRuins", initialPhase: "playing" });
      w.setMossRootEncounterForQa(group.id, "noticed");
      (w as unknown as { activateMossEncounter(): void }).activateMossEncounter();
      expect(w.stageEncounter).toBe("active"); expect(w.banner).not.toMatch(/J |Space/); expect(w.snapshot.dialogue).toBeNull();
    }
    for (const group of LIGHTWING_ENCOUNTERS) {
      const w = new GameWorld({ mode: "stage", initialRoomId: "lightwingCrystalCavern", initialPhase: "playing" });
      w.setLightwingEncounterForQa(group.id, "noticed");
      (w as unknown as { activateLightwingEncounter(): void }).activateLightwingEncounter();
      expect(w.stageEncounter).toBe("active"); expect(w.banner).not.toMatch(/J |Space/); expect(w.snapshot.dialogue).toBeNull();
    }
    for (const group of DEPTHS_ENCOUNTERS) {
      const w = new GameWorld({ mode: "stage", initialRoomId: "spiritClothStonescaleDepths", initialPhase: "playing" });
      w.setDepthsEncounterForQa(group.id, "noticed");
      (w as unknown as { activateDepthsEncounter(): void }).activateDepthsEncounter();
      expect(w.stageEncounter).toBe("active"); expect(w.snapshot.dialogue).toBeNull(); expect(w.banner).not.toMatch(/J |Space/);
    }
  });
  it("keeps failed skill input free of banners and reports the required gauge next to the actor", () => {
    const w = new GameWorld({ mode: "arena", initialPhase: "playing" });
    w.active.techCharge = 0;
    w.update(1 / 60, input(new Set(["special"])));
    expect(w.banner).toBe(""); expect(w.techFeedback?.required).toBe(1); expect(w.active.techCharge).toBeLessThan(.01);
    w.update(1 / 60, input(new Set(["ultimate"])));
    expect(w.banner).toBe(""); expect(w.techFeedback?.required).toBe(3);
    w.phase = "paused"; const t = w.techFeedback?.timer; w.update(.05); expect(w.techFeedback?.timer).toBe(t);
  });
});
