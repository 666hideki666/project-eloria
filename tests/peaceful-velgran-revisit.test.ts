import { describe, expect, it, vi } from "vitest";
import { GameWorld } from "../src/game/GameWorld";
import { VelgranBossController } from "../src/game/VelgranBossController";
import { createParty } from "../src/game/entities";
import type { CharacterId, InputFrame, Vec2 } from "../src/game/types";
import { VELGRAN_REVISIT_PAGES } from "../src/game/velgranRevisit";
import { CRYSTAL_ALTAR } from "../src/stage/maps/crystalAltarMap";
import { SPIRIT_CLOTH_STONESCALE_DEPTHS } from "../src/stage/maps/spiritClothStonescaleDepthsMap";
import { STAGE_ROOMS } from "../src/stage/roomDefinitions";
import { CRYSTAL_ALTAR_PEACEFUL_GUARDIAN_BASE, isCrystalAltarPositionWalkable, resolveCrystalAltarMovement } from "../src/stage/crystalAltarCollision";
import { isBossGaugeVisible } from "../src/ui/FieldMessages";

const input = (x = 0, y = 0, interact = false): InputFrame => ({ move: { x, y }, held: new Set(), pressed: new Set(interact ? ["interact"] : []), mode: "keyboard" });
function closeDialogue(w: GameWorld) {
  for (let i = 0; i < 160 && w.snapshot.dialogue; i++) w.update(.05, input(0, 0, i % 4 === 0));
  expect(w.snapshot.dialogue).toBeNull();
}
function acquired() {
  const w = new GameWorld({ mode: "stage", initialRoomId: "crystalAltar", initialPhase: "playing" });
  w.setVelgranBossForQa("seal"); w.update(1 / 60); closeDialogue(w);
  w.update(1 / 60, input(0, 0, true)); expect(w.sealCinematicPending).toBe(true);
  expect(w.completeSealCinematic()).toBe(true);
  for (let i = 0; i < 90 && !w.forestReturnCinematicPending; i++) w.update(1 / 60);
  expect(w.roomId).toBe("ancientForest"); w.completeForestReturnCinematic();
  return w;
}
function enterThroughDepths(w: GameWorld) {
  // Isolate the real door transition; the browser test also walks all layers.
  (w as unknown as { configureStageRoom(room: typeof STAGE_ROOMS.spiritClothStonescaleDepths, spawn: Vec2): void })
    .configureStageRoom(STAGE_ROOMS.spiritClothStonescaleDepths, SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoorInnerSpawn);
  w.depthsCentralGateOpened = true;
  w.active.pos = { x: SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoor.x, y: SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoor.y + 24 };
  for (let i = 0; i < 240; i++) {
    w.update(1 / 60, input(0, -1));
    if (w.roomId === "crystalAltar" && w.roomTransitionOpacity === 0) return;
  }
  throw Error("No altar arrival");
}

