import { describe, expect, it } from "vitest";
import { GameWorld } from "../src/game/GameWorld";
import type { CharacterId, InputFrame } from "../src/game/types";
import { STAGE_ROOMS } from "../src/stage/roomDefinitions";
import { CRYSTAL_ALTAR } from "../src/stage/maps/crystalAltarMap";
import { ANCIENT_FOREST } from "../src/stage/maps/ancientForestMap";
import { isAncientForestPositionWalkable } from "../src/stage/ancientForestCollision";

const input = (interact = false): InputFrame => ({ move: { x: 0, y: 0 }, held: new Set(), pressed: new Set(interact ? ["interact"] : []), mode: "keyboard" });
function revisit() {
  const w = new GameWorld({ mode: "stage", initialPhase: "playing", initialRoomId: "crystalAltar" });
  w.forestSealStoneObtained = true;
  (w as unknown as { configureStageRoom(room: typeof STAGE_ROOMS.crystalAltar): void }).configureStageRoom(STAGE_ROOMS.crystalAltar);
  w.active.pos = { x: CRYSTAL_ALTAR.sealStone.x, y: CRYSTAL_ALTAR.sealStone.y + 60 };
  return w;
}
function finishConversation(w: GameWorld) {
  w.update(1 / 60, input(true)); expect(w.snapshot.dialogue?.sourceId).toBe("velgranPeacefulRevisit");
  for (let i = 0; i < 180 && w.snapshot.dialogue; i++) w.update(.05, input(i % 4 === 0));
  expect(w.snapshot.dialogue).toBeNull(); expect(w.velgranReturnChoicePending).toBe(true);
}
function progress(w: GameWorld) {
  return { seal: w.forestSealStoneObtained, root: w.northGateUnlocked, primary: w.primaryCrystalActivated,
    secondary: w.secondaryCrystalActivated, bridge: w.crystalPathUnlocked, lamp: w.spiritLampActivated,
    wedge: w.stoneWedgeActivated, gate: w.depthsCentralGateOpened, exp: w.exp, active: w.activeId,
    resources: w.party.map(p => ({ hp: p.hp, mp: p.mp, tech: p.techCharge, downed: p.downed })) };
}

