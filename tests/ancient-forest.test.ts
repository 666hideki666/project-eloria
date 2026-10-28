import { describe, expect, it } from "vitest";
import mask from "../assets/environments/ancient-forest/ancient-forest-walkability-v1.rle.json";
import { GameWorld } from "../src/game/GameWorld";
import type { InputFrame } from "../src/game/types";
import {
  ANCIENT_FOREST,
  ANCIENT_FOREST_BACKDROP_TRANSFORM,
  ancientForestSourcePixel,
  ancientForestSourceToWorld,
  ancientForestWorldToSource,
} from "../src/stage/maps/ancientForestMap";
import {
  findNearestAncientForestWalkablePosition,
  isAncientForestPositionWalkable,
  resolveAncientForestMovement,
} from "../src/stage/ancientForestCollision";
import { MOSS_ROOT_RUINS } from "../src/stage/maps/mossRootRuinsMap";
import { isMossRootPositionWalkable } from "../src/stage/tileCollision";

const WIDTH = mask.sourceWidth;
const HEIGHT = mask.sourceHeight;
const sourcePoint = (x: number, y: number) => ancientForestSourceToWorld({ x: x + 0.5, y: y + 0.5 });
const frame = (move = { x: 0, y: 0 }): InputFrame => ({
  move, pressed: new Set(), held: new Set(), mode: "keyboard",
});

function advanceToRoom(world: GameWorld, roomId: "ancientForest" | "mossRootRuins", move: { x: number; y: number }): void {
  for (let index = 0; index < 240; index += 1) {
    world.update(1 / 60, frame(move));
    if (world.roomId === roomId && world.roomTransitionOpacity === 0) return;
  }
  throw new Error(`Did not reach ${roomId} through gameplay movement`);
}

/** A native-pixel route through the user's red interior, without invented links. */
function route(from: readonly [number, number], to: readonly [number, number]): number[] {
  const start = from[1] * WIDTH + from[0];
  const goal = to[1] * WIDTH + to[0];
  const previous = new Int32Array(WIDTH * HEIGHT);
  previous.fill(-1);
  const queue = new Int32Array(WIDTH * HEIGHT);
  let head = 0;
  let tail = 0;
  previous[start] = start;
  queue[tail++] = start;
  while (head < tail && previous[goal]! < 0) {
    const current = queue[head++]!;
    const x = current % WIDTH;
    const y = Math.floor(current / WIDTH);
    for (const [next, valid] of [
      [current - 1, x > 0], [current + 1, x < WIDTH - 1],
      [current - WIDTH, y > 0], [current + WIDTH, y < HEIGHT - 1],
    ] as const) {
      if (!valid || previous[next]! >= 0) continue;
      const nextX = next % WIDTH;
      const nextY = Math.floor(next / WIDTH);
      if (nextY > ANCIENT_FOREST.villageControlSourceY || !ancientForestSourcePixel(nextX, nextY)) continue;
      previous[next] = current;
      queue[tail++] = next;
    }
  }
  expect(previous[goal]!, `redline route ${from} -> ${to}`).toBeGreaterThanOrEqual(0);
  const pixels: number[] = [];
  for (let cell = goal; cell !== start; cell = previous[cell]!) pixels.push(cell);
  return pixels.reverse();
}

