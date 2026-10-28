import { describe, expect, it } from "vitest";
import { bossGaugeValues, isBossGaugeVisible } from "../src/ui/FieldMessages";
import { GameWorld } from "../src/game/GameWorld";
import {
  VELGRAN_AWAKENING_ANCHORS,
  VELGRAN_AWAKENING_TRIM_RIGHT,
  VELGRAN_COLLAPSE_TRIM_RIGHT,
  VELGRAN_CORE_TRIM_RIGHT,
  resolveVelgranFrameSourceWidth,
  resolveVelgranAwakeningFrame,
  sealStoneFrameDrawRect,
} from "../src/render/stages/CrystalAltarRenderer";
import { CRYSTAL_ALTAR } from "../src/stage/maps/crystalAltarMap";

describe("boss combat visual safeguards", () => {
  it("keeps boss HP, armor and exposed-core state in the DOM presentation", () => {
    const world = new GameWorld({ mode: "stage", initialRoomId: "crystalAltar", initialPhase: "playing" });
    world.setVelgranBossForQa("active");
    const boss = world.snapshot.velgran!;
    expect(isBossGaugeVisible(world.snapshot)).toBe(true);
    expect(bossGaugeValues({ ...boss, hp: boss.maxHp / 2, armor: boss.maxArmor / 4 })).toEqual({ hp: .5, armor: .25, core: false });
    expect(bossGaugeValues({ ...boss, hp: -1, armor: 0, phase: "coreExposed" })).toEqual({ hp: 0, armor: 0, core: true });
    expect(isBossGaugeVisible({ velgran: { ...boss, phase: "dormant" } })).toBe(false);
  });

  it("trims only the awakening frames with contaminated right-edge fragments", () => {
    expect(VELGRAN_AWAKENING_TRIM_RIGHT).toEqual([0, 32, 0, 42, 74, 0]);
  });

  it("uses the sleeping forepaws rather than the atlas alpha tail as frame 0's ground anchor", () => {
    expect(VELGRAN_AWAKENING_ANCHORS[0]).toEqual([278, 450]);
    expect(Math.abs(VELGRAN_AWAKENING_ANCHORS[1]![1] - VELGRAN_AWAKENING_ANCHORS[0]![1])).toBeLessThanOrEqual(4);
  });

  it("holds the grounded sleeping frame until the authored awakening begins", () => {
    expect(resolveVelgranAwakeningFrame("dormant", 0)).toBe(0);
    expect(resolveVelgranAwakeningFrame("introParty", 0.8)).toBe(0);
    expect(resolveVelgranAwakeningFrame("introPan", 1.1)).toBe(0);
    expect(resolveVelgranAwakeningFrame("awakening", 0)).toBe(0);
    expect(resolveVelgranAwakeningFrame("awakening", 0.26)).toBe(1);
    expect(resolveVelgranAwakeningFrame("active", 0)).toBeNull();
  });

  it("removes disconnected atlas-edge parts from core exposure and collapse frames", () => {
    expect(VELGRAN_CORE_TRIM_RIGHT).toEqual([0, 24, 0, 0, 0, 0]);
    expect(VELGRAN_COLLAPSE_TRIM_RIGHT).toEqual([0, 6, 0, 0, 20, 0]);
  });

  it("does not carry a previous state's source crop into the next sprite state", () => {
    expect(resolveVelgranFrameSourceWidth(512, 1, VELGRAN_CORE_TRIM_RIGHT)).toBe(488);
    expect(resolveVelgranFrameSourceWidth(512, 1)).toBe(512);
    expect(resolveVelgranFrameSourceWidth(512, 1, VELGRAN_CORE_TRIM_RIGHT)).toBe(488);
  });

  it("keeps the forming seal's main roots centered on the authored altar point", () => {
    const center = CRYSTAL_ALTAR.sealStone;
    for (const [frame, rootCenterX] of [[2, 206], [3, 285], [4, 247], [5, 198]] as const) {
      const rect = sealStoneFrameDrawRect(frame, center);
      expect(rect.x + rootCenterX / 512 * rect.width).toBeCloseTo(center.x, 5);
    }
    const finished = sealStoneFrameDrawRect(5, center);
    expect(finished.y + 372 / 512 * finished.height).toBeCloseTo(center.y, 0);
    expect(finished.x).toBeGreaterThan(center.x - 72);
    expect(finished.y).toBeLessThan(center.y - 57);
  });
});