describe("optional entrance return after peaceful conversation", () => {
  it("appears only after the last peaceful page and freezes all gameplay until a choice", () => {
    const w = revisit(); expect(w.chooseVelgranReturn(true)).toBe(false);
    w.update(1 / 60, input(true)); expect(w.velgranReturnChoicePending).toBe(false);
    for (let i = 0; i < 80 && w.snapshot.dialogue?.pageIndex === 0; i++) w.update(.05, input(i % 4 === 0));
    expect(w.snapshot.dialogue?.pageIndex).toBe(1); expect(w.velgranReturnChoicePending).toBe(false);
    for (let i = 0; i < 160 && w.snapshot.dialogue; i++) w.update(.05, input(i % 4 === 0));
    expect(w.velgranReturnChoicePending).toBe(true); expect(w.inputLocked).toBe(true);
    const before = { state: progress(w), party: JSON.stringify(w.party), time: w.time, boss: w.snapshot.velgran };
    for (let i = 0; i < 120; i++) {
      w.update(1 / 60, { ...input(true), move: { x: 1, y: -1 }, held: new Set(["attack"]), pressed: new Set(["attack", "special", "ultimate", "switch", "pause", "interact"]) });
      w.confirm(); w.togglePause();
    }
    expect(progress(w)).toEqual(before.state); expect(JSON.stringify(w.party)).toBe(before.party);
    expect(w.time).toBe(before.time); expect(w.snapshot.velgran).toEqual(before.boss);
    expect(w.phase).toBe("playing");
  });

  it("stays at the altar, allows another conversation/choice and keeps the walking exit", () => {
    const w = revisit(); finishConversation(w); const before = progress(w), pos = { ...w.active.pos };
    expect(w.chooseVelgranReturn(false)).toBe(true); expect(w.chooseVelgranReturn(true)).toBe(false);
    expect(w.roomId).toBe("crystalAltar"); expect(w.active.pos).toEqual(pos); expect(progress(w)).toEqual(before);
    expect(w.inputLocked || w.revisitReturnActive || w.chapterReturnActive).toBe(false);
    finishConversation(w); expect(w.chooseVelgranReturn(false)).toBe(true);
    w.active.pos = { x: CRYSTAL_ALTAR.spawn.x, y: CRYSTAL_ALTAR.retreatY - 30 };
    for (let i = 0; i < 180; i++) {
      w.update(1 / 60, { ...input(), move: { x: 0, y: 1 } });
      if (w.roomId === "spiritClothStonescaleDepths" && w.roomTransitionOpacity === 0) break;
    }
    expect(w.roomId).toBe("spiritClothStonescaleDepths"); expect(w.forestSealStoneObtained).toBe(true);
  });

  it.each<CharacterId>(["kyle", "nadi", "meru"])("returns %s once to the safe forest spawn without a cinematic or resource change", id => {
    const w = revisit(); w.activeId = id;
    w.active.pos = { x: CRYSTAL_ALTAR.sealStone.x, y: CRYSTAL_ALTAR.sealStone.y + 60 };
    finishConversation(w);
    w.northGateUnlocked = w.primaryCrystalActivated = w.secondaryCrystalActivated = w.crystalPathUnlocked = true;
    w.spiritLampActivated = w.stoneWedgeActivated = w.depthsCentralGateOpened = true;
    w.exp = 735; w.party.forEach((p, i) => { p.hp = 31 + i; p.mp = 9 + i; p.techCharge = 1.1 + i / 4; });
    const before = progress(w), time = w.time; w.drainAudioEvents();
    expect(w.chooseVelgranReturn(true)).toBe(true); expect(w.chooseVelgranReturn(true)).toBe(false);
    expect(w.revisitReturnActive && w.inputLocked).toBe(true); expect(w.chapterReturnActive).toBe(false);
    for (let i = 0; i < 90 && w.revisitReturnActive; i++) {
      w.update(1 / 60, { ...input(true), move: { x: 0, y: 1 } });
      expect(w.forestReturnCinematicPending || w.sealCinematicPending || w.titleReturnPending).toBe(false);
    }
    expect(w.roomId).toBe("ancientForest"); expect(w.active.pos).toEqual(ANCIENT_FOREST.caveReturnSpawn);
    expect(w.active.facing).toEqual({ x: 0, y: 1 }); expect(w.roomTransitionOpacity).toBe(0);
    expect(w.party.every(p => isAncientForestPositionWalkable(p.pos, p.radius, { villageExitOpen: true }))).toBe(true);
    expect(progress(w)).toEqual(before); expect(w.time).toBe(time); expect(w.musicScene).toBe("ancientForest");
    expect(w.inputLocked || w.velgranReturnChoicePending || w.revisitReturnActive || w.chapterReturnActive).toBe(false);
    expect(w.drainAudioEvents().filter(e => e.kind === "experience" || e.kind === "forestSealStone")).toHaveLength(0);
    w.update(1 / 60, { ...input(), move: { x: 0, y: 1 } });
    expect(w.time).toBeGreaterThan(time); expect(w.active.pos.y).toBeGreaterThan(ANCIENT_FOREST.caveReturnSpawn.y);
  });

  it("does not add the choice to initial acquisition or arena play", () => {
    const w = new GameWorld({ mode: "stage", initialPhase: "playing", initialRoomId: "crystalAltar" });
    w.setVelgranBossForQa("seal"); w.update(1 / 60);
    for (let i = 0; i < 120 && w.snapshot.dialogue; i++) w.update(.05, input(i % 4 === 0));
    expect(w.velgranReturnChoicePending).toBe(false);
    w.update(1 / 60, input(true)); expect(w.sealCinematicPending).toBe(true);
    expect(w.completeSealCinematic()).toBe(true);
    for (let i = 0; i < 90 && !w.forestReturnCinematicPending; i++) w.update(1 / 60);
    expect(w.forestReturnCinematicPending).toBe(true); expect(w.velgranReturnChoicePending).toBe(false);
    expect(w.chooseVelgranReturn(true)).toBe(false);
    const arena = new GameWorld({ mode: "arena", initialPhase: "playing" });
    expect(arena.chooseVelgranReturn(true)).toBe(false); expect(arena.velgranReturnChoicePending).toBe(false);
  });
});