describe("Ancient Forest user-redline map", () => {
  it("uses forest music for normal and direct starts, with battle taking priority", () => {
    const world = new GameWorld({ mode: "stage" });
    expect(world.musicScene).toBe("ancientForest");
    expect(world.snapshot.musicScene).toBe("ancientForest");
    world.confirm();
    expect(world.beginStageCombat()).toBe(true);
    expect(world.musicScene).toBe("battle");
    expect(world.endStageCombat()).toBe(true);
    expect(world.musicScene).toBe("ancientForest");
    for (const room of ["mossRootRuins", "lightwingCrystalCavern", "spiritClothStonescaleDepths", "crystalAltar"] as const) {
      expect(world.startDevelopmentLayer(room)).toBe(true);
      expect(world.musicScene).toBe("exploration");
    }
    expect(world.startDevelopmentLayer("ancientForest")).toBe(true);
    expect(world.musicScene).toBe("ancientForest");
  });

  it("starts the normal stage in the forest, and retains every direct DEV layer start", () => {
    const world = new GameWorld({ mode: "stage" });
    expect(world.phase).toBe("intro");
    expect(world.roomId).toBe("ancientForest");
    expect(world.snapshot.stageLayer).toBe("ancientForest");
    expect(world.snapshot.worldWidth).toBe(1152);
    expect(world.snapshot.worldHeight).toBe(768);
    expect(ANCIENT_FOREST.columns).toBe(36);
    expect(ANCIENT_FOREST.rows).toBe(24);
    expect(ANCIENT_FOREST.caveEntryHalfWidth).toBe(21);
    expect(ANCIENT_FOREST_BACKDROP_TRANSFORM.worldRect).toEqual({ x: 0, y: 0, width: 1152, height: 768 });
    expect(ANCIENT_FOREST.cameraBounds).toEqual({ left: 0, top: 0, right: 512, bottom: 408 });
    expect(ANCIENT_FOREST.spawn).toEqual({ x: 585, y: 675 });
    expect(ANCIENT_FOREST.caveEntry).toEqual({ x: 618.75, y: 67.5 });
    expect(world.active.pos).toEqual(ANCIENT_FOREST.spawn);
    expect(world.enemies).toHaveLength(0);
    expect(world.snapshot.partyPresence).toBe("solo");
    expect(isAncientForestPositionWalkable(world.active.pos, world.active.radius)).toBe(true);
    world.confirm();
    expect(world.phase).toBe("playing");
    expect(world.roomId).toBe("ancientForest");
    for (const room of ["ancientForest", "mossRootRuins", "lightwingCrystalCavern", "spiritClothStonescaleDepths", "crystalAltar"] as const) {
      expect(world.startDevelopmentLayer(room)).toBe(true);
      expect(world.roomId).toBe(room);
    }
  });

  it("uses the aligned native mask, preserves enclosed holes, and blocks the story village exit", () => {
    expect(mask.sourceWidth).toBe(1536);
    expect(mask.sourceHeight).toBe(1024);
    expect(mask.walkablePixels).toBe(378087);
    for (const [x, y] of [[780, 900], [780, 550], [290, 405], [310, 180], [1320, 420], [825, 90], [780, 1018]] as const) {
      expect(ancientForestSourcePixel(x, y), `${x},${y}`).toBe(true);
    }
    for (const [x, y] of [[50, 50], [650, 430], [925, 520], [1410, 560], [620, 1018], [880, 90], [-1, 0], [1536, 0]] as const) {
      expect(ancientForestSourcePixel(x, y), `${x},${y}`).toBe(false);
    }
    const villageRoad = sourcePoint(780, 1018);
    expect(isAncientForestPositionWalkable(villageRoad, 100)).toBe(false);
    expect(isAncientForestPositionWalkable(villageRoad, 100, { villageExitOpen: true })).toBe(true);
    expect(ancientForestWorldToSource(ancientForestSourceToWorld({ x: 825, y: 90 }))).toEqual({ x: 825, y: 90 });
  });

  it("sweeps a fast move across every raster cell and cannot shortcut through a hole", () => {
    const left = sourcePoint(600, 430);
    const right = sourcePoint(700, 430);
    expect(isAncientForestPositionWalkable(left, 100)).toBe(true);
    expect(isAncientForestPositionWalkable(right, 100)).toBe(true);
    const stopped = resolveAncientForestMovement(left, right, 100);
    expect(ancientForestWorldToSource(stopped).x).toBeLessThan(628);
    const diagonal = resolveAncientForestMovement(sourcePoint(600, 420), sourcePoint(700, 440), 100);
    expect(isAncientForestPositionWalkable(diagonal, 100)).toBe(true);
    expect(ancientForestWorldToSource(diagonal).x).toBeLessThan(628);
    const village = resolveAncientForestMovement(sourcePoint(780, 1000), sourcePoint(780, 1020), 9);
    expect(ancientForestWorldToSource(village).y).toBeLessThanOrEqual(1010);
    expect(findNearestAncientForestWalkablePosition(sourcePoint(650, 430), 9)).not.toBeNull();
    expect(findNearestAncientForestWalkablePosition({ x: -5000, y: -5000 }, 9)).toBeNull();
  });

  it("shows the village guidance once while holding south, without leaving the forest", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage" });
    world.active.pos = sourcePoint(780, 1004);
    let hints = 0;
    let previous = "";
    for (let index = 0; index < 180; index += 1) {
      world.update(1 / 60, frame({ x: 0, y: 1 }));
      if (world.snapshot.banner === "まずは森の奥の洞窟を調べよう" && previous !== world.snapshot.banner) hints += 1;
      previous = world.snapshot.banner;
      expect(isAncientForestPositionWalkable(world.active.pos, world.active.radius)).toBe(true);
    }
    expect(hints).toBe(1);
    expect(world.roomId).toBe("ancientForest");
    expect(ancientForestWorldToSource(world.active.pos).y).toBeLessThanOrEqual(1010);
  });

  it("keeps deployed followers on the scaled red floor during real movement", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage" });
    expect(world.beginStageCombat()).toBe(true);
    const followersStart = world.party.filter((member) => member.id !== world.activeId).map((member) => ({ ...member.pos }));
    for (const cell of route([780, 900], [780, 550])) {
      const target = sourcePoint(cell % WIDTH, Math.floor(cell / WIDTH));
      const dx = target.x - world.active.pos.x;
      const dy = target.y - world.active.pos.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0.01) world.update(Math.min(1 / 60, distance / world.active.moveSpeed),
        frame({ x: dx / distance, y: dy / distance }));
      for (const member of world.party) {
        expect(isAncientForestPositionWalkable(member.pos, member.radius), member.id).toBe(true);
      }
    }
    expect(world.party.some((member, index) => index > 0 &&
      Math.hypot(member.pos.x - followersStart[index - 1]!.x,
        member.pos.y - followersStart[index - 1]!.y) > 10)).toBe(true);
  });

  it("replays real player movement through the center, both branches, cave, and Layer 1 entry", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage" });
    const landmarks: readonly (readonly [number, number])[] = [
      [780, 900], [780, 550], [290, 405], [310, 180], [1320, 420], [825, 120], [825, 90],
    ];
    let steps = 0;
    for (let index = 1; index < landmarks.length; index += 1) {
      const start = landmarks[index - 1]!;
      const goal = landmarks[index]!;
      for (const cell of route(start, goal)) {
        const target = sourcePoint(cell % WIDTH, Math.floor(cell / WIDTH));
        const delta = { x: target.x - world.active.pos.x, y: target.y - world.active.pos.y };
        const distance = Math.hypot(delta.x, delta.y);
        if (distance > 0.01) world.update(Math.min(1 / 60, distance / world.active.moveSpeed), frame({ x: delta.x / distance, y: delta.y / distance }));
        steps += 1;
        if (world.roomId !== "ancientForest" || world.snapshot.roomTransitionOpacity > 0) break;
        expect(isAncientForestPositionWalkable(world.active.pos, world.active.radius), `step ${steps}`).toBe(true);
        expect(Math.hypot(world.active.pos.x - target.x, world.active.pos.y - target.y), `step ${steps}`).toBeLessThan(0.2);
      }
      if (world.snapshot.roomTransitionOpacity > 0) break;
      expect(Math.hypot(world.active.pos.x - sourcePoint(goal[0], goal[1]).x,
        world.active.pos.y - sourcePoint(goal[0], goal[1]).y), `landmark ${goal}`).toBeLessThan(0.2);
    }
    expect(steps).toBeGreaterThan(1000);
    expect(world.snapshot.roomTransitionOpacity).toBeGreaterThan(0);
    for (let index = 0; index < 40; index += 1) world.update(1 / 60, frame());
    expect(world.roomId).toBe("mossRootRuins");
    expect(world.active.pos.y).toBeGreaterThan(0);
    expect(world.enemies).toHaveLength(10);
    expect(world.snapshot.stageLayer).toBe("mossRootRuins");
  }, 30000);

  it("walks Forest → Layer 1 → Forest → Layer 1 while keeping party and puzzle progress", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage" });
    expect(world.musicScene).toBe("ancientForest");
    world.active.pos = sourcePoint(825, 110);
    advanceToRoom(world, "mossRootRuins", { x: 0, y: -1 });
    expect(world.musicScene).toBe("exploration");
    expect(world.active.pos.y).toBeLessThan(MOSS_ROOT_RUINS.southExit.y);

    world.exp = 37;
    world.northGateUnlocked = true;
    world.mossLayerGateUnlocked = true;
    world.lightwingLayerGateUnlocked = true;
    const resources = world.party.map((member) => {
      member.hp = Math.max(1, member.hp - 9);
      member.mp = Math.max(0, member.mp - 5);
      member.techCharge = 1.25;
      return { id: member.id, hp: member.hp, mp: member.mp };
    });
    advanceToRoom(world, "ancientForest", { x: 0, y: 1 });
    expect(world.musicScene).toBe("ancientForest");
    expect(world.active.pos).toEqual(ANCIENT_FOREST.caveReturnSpawn);
    expect(ancientForestWorldToSource(world.active.pos)).toEqual({ x: 825, y: 160 });
    expect(world.party.every((member) => member.facing.y > 0 &&
      isAncientForestPositionWalkable(member.pos, member.radius))).toBe(true);
    expect(world.snapshot.camera.y).toBe(0);
    expect(world.snapshot.banner).toBe("");

    // Keep the exit key held beyond both fade and cooldown. It must not
    // immediately re-enter the cave or accidentally reach the village exit.
    for (let index = 0; index < 60; index += 1) world.update(1 / 60, frame({ x: 0, y: 1 }));
    expect(world.roomId).toBe("ancientForest");
    expect(ancientForestWorldToSource(world.active.pos).y).toBeGreaterThan(160);
    expect(isAncientForestPositionWalkable(world.active.pos, world.active.radius)).toBe(true);

    const current = ancientForestWorldToSource(world.active.pos);
    for (const cell of route([Math.floor(current.x), Math.floor(current.y)], [825, 90])) {
      const target = sourcePoint(cell % WIDTH, Math.floor(cell / WIDTH));
      const dx = target.x - world.active.pos.x;
      const dy = target.y - world.active.pos.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0.01) world.update(Math.min(1 / 60, distance / world.active.moveSpeed),
        frame({ x: dx / distance, y: dy / distance }));
      if (world.snapshot.roomTransitionOpacity > 0) break;
      expect(isAncientForestPositionWalkable(world.active.pos, world.active.radius)).toBe(true);
    }
    expect(world.snapshot.roomTransitionOpacity).toBeGreaterThan(0);
    advanceToRoom(world, "mossRootRuins", { x: 0, y: -1 });
    expect(world.musicScene).toBe("exploration");
    expect(world.active.pos.y).toBeLessThan(MOSS_ROOT_RUINS.southExit.y);
    expect(world.party.every((member) => isMossRootPositionWalkable(member.pos, member.radius, {
      gateOpen: true, layerGateOpen: true,
    }))).toBe(true);
    expect(world.party.map((member) => ({ id: member.id, hp: member.hp, mp: member.mp }))).toEqual(resources);
    expect(world.party.every((member) => member.techCharge >= 1.25)).toBe(true);
    expect(world.exp).toBe(37);
    expect(world.northGateUnlocked).toBe(true);
    expect(world.mossLayerGateUnlocked).toBe(true);
    expect(world.lightwingLayerGateUnlocked).toBe(true);
  }, 30000);

  it("requires the actual south stair, valid red floor, downward input, and no battle", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    for (let index = 0; index < 40; index += 1) world.update(1 / 60, frame());
    expect(isMossRootPositionWalkable(MOSS_ROOT_RUINS.southExit, world.active.radius, { gateOpen: false })).toBe(true);
    expect(isAncientForestPositionWalkable(ANCIENT_FOREST.caveReturnSpawn, world.active.radius)).toBe(true);
    world.update(1 / 60, frame({ x: 0, y: 1 }));
    expect(world.roomId).toBe("mossRootRuins"); // Original Layer 1 spawn is north of the exit.

    world.active.pos = { x: MOSS_ROOT_RUINS.southExit.x + MOSS_ROOT_RUINS.southExitHalfWidth + 2, y: 1892 };
    expect(isMossRootPositionWalkable(world.active.pos, world.active.radius, { gateOpen: false })).toBe(true);
    for (let index = 0; index < 8; index += 1) world.update(1 / 60, frame({ x: 0, y: 1 }));
    expect(world.roomId).toBe("mossRootRuins");
    expect(world.roomTransitionOpacity).toBe(0);

    world.active.pos = { ...MOSS_ROOT_RUINS.southExit };
    world.update(1 / 60, frame({ x: 1, y: 0 }));
    world.update(1 / 60, frame({ x: 0, y: -1 }));
    expect(world.roomTransitionOpacity).toBe(0);

    world.active.pos = { x: 1100, y: 1892 }; // Outside the user redline.
    expect(isMossRootPositionWalkable(world.active.pos, world.active.radius, { gateOpen: false })).toBe(false);
    world.update(1 / 60, frame({ x: 0, y: 1 }));
    expect(world.roomTransitionOpacity).toBe(0);

    world.active.pos = { ...MOSS_ROOT_RUINS.southExit };
    expect(world.beginStageCombat()).toBe(true);
    world.update(1 / 60, frame({ x: 0, y: 1 }));
    expect(world.roomTransitionOpacity).toBe(0);
    expect(world.roomId).toBe("mossRootRuins");
  });
});