describe("peaceful Velgran revisit", () => {
  it("clears active combat and cannot awaken, take damage, emit attacks or reset on retreat", () => {
    const boss = new VelgranBossController(); boss.setForQa("shards");
    const hooks = { damageCharacter: vi.fn(), emit: vi.fn(), impact: vi.fn() };
    const party = createParty(); boss.update(.7, party, "kyle", hooks);
    expect(boss.projectiles.length).toBeGreaterThan(0); boss.settleForRevisit();
    const settled = boss.snapshot;
    hooks.damageCharacter.mockClear(); hooks.emit.mockClear(); hooks.impact.mockClear();
    for (let i = 0; i < 100; i++) { boss.update(.5, party, "kyle", hooks); boss.resetForRetreat(); }
    expect(boss.snapshot).toEqual(settled); expect(boss.phase).toBe("peaceful");
    expect(boss.beginIfNeeded(0)).toBe(false); expect(boss.controlLocked || boss.combatActive).toBe(false);
    expect(boss.receiveHit("meru", 9999, 9999).accepted).toBe(false);
    expect(boss.sealStoneVisible).toBe(false); expect(boss.attack).toBeNull();
    expect(boss.hazards).toHaveLength(0); expect(boss.projectiles).toHaveLength(0);
    expect(hooks.damageCharacter).not.toHaveBeenCalled(); expect(hooks.emit).not.toHaveBeenCalled(); expect(hooks.impact).not.toHaveBeenCalled();
  });

  it.each<CharacterId>(["kyle", "nadi", "meru"])("lets %s approach and talk twice without combat, rewards or duplicated cinematics", id => {
    const w = acquired(); w.activeId = id; const exp = w.exp;
    enterThroughDepths(w);
    expect(w.snapshot.velgran?.phase).toBe("peaceful"); expect(w.snapshot.velgran?.pos).toEqual(CRYSTAL_ALTAR.sealStone);
    expect(w.snapshot.partyPresence).toBe("solo"); expect(w.musicScene).toBe("exploration"); expect(isBossGaugeVisible(w.snapshot)).toBe(false);
    w.update(1 / 60, input(0, 0, true)); expect(w.snapshot.dialogue).toBeNull(); expect(w.snapshot.interactionPrompt).toBeNull();
    for (let i = 0; i < 900 && !w.snapshot.interactionPrompt; i++) w.update(1 / 60, input(0, -1));
    expect(w.snapshot.interactionPrompt).toBe("E　ヴェルグランに話しかける");
    w.drainAudioEvents();
    for (let visit = 0; visit < 2; visit++) {
      w.update(1 / 60, input(0, 0, true));
      expect(w.snapshot.dialogue?.sourceId).toBe("velgranPeacefulRevisit");
      const time = w.time, pos = { ...w.active.pos }, resources = w.party.map(p => [p.hp, p.mp]);
      for (let i = 0; i < 60; i++) w.update(1 / 60, { ...input(1, -1), pressed: new Set(["attack", "special", "ultimate", "switch"]) });
      expect(w.time).toBe(time); expect(w.active.pos).toEqual(pos); expect(w.party.map(p => [p.hp, p.mp])).toEqual(resources);
      for (let page = 0; page < 3; page++) {
        expect(w.snapshot.dialogue?.pageIndex).toBe(page);
        for (let i = 0; i < 80 && !w.snapshot.dialogue?.fullyVisible; i++) w.update(.05);
        expect(w.snapshot.dialogue?.text).toBe(VELGRAN_REVISIT_PAGES[page]);
        w.update(.05, input(0, 0, true));
      }
      expect(w.snapshot.dialogue).toBeNull();
      expect(w.velgranReturnChoicePending).toBe(true);
      expect(w.chooseVelgranReturn(false)).toBe(true);
    }
    expect(w.exp).toBe(exp); expect(w.forestSealStoneObtained).toBe(true);
    expect(w.sealCinematicPending || w.chapterReturnActive || w.titleReturnPending).toBe(false);
    expect(w.drainAudioEvents().filter(e => e.kind === "experience" || e.kind === "forestSealStone")).toHaveLength(0);
  });

  it("remains peaceful through actual exits and a second altar entrance", () => {
    const w = acquired(); enterThroughDepths(w);
    for (let repeat = 0; repeat < 2; repeat++) {
      for (let i = 0; i < 240; i++) {
        w.update(1 / 60, input(0, 1));
        if (w.roomId === "spiritClothStonescaleDepths" && w.roomTransitionOpacity === 0) break;
      }
      expect(w.roomId).toBe("spiritClothStonescaleDepths");
      for (let i = 0; i < 240; i++) {
        w.update(1 / 60, input(0, -1));
        if (w.roomId === "crystalAltar" && w.roomTransitionOpacity === 0) break;
      }
      expect(w.roomId).toBe("crystalAltar"); expect(w.snapshot.velgran?.phase).toBe("peaceful");
      expect(w.snapshot.velgran?.attack).toBeNull(); expect(w.musicScene).toBe("exploration");
    }
  });

  it("blocks the guardian footprint across fast and diagonal movement while leaving the redline floor intact", () => {
    const base = CRYSTAL_ALTAR_PEACEFUL_GUARDIAN_BASE, options = { peacefulGuardianSolid: true };
    expect(isCrystalAltarPositionWalkable(base, 999)).toBe(true);
    expect(isCrystalAltarPositionWalkable(base, 0, options)).toBe(false);
    const west = { x: base.x - 48, y: base.y }, east = { x: base.x + 48, y: base.y };
    const across = resolveCrystalAltarMovement(west, east, 0, options);
    expect(across.x).toBeLessThan(base.x - base.radiusX); expect(across.x).toBeGreaterThan(west.x);
    const front = { x: base.x, y: base.y + 50 };
    const stopped = resolveCrystalAltarMovement(front, { x: base.x, y: base.y - 50 }, 0, options);
    expect(stopped.y).toBeGreaterThan(base.y + base.radiusY);
    const diagonal = resolveCrystalAltarMovement({ x: base.x - 30, y: base.y + 40 }, base, 0, options);
    expect(isCrystalAltarPositionWalkable(diagonal, 0, options)).toBe(true);
    expect(isCrystalAltarPositionWalkable({ x: base.x, y: base.y - 20 }, 0, options)).toBe(true);
    expect(isCrystalAltarPositionWalkable({ x: base.x, y: base.y + 20 }, 0, options)).toBe(true);
  });

  it("keeps the initial guardian battle for a new run", () => {
    const old = acquired(); enterThroughDepths(old);
    const fresh = new GameWorld({ mode: "stage", initialRoomId: "crystalAltar", initialPhase: "playing" });
    for (let i = 0; i < 300 && fresh.snapshot.velgran?.phase === "dormant"; i++) fresh.update(1 / 60, input(0, -1));
    expect(fresh.forestSealStoneObtained).toBe(false); expect(fresh.snapshot.velgran?.phase).toBe("introParty");
    expect(fresh.snapshot.partyPresence).toBe("formation"); expect(fresh.musicScene).toBe("battle");
  });
});
