import { describe, expect, it } from "vitest";
import mossRootRequiredRoute from "../assets/environments/moss-root-ruins/moss-root-ruins-required-route-v3.json";
import { GameWorld } from "../src/game/GameWorld";
import {
  FIELD_ENEMY_RESPAWN_CAMERA_MARGIN,
  FIELD_ENEMY_RESPAWN_OFFSCREEN_HOLD,
  FIELD_ENEMY_RESPAWN_PRESENTATION_PADDING,
  isFieldEnemyGroupOutsideExpandedCamera,
} from "../src/game/fieldEnemyRespawn";
import { ENEMY_TUNING, FIELD_ENEMY_CONTACT, STAGE_ENCOUNTER } from "../src/config";
import { musicTrackForPartyPresence } from "../src/audio/musicTracks";
import type { ActionName, InputFrame } from "../src/game/types";
import { StageCamera } from "../src/stage/StageCamera";
import {
  MOSS_ROOT_BACKDROP_TRANSFORM,
  MOSS_ROOT_ENCOUNTERS,
  MOSS_ROOT_GATE_TRANSFORM,
  MOSS_ROOT_LANDMARKS,
  MOSS_ROOT_NAV_MASK_META,
  MOSS_ROOT_NAV_MASK_ROWS,
  MOSS_ROOT_RUINS,
  MOSS_ROOT_SOLID_PROPS,
  MOSS_ROOT_RUINS_TILES,
  isMossRootNavigationPoint,
  mossRootBackdropSourceToWorld,
  mossRootBackdropWorldToSource,
  type EncounterGroupId,
} from "../src/stage/maps/mossRootRuinsMap";
import {
  findNearestMossRootWalkablePosition,
  isMossRootPositionWalkable,
  resolveMossRootMovement,
} from "../src/stage/tileCollision";
import {
  MOSS_CORRIDOR,
  MOSS_ROOT_RUINS_ROOM,
  STAGE_ROOMS,
  TRANSFER_CHAMBER,
} from "../src/stage/roomDefinitions";
import { resolveRoomMovement } from "../src/stage/roomCollision";
import {
  LIGHTWING_CRYSTAL_CAVERN,
  LIGHTWING_CRYSTAL_CAVERN_TILES,
  LIGHTWING_ENCOUNTERS,
  LIGHTWING_SOLID_PROPS,
  findNearestSafeLightwingEnemySpawn,
  isLightwingEnemySpawnSafe,
  isLightwingTileWalkable,
  lightwingReachableTiles,
  lightwingNavigationSourcePixel,
  lightwingSourceToWorld,
  lightwingPlatformRiseStepAt,
  lightwingTileAt,
} from "../src/stage/maps/lightwingCrystalCavernMap";
import {
  isLightwingPositionWalkable,
  resolveLightwingMovement,
} from "../src/stage/lightwingCrystalCavernCollision";
import {
  DEPTHS_ENCOUNTERS,
  DEPTHS_NAV_MASK_META,
  DEPTHS_SOLID_PROPS,
  SPIRIT_CLOTH_STONESCALE_DEPTHS,
  depthsGateBlocksSource,
  depthsReachableTiles,
  depthsReachabilityKey,
  depthsSourcePixel,
  depthsSourceToWorld,
  isDepthsEnemySpawnSafe,
} from "../src/stage/maps/spiritClothStonescaleDepthsMap";
import { findNearestDepthsWalkablePosition, isDepthsPositionWalkable, resolveDepthsMovement } from "../src/stage/spiritClothStonescaleDepthsCollision";
import {
  CRYSTAL_ALTAR,
  CRYSTAL_ALTAR_BACKDROP_TRANSFORM,
  CRYSTAL_ALTAR_NAV_MASK_META,
  crystalAltarNavigationPoint,
  crystalAltarSourcePixel,
  crystalAltarSourceToWorld,
  crystalAltarWorldToSource,
} from "../src/stage/maps/crystalAltarMap";
import { CRYSTAL_ALTAR_SEAL_STONE_BASE, isCrystalAltarPositionWalkable, resolveCrystalAltarMovement } from "../src/stage/crystalAltarCollision";

function frame(
  move = { x: 0, y: 0 },
  pressed: ActionName[] = [],
): InputFrame {
  return { move, pressed: new Set(pressed), held: new Set(), mode: "keyboard" };
}

function closeDialogue(world: GameWorld): void {
  for (let page = 0; page < 4 && world.snapshot.dialogue; page += 1) {
    for (let index = 0; index < 8; index += 1) world.update(1 / 60, frame());
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
  }
}

function enemiesFor(world: GameWorld, groupId: EncounterGroupId) {
  const before = MOSS_ROOT_ENCOUNTERS
    .slice(0, MOSS_ROOT_ENCOUNTERS.findIndex((group) => group.id === groupId))
    .reduce((sum, group) => sum + group.enemies.length, 0);
  const count = MOSS_ROOT_ENCOUNTERS.find((group) => group.id === groupId)!.enemies.length;
  return world.enemies.slice(before, before + count);
}

function depthsEnemiesFor(world: GameWorld, groupId: (typeof DEPTHS_ENCOUNTERS)[number]["id"]) {
  const before = DEPTHS_ENCOUNTERS
    .slice(0, DEPTHS_ENCOUNTERS.findIndex((group) => group.id === groupId))
    .reduce((sum, group) => sum + group.enemies.length, 0);
  const count = DEPTHS_ENCOUNTERS.find((group) => group.id === groupId)!.enemies.length;
  return world.enemies.slice(before, before + count);
}

function lightwingEnemiesFor(world: GameWorld, groupId: (typeof LIGHTWING_ENCOUNTERS)[number]["id"]) {
  const before = LIGHTWING_ENCOUNTERS
    .slice(0, LIGHTWING_ENCOUNTERS.findIndex((group) => group.id === groupId))
    .reduce((sum, group) => sum + group.enemies.length, 0);
  const count = LIGHTWING_ENCOUNTERS.find((group) => group.id === groupId)!.enemies.length;
  return world.enemies.slice(before, before + count);
}

function advance(world: GameWorld, seconds: number): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) world.update(1 / 60, frame());
}

function isLightwingReachable(start: { x: number; y: number }, goal: { x: number; y: number }): boolean {
  if (!isLightwingPositionWalkable(start, 1, { crystalPathUnlocked: false })) return false;
  const key = `${Math.floor(goal.x / 32)},${Math.floor(goal.y / 32)}`;
  return lightwingReachableTiles({ crystalPathUnlocked: false, layerGateOpen: false }).has(key);
}

describe("legacy fixed-room helpers", () => {
  it("keeps legacy room definitions and collision helpers available", () => {
    expect(STAGE_ROOMS.mossCorridor).toBe(MOSS_CORRIDOR);
    expect(TRANSFER_CHAMBER.exits[0]?.target).toBe("mossCorridor");
    const resolved = resolveRoomMovement(
      { x: 100, y: 130 },
      { x: 150, y: 80 },
      9,
      TRANSFER_CHAMBER,
    );
    expect(resolved).toEqual({ x: 150, y: 114 });
  });
});

describe("scrolling moss-root ruins map", () => {
  const open = { gateOpen: true, layerGateOpen: true };
  it("defines a stage-owned 2048x1920, 64x60 world with equal row lengths", () => {
    expect(MOSS_ROOT_RUINS.width).toBe(2048);
    expect(MOSS_ROOT_RUINS.height).toBe(1920);
    expect(MOSS_ROOT_RUINS_TILES).toHaveLength(60);
    expect(MOSS_ROOT_RUINS_TILES.every((row) => row.length === 64)).toBe(true);
    expect(MOSS_ROOT_RUINS.cameraBounds).toEqual({ left: 0, top: 0, right: 1408, bottom: 1560 });
    expect(MOSS_ROOT_RUINS.progression).toBe("southToNorth");
    expect(STAGE_ROOMS.mossRootRuins).toBe(MOSS_ROOT_RUINS_ROOM);
  });

  it("places the spawn, ten enemies, landmarks, and exit on walkable tiles", () => {
    const points = [
      MOSS_ROOT_RUINS.spawn,
      mossRootBackdropSourceToWorld({ x: 1131, y: 525 }), // crystal interaction side
      MOSS_ROOT_RUINS.layerGate,
      ...MOSS_ROOT_ENCOUNTERS.flatMap((group) => group.enemies),
    ];
    for (const point of points) {
      expect(isMossRootPositionWalkable(point, 1, {
        gateOpen: true,
        layerGateOpen: true,
      }), `${point.x},${point.y}`).toBe(true);
    }
    expect(MOSS_ROOT_ENCOUNTERS.map((group) => group.enemies.length)).toEqual([3, 2, 2, 3]);
    expect(MOSS_ROOT_ENCOUNTERS.flatMap((group) => group.enemies)).toHaveLength(10);
  });

  it("keeps actor-sized bodies on stone and rejects representative abyss pixels", () => {
    for (const group of MOSS_ROOT_ENCOUNTERS) {
      for (const enemy of group.enemies) {
        expect(
          isMossRootPositionWalkable(enemy, ENEMY_TUNING.mossPlun.radius, open),
          `${group.id}:${enemy.x},${enemy.y}`,
        ).toBe(true);
      }
    }
    for (const source of [
      { x: 560, y: 820 },
      { x: 795, y: 830 },
      { x: 475, y: 555 },
      { x: 850, y: 570 },
      { x: 797, y: 373 },
    ]) {
      const abyss = mossRootBackdropSourceToWorld(source);
      expect(isMossRootPositionWalkable(abyss, 1, open), `${source.x},${source.y}`).toBe(false);
    }
  });

  it("uses only the foot contact pixel at red-boundary edges", () => {
    const edgePoint = mossRootBackdropSourceToWorld({ x: 487, y: 1000 });
    const outsidePoint = mossRootBackdropSourceToWorld({ x: 486, y: 1000 });
    expect(isMossRootNavigationPoint(edgePoint)).toBe(true);
    expect(isMossRootPositionWalkable(edgePoint, 9, open)).toBe(true);
    expect(isMossRootPositionWalkable(outsidePoint, 9, open)).toBe(false);
    expect(isMossRootPositionWalkable({ x: -0.1, y: edgePoint.y }, 9, open)).toBe(false);
    expect(isMossRootPositionWalkable({ x: MOSS_ROOT_RUINS.width, y: edgePoint.y }, 9, open)).toBe(false);
  });

  it("keeps only the historical narrow north exit beyond the new red line", () => {
    for (const source of [{ x: 648, y: 20 }, { x: 648, y: 50 }, { x: 648, y: 60 }, { x: 648, y: 70 }]) {
      expect(isMossRootPositionWalkable(mossRootBackdropSourceToWorld(source), 9, open), `${source.x},${source.y}`).toBe(true);
    }
    for (const source of [{ x: 620, y: 20 }, { x: 675, y: 20 }, { x: 600, y: 50 }, { x: 690, y: 50 }]) {
      expect(isMossRootPositionWalkable(mossRootBackdropSourceToWorld(source), 9, open), `${source.x},${source.y}`).toBe(false);
    }
    const plaza = mossRootBackdropSourceToWorld({ x: 648, y: 70 });
    const exit = mossRootBackdropSourceToWorld({ x: 648, y: 20 });
    const reached = resolveMossRootMovement(plaza, exit, 9, open);
    expect(Math.hypot(reached.x - exit.x, reached.y - exit.y)).toBeLessThan(0.01);
  });

  it("reaches newly traced floor in the left curve, stairs, right bridge, and start neck", () => {
    for (const [fromSource, toSource] of [
      [{ x: 374, y: 650 }, { x: 384, y: 650 }],
      [{ x: 622, y: 431 }, { x: 622, y: 441 }],
      [{ x: 1020, y: 545 }, { x: 1020, y: 535 }],
      [{ x: 687, y: 852 }, { x: 687, y: 862 }],
      [{ x: 564, y: 105 }, { x: 564, y: 95 }],
    ]) {
      const from = mossRootBackdropSourceToWorld(fromSource!);
      const target = mossRootBackdropSourceToWorld(toSource!);
      expect(isMossRootPositionWalkable(from, 9, open)).toBe(true);
      expect(isMossRootPositionWalkable(target, 9, open)).toBe(true);
      const moved = resolveMossRootMovement(from, target, 9, open);
      expect(Math.hypot(moved.x - target.x, moved.y - target.y), `${toSource!.x},${toSource!.y}`).toBeLessThan(0.1);
    }
  });

  it("follows the new red bridge edge without adding the old blue correction again", () => {
    for (const source of [{ x: 1015, y: 549 }, { x: 1015, y: 550 }, { x: 1030, y: 550 }, { x: 1030, y: 551 }]) {
      expect(isMossRootPositionWalkable(mossRootBackdropSourceToWorld(source), 9, open), `${source.x},${source.y}`).toBe(true);
    }
    for (const source of [{ x: 1015, y: 551 }, { x: 1030, y: 552 }, { x: 1041, y: 553 }]) {
      expect(isMossRootPositionWalkable(mossRootBackdropSourceToWorld(source), 9, open), `${source.x},${source.y}`).toBe(false);
    }
    const from = mossRootBackdropSourceToWorld({ x: 1015, y: 550 });
    for (const source of [{ x: 1015, y: 565 }, { x: 1055, y: 565 }]) {
      const target = mossRootBackdropSourceToWorld(source);
      const stopped = resolveMossRootMovement(from, target, 9, open);
      expect(isMossRootPositionWalkable(stopped, 9, open)).toBe(true);
      expect(Math.hypot(stopped.x - target.x, stopped.y - target.y)).toBeGreaterThan(8);
    }
  });

  it("replays actual movement along the new traced bridge to the crystal plaza", () => {
    const route = (start: readonly [number, number], goal: readonly [number, number]): [number, number][] => {
      const queue: [number, number][] = [[...start]];
      const parents = new Map<string, string | null>([[start.join(","), null]]);
      let head = 0;
      const destination = goal.join(",");
      while (head < queue.length && !parents.has(destination)) {
        const [x, y] = queue[head++]!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nextX = x + dx;
          const nextY = y + dy;
          const key = `${nextX},${nextY}`;
          if (nextX < 900 || nextX > 1200 || nextY < 475 || nextY > 600 || parents.has(key)) continue;
          if (!isMossRootPositionWalkable(mossRootBackdropSourceToWorld({ x: nextX, y: nextY }), 9, open)) continue;
          parents.set(key, `${x},${y}`);
          queue.push([nextX, nextY]);
        }
      }
      expect(parents.has(destination)).toBe(true);
      const backwards: [number, number][] = [];
      for (let key: string | null = destination; key !== null; key = parents.get(key) ?? null) {
        const [x, y] = key.split(",").map(Number);
        backwards.push([x!, y!]);
      }
      return backwards.reverse();
    };
    const bridgeEdge: [number, number] = [1015, 548];
    const path = [
      ...route([960, 520], bridgeEdge),
      ...route(bridgeEdge, [1131, 525]).slice(1),
    ];
    let position = mossRootBackdropSourceToWorld({ x: path[0]![0], y: path[0]![1] });
    for (const [x, y] of path.slice(1)) {
      const target = mossRootBackdropSourceToWorld({ x, y });
      position = resolveMossRootMovement(position, target, 9, open);
      expect(Math.hypot(position.x - target.x, position.y - target.y), `${x},${y}`).toBeLessThan(0.1);
    }
    const sourcePosition = mossRootBackdropWorldToSource(position);
    expect(sourcePosition.x).toBeCloseTo(1131, 6);
    expect(sourcePosition.y).toBeCloseTo(525, 6);
  });

  it("uses one reversible native-backdrop transform for pixels, collision, and landmarks", () => {
    expect(MOSS_ROOT_BACKDROP_TRANSFORM).toMatchObject({
      sourceWidth: 1295,
      sourceHeight: 1214,
      worldRect: { x: 0, y: 0, width: 2048, height: 1920 },
    });
    expect(MOSS_ROOT_NAV_MASK_META).toMatchObject({
      coordinateSpace: "moss-root-ruins-red-boundary-native-raster",
      sourceWidth: 1295,
      sourceHeight: 1214,
    });
    expect(MOSS_ROOT_NAV_MASK_META.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(mossRootBackdropWorldToSource(MOSS_ROOT_RUINS.crystal)).toEqual({ x: 1160, y: 525 });
    expect(MOSS_ROOT_NAV_MASK_ROWS).toHaveLength(1214);
    expect(MOSS_ROOT_NAV_MASK_ROWS.some((row) => row.length > 1)).toBe(true);
    for (const source of [{ x: 0, y: 0 }, { x: 648, y: 1008 }, { x: 1295, y: 1214 }]) {
      const roundTrip = mossRootBackdropWorldToSource(mossRootBackdropSourceToWorld(source));
      expect(roundTrip.x).toBeCloseTo(source.x, 6);
      expect(roundTrip.y).toBeCloseTo(source.y, 6);
    }
  });

  it("uses the red outline instead of the visible material for navigation", () => {
    const blockedSourcePixels = [
      { x: 800, y: 360 },
      { x: 850, y: 380 },
      { x: 900, y: 405 },
      { x: 840, y: 520 },
      { x: 890, y: 570 },
      { x: 188, y: 130 },
      { x: 283, y: 410 },
      { x: 949, y: 390 },
      { x: 107, y: 680 },
      { x: 437, y: 790 },
      { x: 844, y: 790 },
      { x: 250, y: 985 },
      { x: 1025, y: 980 },
    ];
    for (const source of blockedSourcePixels) {
      const point = mossRootBackdropSourceToWorld(source);
      expect(isMossRootPositionWalkable(point, 8, open), `${source.x},${source.y}`).toBe(false);
    }

    const redInteriorPixels = [
      { x: 648, y: 1098 },
      { x: 648, y: 1000 },
      { x: 700, y: 868 },
      { x: 648, y: 680 },
      { x: 648, y: 390 },
      { x: 202, y: 526 },
      { x: 485, y: 680 },
      { x: 1131, y: 525 },
      { x: 648, y: 235 },
      { x: 648, y: 150 },
    ];
    for (const source of redInteriorPixels) {
      const point = mossRootBackdropSourceToWorld(source);
      expect(isMossRootPositionWalkable(point, 8, open), `${source.x},${source.y}`).toBe(true);
    }
    // The traced floor remains underneath; only the crystal pedestal is solid.
    expect(isMossRootNavigationPoint(MOSS_ROOT_RUINS.crystal)).toBe(true);
    expect(isMossRootPositionWalkable(MOSS_ROOT_RUINS.crystal, 8, open)).toBe(false);
    expect(isMossRootPositionWalkable(mossRootBackdropSourceToWorld({ x: 1190, y: 525 }), 8, open)).toBe(true);
    expect(isMossRootPositionWalkable(mossRootBackdropSourceToWorld({ x: 1220, y: 525 }), 8, open)).toBe(false);
  });

  it("keeps the generated pixel-level route inside the committed red mask", () => {
    expect(MOSS_ROOT_NAV_MASK_META.version).toBe(5);
    expect(mossRootRequiredRoute.version).toBe(4);
    expect(mossRootRequiredRoute.maskSha256).toBe(MOSS_ROOT_NAV_MASK_META.sha256);
    expect(mossRootRequiredRoute.footprintRadiusPixels).toBe(0);
    expect(MOSS_ROOT_NAV_MASK_ROWS.reduce((count, row) => count + row.reduce((sum, [start, end]) => sum + end - start, 0), 0)).toBe(224555);
    expect(mossRootRequiredRoute.points.length).toBeGreaterThan(300);
    for (const routePoint of mossRootRequiredRoute.points) {
      const [x, y] = routePoint as [number, number];
      const worldPoint = mossRootBackdropSourceToWorld({ x, y });
      expect(isMossRootNavigationPoint(worldPoint), `${x},${y}`).toBe(true);
    }
  });

  it("lets an actor footpoint pass both red-interior necks without shrinking combat radius", () => {
    for (const source of [{ x: 313, y: 539 }, { x: 1015, y: 540 }]) {
      const point = mossRootBackdropSourceToWorld(source);
      expect(isMossRootNavigationPoint(point)).toBe(true);
      expect(isMossRootPositionWalkable(point, 9, open)).toBe(true);
      expect(isMossRootPositionWalkable(point, ENEMY_TUNING.mossPlun.radius, open)).toBe(true);
    }
  });

  it("traverses the generated route only after the crystal opens the one root gate", () => {
    const closed = { gateOpen: false, layerGateOpen: false };
    let position = { ...MOSS_ROOT_RUINS.spawn };
    const points = mossRootRequiredRoute.points as [number, number][];
    // The authored route reaches the crystal before its last northward seal crossing.
    for (const [x, y] of points.slice(0, -3)) {
      const target = mossRootBackdropSourceToWorld({ x, y });
      position = resolveMossRootMovement(position, target, 9, closed);
      expect(Math.hypot(position.x - target.x, position.y - target.y), `${x},${y}`).toBeLessThan(1);
      expect(isMossRootNavigationPoint(position), `${x},${y}`).toBe(true);
    }
    const beyond = mossRootBackdropSourceToWorld({ x: 648, y: 235 });
    const stopped = resolveMossRootMovement(position, beyond, 9, closed);
    expect(Math.hypot(stopped.x - beyond.x, stopped.y - beyond.y)).toBeGreaterThan(30);
    for (const [x, y] of points.slice(-3)) {
      const target = mossRootBackdropSourceToWorld({ x, y });
      position = resolveMossRootMovement(position, target, 9, { ...closed, gateOpen: true });
      expect(Math.hypot(position.x - target.x, position.y - target.y), `${x},${y}`).toBeLessThan(1);
    }
    expect(position.y).toBeLessThan(MOSS_ROOT_LANDMARKS.finalPlaza.y);
  });

  it("walks the full new route with GameWorld input, touches the crystal, and triggers the north exit", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.clearAllMossRootEncountersForQa();
    world.mossLayerGateUnlocked = true;
    const closeCurrentDialogue = () => {
      for (let page = 0; page < 8 && world.snapshot.dialogue; page += 1) {
        advance(world, 1.2);
        world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
      }
      expect(world.snapshot.dialogue).toBeNull();
    };
    let touchedCrystal = false;
    let exitDialogue = false;
    let movementFrames = 0;
    for (const [x, y] of (mossRootRequiredRoute.points as [number, number][]).slice(1)) {
      const target = mossRootBackdropSourceToWorld({ x, y });
      let remaining = Math.hypot(world.active.pos.x - target.x, world.active.pos.y - target.y);
      for (let step = 0; remaining > 0.15 && step < 2000; step += 1) {
        const dx = target.x - world.active.pos.x;
        const dy = target.y - world.active.pos.y;
        const delta = Math.min(1 / 60, remaining / world.active.moveSpeed);
        world.update(delta, frame({ x: dx / remaining, y: dy / remaining }));
        movementFrames += 1;
        expect(isMossRootPositionWalkable(world.active.pos, world.active.radius, {
          gateOpen: world.northGateUnlocked,
          layerGateOpen: world.mossLayerGateUnlocked,
        })).toBe(true);
        if (world.snapshot.dialogue?.sourceId === "mossLayerExit") {
          exitDialogue = true;
          break;
        }
        remaining = Math.hypot(world.active.pos.x - target.x, world.active.pos.y - target.y);
      }
      if (exitDialogue) break;
      expect(Math.hypot(world.active.pos.x - target.x, world.active.pos.y - target.y), `${x},${y}`).toBeLessThan(0.15);
      if (x === 1131 && y === 525) {
        world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
        expect(world.snapshot.dialogue?.sourceId).toBe("mossCrystalActivate");
        closeCurrentDialogue();
        advance(world, 3.2);
        closeCurrentDialogue();
        expect(world.northGateUnlocked).toBe(true);
        touchedCrystal = true;
      }
    }
    expect(touchedCrystal).toBe(true);
    expect(exitDialogue).toBe(true);
    expect(movementFrames).toBeGreaterThan(500);
  });

  it("overlays the closed root on the new red floor and opens only after withdrawal", () => {
    expect(MOSS_ROOT_GATE_TRANSFORM.sourceCenter).toEqual({ x: 648, y: 300 });
    expect(MOSS_ROOT_GATE_TRANSFORM.rotation).toBe(0);
    expect(mossRootBackdropWorldToSource(MOSS_ROOT_GATE_TRANSFORM.center)).toEqual(
      expect.objectContaining({ x: 648, y: 300 }),
    );
    const closed = { ...open, gateOpen: false };
    expect(isMossRootPositionWalkable(MOSS_ROOT_GATE_TRANSFORM.center, 8, open)).toBe(true);
    expect(isMossRootNavigationPoint(MOSS_ROOT_GATE_TRANSFORM.center)).toBe(true);
    expect(isMossRootPositionWalkable(MOSS_ROOT_GATE_TRANSFORM.center, 8, closed)).toBe(false);
    const closedMove = resolveMossRootMovement(
      MOSS_ROOT_GATE_TRANSFORM.approach,
      MOSS_ROOT_GATE_TRANSFORM.beyond,
      8,
      closed,
    );
    expect(Math.hypot(closedMove.x - MOSS_ROOT_GATE_TRANSFORM.beyond.x, closedMove.y - MOSS_ROOT_GATE_TRANSFORM.beyond.y)).toBeGreaterThan(30);
  });

  it("keeps the central dark basin blocked while red-lined plazas remain available", () => {
    const options = { gateOpen: false, layerGateOpen: false };
    expect(isMossRootPositionWalkable(mossRootBackdropSourceToWorld({ x: 840, y: 520 }), 8, options)).toBe(false);
    for (const source of [{ x: 648, y: 1000 }, { x: 648, y: 680 }, { x: 648, y: 390 }, { x: 648, y: 150 }]) {
      expect(isMossRootPositionWalkable(mossRootBackdropSourceToWorld(source), 8, options)).toBe(true);
    }
  });

  it("stops a swept actor at the circular-plaza cliff without leaving navigation", () => {
    const start = { ...MOSS_ROOT_LANDMARKS.centralPlaza };
    const chasm = mossRootBackdropSourceToWorld({ x: 797, y: 373 });
    const resolved = resolveMossRootMovement(start, chasm, 9, open);
    expect(Math.hypot(resolved.x - chasm.x, resolved.y - chasm.y)).toBeGreaterThan(24);
    expect(isMossRootPositionWalkable(resolved, 9, open)).toBe(true);
  });

  it("never skips a thin blocked raster band, even with a long movement", () => {
    // Both endpoints are inside separate walkable spans on new native row 675;
    // source pixels 764–770 between them are outside the red trace.
    const from = mossRootBackdropSourceToWorld({ x: 762, y: 675 });
    const across = mossRootBackdropSourceToWorld({ x: 773, y: 675 });
    expect(isMossRootPositionWalkable(from, 9, open)).toBe(true);
    expect(isMossRootPositionWalkable(across, 9, open)).toBe(true);
    const stopped = resolveMossRootMovement(from, across, 9, open);
    expect(isMossRootNavigationPoint(stopped)).toBe(true);
    expect(mossRootBackdropWorldToSource(stopped).x).toBeLessThan(764);
    for (let index = 1; index <= 20; index += 1) {
      const desired = {
        x: from.x + (across.x - from.x) * index / 20,
        y: from.y,
      };
      const step = resolveMossRootMovement(from, desired, 9, open);
      expect(isMossRootNavigationPoint(step)).toBe(true);
      expect(mossRootBackdropWorldToSource(step).x).toBeLessThan(764);
    }
  });

  it("prevents a diagonal shortcut through the waterfall void and projects warps onto red floor", () => {
    const from = mossRootBackdropSourceToWorld({ x: 648, y: 680 });
    const to = mossRootBackdropSourceToWorld({ x: 1160, y: 525 });
    const stopped = resolveMossRootMovement(from, to, 9, open);
    expect(isMossRootNavigationPoint(stopped)).toBe(true);
    expect(Math.hypot(stopped.x - to.x, stopped.y - to.y)).toBeGreaterThan(100);
    const voidPosition = mossRootBackdropSourceToWorld({ x: 850, y: 570 });
    const projected = findNearestMossRootWalkablePosition(voidPosition, 12, open);
    expect(projected).not.toBeNull();
    expect(isMossRootPositionWalkable(projected!, 12, open)).toBe(true);
  });

  it("keeps authored plaza destinations within the red-native raster", () => {
    for (const destination of [
      MOSS_ROOT_LANDMARKS.introPlaza,
      MOSS_ROOT_LANDMARKS.centralPlaza,
      MOSS_ROOT_LANDMARKS.waterRuins,
      mossRootBackdropSourceToWorld({ x: 1131, y: 525 }),
      MOSS_ROOT_LANDMARKS.finalPlaza,
    ]) {
      expect(isMossRootPositionWalkable(destination, 8, open), `${destination.x},${destination.y}`).toBe(true);
    }
  });

  it("keeps every encounter spawn on walkable red-interior ground", () => {
    for (const group of MOSS_ROOT_ENCOUNTERS) {
      for (const enemy of group.enemies) {
        expect(
          isMossRootPositionWalkable(enemy, ENEMY_TUNING.mossPlun.radius, open),
          `${group.id}:${enemy.x},${enemy.y}`,
        ).toBe(true);
      }
    }
  });

  it("retains the long continuous static red-floor route", () => {
    expect(mossRootRequiredRoute.points.length).toBeGreaterThan(500);
  });

  it("blocks the closed root in both directions, including high-speed and diagonal movement", () => {
    const closed = resolveMossRootMovement(
      MOSS_ROOT_GATE_TRANSFORM.approach,
      MOSS_ROOT_GATE_TRANSFORM.beyond,
      9,
      { gateOpen: false },
    );
    expect(Math.hypot(closed.x - MOSS_ROOT_GATE_TRANSFORM.beyond.x, closed.y - MOSS_ROOT_GATE_TRANSFORM.beyond.y)).toBeGreaterThan(30);
    const reverse = resolveMossRootMovement(MOSS_ROOT_GATE_TRANSFORM.beyond, MOSS_ROOT_GATE_TRANSFORM.approach, 9, { gateOpen: false });
    expect(Math.hypot(reverse.x - MOSS_ROOT_GATE_TRANSFORM.approach.x, reverse.y - MOSS_ROOT_GATE_TRANSFORM.approach.y)).toBeGreaterThan(30);
    const diagonal = resolveMossRootMovement(
      { x: MOSS_ROOT_GATE_TRANSFORM.approach.x - 12, y: MOSS_ROOT_GATE_TRANSFORM.approach.y },
      { x: MOSS_ROOT_GATE_TRANSFORM.beyond.x + 12, y: MOSS_ROOT_GATE_TRANSFORM.beyond.y },
      9,
      { gateOpen: false },
    );
    expect(diagonal.y).toBeGreaterThan(MOSS_ROOT_GATE_TRANSFORM.center.y + MOSS_ROOT_GATE_TRANSFORM.collision.height / 2);
    const opened = resolveMossRootMovement(
      MOSS_ROOT_GATE_TRANSFORM.approach,
      MOSS_ROOT_GATE_TRANSFORM.beyond,
      9,
      { gateOpen: true },
    );
    expect(Math.hypot(opened.x - MOSS_ROOT_GATE_TRANSFORM.beyond.x, opened.y - MOSS_ROOT_GATE_TRANSFORM.beyond.y)).toBeLessThan(8);

    expect(isMossRootPositionWalkable({ x: 1024, y: 64 }, 1, {
      gateOpen: true,
      layerGateOpen: false,
    })).toBe(true);
    expect(isMossRootPositionWalkable({ x: 1024, y: 64 }, 1, {
      gateOpen: true,
      layerGateOpen: true,
    })).toBe(true);
  });

  it("has no red-interior path around either end of the closed northern root", () => {
    const width = MOSS_ROOT_BACKDROP_TRANSFORM.sourceWidth;
    const height = MOSS_ROOT_BACKDROP_TRANSFORM.sourceHeight;
    const queue = new Int32Array(width * height);
    const visited = new Uint8Array(width * height);
    const start = 360 * width + 648;
    const destination = 235 * width + 648;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    while (head < tail && !visited[destination]) {
      const current = queue[head++]!;
      const y = Math.floor(current / width);
      const x = current - y * width;
      for (const [nextX, nextY] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
        if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
        const next = nextY * width + nextX;
        if (visited[next]) continue;
        visited[next] = 1;
        if (!isMossRootPositionWalkable(mossRootBackdropSourceToWorld({ x: nextX, y: nextY }), 9, { gateOpen: false })) continue;
        queue[tail++] = next;
      }
    }
    expect(visited[destination]).toBe(0);
    expect(tail).toBeGreaterThan(10000);
  });
});

describe("lightwing crystal cavern", () => {
  const lightwingTileOf = (point: { x: number; y: number }): [number, number] => [
    Math.floor(point.x / LIGHTWING_CRYSTAL_CAVERN.tileSize),
    Math.floor(point.y / LIGHTWING_CRYSTAL_CAVERN.tileSize),
  ];

  it("defines the 2304x1344 horizontal layer and fourteen enemies in five isolated groups", () => {
    expect(LIGHTWING_CRYSTAL_CAVERN.width).toBe(2304);
    expect(LIGHTWING_CRYSTAL_CAVERN.height).toBe(1344);
    expect(LIGHTWING_CRYSTAL_CAVERN_TILES).toHaveLength(42);
    expect(LIGHTWING_CRYSTAL_CAVERN_TILES.every((row) => row.length === 72)).toBe(true);
    expect(LIGHTWING_CRYSTAL_CAVERN.cameraBounds).toEqual({ left: 0, top: 0, right: 1664, bottom: 984 });
    expect(LIGHTWING_ENCOUNTERS.map((group) => group.enemies.length)).toEqual([1, 3, 2, 4, 4]);
    expect(LIGHTWING_ENCOUNTERS.flatMap((group) => group.enemies)).toHaveLength(14);
  });

  it("uses the user's native red outline for the entrance, two plazas, bridge, far shore, and water", () => {
    for (const [x, y] of [[475, 900], [300, 194], [170, 630], [570, 431], [1415, 245], [1456, 110]] as const) {
      expect(lightwingNavigationSourcePixel(x, y, false), `${x},${y}`).toBe(true);
    }
    expect(lightwingNavigationSourcePixel(950, 380, false)).toBe(false);
    expect(lightwingNavigationSourcePixel(950, 380, true)).toBe(true);
    for (const [x, y] of [[900, 600], [565, 375], [950, 350], [950, 430], [20, 20]] as const) {
      expect(lightwingNavigationSourcePixel(x, y, true), `${x},${y}`).toBe(false);
    }
  });

  it("keeps all authored Layer 2 homes on safe plaza floor and reuses them as enemy anchors", () => {
    for (const group of LIGHTWING_ENCOUNTERS) {
      const occupied: { pos: { x: number; y: number }; radius: number }[] = [];
      for (const entry of group.enemies) {
        const radius = ENEMY_TUNING[entry.kind].radius;
        expect(isLightwingEnemySpawnSafe(entry.pos, radius, occupied), `${group.id}:${entry.kind}:${entry.pos.x},${entry.pos.y}`).toBe(true);
        expect(findNearestSafeLightwingEnemySpawn(entry.pos, radius, entry.kind, occupied), `${group.id}:${entry.kind}`).toEqual(entry.pos);
        occupied.push({ pos: entry.pos, radius });
      }
    }
    const corrected = findNearestSafeLightwingEnemySpawn(
      LIGHTWING_CRYSTAL_CAVERN.primaryCrystal,
      ENEMY_TUNING.lumibane.radius,
      "lumibane",
    );
    expect(corrected).not.toBeNull();
    expect(corrected).not.toEqual(LIGHTWING_CRYSTAL_CAVERN.primaryCrystal);
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "lightwingCrystalCavern" });
    for (const enemy of world.enemies) {
      expect(isLightwingEnemySpawnSafe(enemy.idleAnchor, enemy.radius)).toBe(true);
      expect(enemy.pos).toEqual(enemy.idleAnchor);
      expect(enemy.reservedPos).toEqual(enemy.idleAnchor);
    }
  });

  it("uses entry-connected flood fill for Layer 2 homes, including the unlocked nest route", () => {
    for (const group of LIGHTWING_ENCOUNTERS) {
      const reachable = lightwingReachableTiles({ crystalPathUnlocked: group.id === "lightwingNest", layerGateOpen: false });
      const occupied: { pos: { x: number; y: number }; radius: number }[] = [];
      for (const entry of group.enemies) {
        const radius = ENEMY_TUNING[entry.kind].radius;
        expect(isLightwingEnemySpawnSafe(entry.pos, radius, occupied, reachable), `${group.id}:${entry.kind}`).toBe(true);
        occupied.push({ pos: entry.pos, radius });
      }
    }
  });

  it("keeps the crystal-platform crossing locked until both crystals are active", () => {
    const bridgePoint = lightwingSourceToWorld({ x: 950, y: 380 });
    const platform = lightwingTileOf(bridgePoint);
    expect(lightwingTileAt(...platform)).toBe("platformLocked");
    expect(isLightwingTileWalkable(lightwingTileAt(...platform), false, false)).toBe(false);
    expect(isLightwingTileWalkable(lightwingTileAt(...platform), true, false)).toBe(true);
    expect(isLightwingPositionWalkable(bridgePoint, 1, { crystalPathUnlocked: false })).toBe(false);
    expect(isLightwingPositionWalkable(bridgePoint, 1, { crystalPathUnlocked: true })).toBe(true);
  });

  it("replays footpoint movement from the south entrance to both crystals and the spring, then across the bridge to the exit", () => {
    const width = 1638;
    const height = 960;
    const start = [475, 900] as const;
    const routeTo = (goalX: number, goalY: number, unlocked: boolean): number[] | null => {
      const previous = new Int32Array(width * height).fill(-1);
      const queue = new Int32Array(width * height);
      const startIndex = start[1] * width + start[0];
      const goalIndex = goalY * width + goalX;
      queue[0] = startIndex;
      previous[startIndex] = startIndex;
      let head = 0;
      let tail = 1;
      while (head < tail && previous[goalIndex]! < 0) {
        const index = queue[head++]!;
        const x = index % width;
        const y = Math.floor(index / width);
        for (const next of [index - 1, index + 1, index - width, index + width]) {
          if (next < 0 || next >= previous.length || previous[next]! >= 0) continue;
          const nx = next % width;
          const ny = Math.floor(next / width);
          if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;
          const point = lightwingSourceToWorld({ x: nx + 0.5, y: ny + 0.5 });
          if (!isLightwingPositionWalkable(point, 9, { crystalPathUnlocked: unlocked })) continue;
          previous[next] = index;
          queue[tail++] = next;
        }
      }
      if (previous[goalIndex]! < 0) return null;
      const result: number[] = [];
      for (let index = goalIndex; index !== startIndex; index = previous[index]!) result.push(index);
      result.push(startIndex);
      return result.reverse();
    };
    for (const [name, x, y] of [
      ["upper crystal", 338, 205], ["lower crystal", 204, 638], ["spring", 570, 431],
    ] as const) {
      const route = routeTo(x, y, false);
      expect(route, name).not.toBeNull();
      let position = lightwingSourceToWorld({ x: start[0] + 0.5, y: start[1] + 0.5 });
      for (const index of route!.slice(1)) {
        const desired = lightwingSourceToWorld({ x: index % width + 0.5, y: Math.floor(index / width) + 0.5 });
        position = resolveLightwingMovement(position, desired, 9, { crystalPathUnlocked: false });
        expect(Math.hypot(position.x - desired.x, position.y - desired.y), `${name}:${index}`).toBeLessThan(0.01);
      }
    }
    expect(routeTo(1415, 245, false)).toBeNull();
    for (const [name, x, y] of [["far shore", 1415, 245], ["exit", 1456, 110]] as const) {
      const route = routeTo(x, y, true);
      expect(route, name).not.toBeNull();
      let position = lightwingSourceToWorld({ x: start[0] + 0.5, y: start[1] + 0.5 });
      for (const index of route!.slice(1)) {
        const desired = lightwingSourceToWorld({ x: index % width + 0.5, y: Math.floor(index / width) + 0.5 });
        position = resolveLightwingMovement(position, desired, 9, { crystalPathUnlocked: true });
        expect(Math.hypot(position.x - desired.x, position.y - desired.y), `${name}:${index}`).toBeLessThan(0.01);
      }
    }
    const bridge = lightwingSourceToWorld({ x: 950, y: 380 });
    const escaped = resolveLightwingMovement(bridge, lightwingSourceToWorld({ x: 950, y: 600 }), 9, { crystalPathUnlocked: true });
    expect(escaped.y).toBeLessThan(lightwingSourceToWorld({ x: 950, y: 430 }).y);
    expect(isLightwingPositionWalkable({ x: -1, y: 200 }, 9, { crystalPathUnlocked: true })).toBe(false);
  });

  it("assigns every locked crystal-platform tile to a staged reveal", () => {
    LIGHTWING_CRYSTAL_CAVERN_TILES.forEach((row, y) => {
      row.forEach((tile, x) => {
        if (tile === "platformLocked") {
          expect(lightwingPlatformRiseStepAt(x, y)).not.toBeNull();
        }
      });
    });
  });

  it("preserves the south return route, far exit floor, and lake collision", () => {
    const gate = LIGHTWING_CRYSTAL_CAVERN.layerGate;
    expect(isLightwingPositionWalkable(gate, 1, { crystalPathUnlocked: true, layerGateOpen: false })).toBe(true);
    expect(isLightwingPositionWalkable(gate, 1, { crystalPathUnlocked: true, layerGateOpen: true })).toBe(true);
    expect(isLightwingPositionWalkable(LIGHTWING_CRYSTAL_CAVERN.returnGateInnerSpawn, 9, {
      crystalPathUnlocked: false,
    })).toBe(true);
    const start = lightwingSourceToWorld({ x: 760, y: 395 });
    const waterBlocked = resolveLightwingMovement(start, lightwingSourceToWorld({ x: 950, y: 380 }), 9, { crystalPathUnlocked: false });
    expect(waterBlocked.x).toBeLessThan(lightwingSourceToWorld({ x: 800, y: 380 }).x);
  });

  it("starts Layer 2 in solo exploration with its own camera and enemy population", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "lightwingCrystalCavern" });
    expect(world.snapshot.stageLayer).toBe("lightwingCrystalCavern");
    expect(world.snapshot.partyPresence).toBe("solo");
    expect(world.enemies).toHaveLength(14);
    expect(world.snapshot.camera).toMatchObject({ x: 348, y: 984 });
    expect(lightwingTileOf(LIGHTWING_CRYSTAL_CAVERN.spawn)).toEqual([20, 39]);
    expect(isLightwingPositionWalkable(LIGHTWING_CRYSTAL_CAVERN.spawn, 9, { crystalPathUnlocked: false })).toBe(true);
    expect(isLightwingReachable(LIGHTWING_CRYSTAL_CAVERN.spawn, LIGHTWING_ENCOUNTERS[0]!.enemies[0]!.pos)).toBe(true);
    expect(Math.hypot(
      LIGHTWING_CRYSTAL_CAVERN.spawn.x - LIGHTWING_ENCOUNTERS[0]!.enemies[0]!.pos.x,
      LIGHTWING_CRYSTAL_CAVERN.spawn.y - LIGHTWING_ENCOUNTERS[0]!.enemies[0]!.pos.y,
    )).toBeGreaterThan(150);
  });

  it("keeps the compact lake sanctuary solid, then heals exactly once through its four visual phases", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "lightwingCrystalCavern" });
    const spring = LIGHTWING_CRYSTAL_CAVERN.spring;
    expect(isLightwingPositionWalkable(spring, 9, { crystalPathUnlocked: false, solidProps: LIGHTWING_SOLID_PROPS })).toBe(false);
    for (const shoreStone of [lightwingSourceToWorld({ x: 530, y: 424 }), lightwingSourceToWorld({ x: 570, y: 431 }), lightwingSourceToWorld({ x: 620, y: 445 })]) {
      expect(isLightwingPositionWalkable(shoreStone, 4, { crystalPathUnlocked: false, solidProps: LIGHTWING_SOLID_PROPS })).toBe(true);
    }

    world.setLightwingSpringForQa("downed-member");
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(world.snapshot.dialogue?.sourceId).toBe("lightwingSpringIntro");
    closeDialogue(world);
    expect(world.snapshot.healingSpringPhase).toBe("charging");
    expect(world.drainAudioEvents().filter((event) => event.kind === "healingSpringActivate")).toHaveLength(1);

    const seenPhases = new Set<string>();
    const audioKinds: string[] = [];
    for (let index = 0; index < 180; index += 1) {
      seenPhases.add(world.snapshot.healingSpringPhase);
      world.update(1 / 60, frame());
      audioKinds.push(...world.drainAudioEvents().map((event) => event.kind));
    }
    seenPhases.add(world.snapshot.healingSpringPhase);
    for (const phase of ["charging", "healing", "afterglow", "idle"]) expect(seenPhases.has(phase)).toBe(true);
    expect(audioKinds.filter((kind) => kind === "healingSpringComplete")).toHaveLength(1);
    expect(audioKinds.some((kind) => kind === "ability")).toBe(false);
    for (const member of world.party) {
      expect(member.hp).toBe(member.maxHp);
      expect(member.mp).toBe(member.maxMp);
      expect(member.downed).toBe(false);
    }
    expect(world.snapshot.dialogue?.sourceId).toBe("lightwingSpringResult");

    const combatWorld = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "lightwingCrystalCavern" });
    combatWorld.setLightwingSpringForQa("damaged-party");
    combatWorld.stageEncounter = "active";
    combatWorld.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(combatWorld.snapshot.healingSpringPhase).toBe("idle");
    expect(combatWorld.banner).toBe("戦闘中は晶泉に集中できない。");
  });
});

describe("stage camera", () => {
  it("keeps a dead zone, follows beyond it, and clamps to all world edges", () => {
    const camera = new StageCamera(MOSS_ROOT_RUINS);
    camera.snapTo(MOSS_ROOT_LANDMARKS.centralPlaza);
    const initial = camera.snapshot;
    camera.update({ x: 1030, y: 645 }, 1 / 60);
    expect(camera.snapshot).toEqual(initial);
    for (let index = 0; index < 60; index += 1) {
      camera.update({ x: 1320, y: 900 }, 1 / 60);
    }
    expect(camera.snapshot.x).toBeGreaterThan(initial.x);
    camera.snapTo({ x: -100, y: -100 });
    expect(camera.snapshot).toMatchObject({ x: 0, y: 0 });
    camera.snapTo({ x: 2000, y: 2000 });
    expect(camera.snapshot).toMatchObject({ x: 1408, y: 1560 });
  });

  it("keeps non-adjacent landmark centers outside each 640x360 QA view", () => {
    const camera = new StageCamera(MOSS_ROOT_RUINS);
    const visible = (point: { x: number; y: number }) => {
      const view = camera.snapshot;
      return point.x >= view.x && point.x <= view.x + view.viewportWidth &&
        point.y >= view.y && point.y <= view.y + view.viewportHeight;
    };
    camera.snapTo(MOSS_ROOT_RUINS.spawn);
    expect(visible(MOSS_ROOT_LANDMARKS.centralPlaza)).toBe(false);
    expect(MOSS_ROOT_ENCOUNTERS[0]!.enemies.some((enemy) => visible(enemy))).toBe(true);
    camera.snapTo(MOSS_ROOT_LANDMARKS.centralPlaza);
    expect(visible(MOSS_ROOT_LANDMARKS.deadEnd)).toBe(false);
    expect(visible(MOSS_ROOT_LANDMARKS.rightPlaza)).toBe(false);
    camera.snapTo(MOSS_ROOT_LANDMARKS.finalPlaza);
    expect(visible(MOSS_ROOT_LANDMARKS.transferPlaza)).toBe(false);
    expect(visible(MOSS_ROOT_LANDMARKS.centralPlaza)).toBe(false);
  });
});

describe("moss-root exploration and encounters", () => {
  const open = { gateOpen: true, layerGateOpen: true };
  it("starts in one continuous layer while arena remains fixed", () => {
    const stage = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    const arena = new GameWorld({ initialPhase: "playing", mode: "arena" });
    expect(stage.roomId).toBe("mossRootRuins");
    expect(stage.roomName).toBe("晶界・苔根の遺構");
    expect(stage.snapshot.stageLayer).toBe("mossRootRuins");
    expect(stage.snapshot.partyPresence).toBe("solo");
    expect(stage.enemies).toHaveLength(10);
    expect(arena.snapshot.camera).toMatchObject({ x: 0, y: 0 });
    expect(arena.snapshot.partyPresence).toBe("formation");
    expect(arena.enemies).toHaveLength(3);
  });

  it("does not offer a DEV warp at the former Layer 1 start-corridor position", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    const formerWarp = mossRootBackdropSourceToWorld({ x: 648, y: 1120 });
    const reached = resolveMossRootMovement(world.active.pos, formerWarp, world.active.radius, { gateOpen: false });
    expect(Math.hypot(reached.x - formerWarp.x, reached.y - formerWarp.y)).toBeLessThan(1);
    world.active.pos = reached;
    world.update(1 / 60, frame());
    expect(world.snapshot.interactionPrompt).toBeNull();
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(world.snapshot.dialogue).toBeNull();
    expect(world.roomId).toBe("mossRootRuins");
  });

  it("switches the solo explorer at the same world position without moving the camera", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.northGateUnlocked = true;
    for (let index = 0; index < 20; index += 1) world.update(1 / 60, frame({ x: 1, y: 0 }));
    const before = { ...world.active.pos };
    const cameraBefore = world.snapshot.camera;
    expect(world.switchCharacter(true)).toBe(true);
    expect(world.active.pos).toEqual(before);
    expect(world.snapshot.camera).toEqual(cameraBefore);
    expect(world.attacks.filter((attack) => attack.active)).toHaveLength(0);
  });

  it("opens the root gate without a room transition and lets the player walk north", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.setMossRootEncounterForQa("mossDeadEnd", "cleared");
    world.active.pos = { x: MOSS_ROOT_RUINS.crystal.x - 46, y: MOSS_ROOT_RUINS.crystal.y };
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(world.snapshot.dialogue?.sourceId).toBe("mossCrystalActivate");
    closeDialogue(world);
    expect(world.drainAudioEvents().filter((event) => event.kind === "crystalActivate")).toHaveLength(1);
    expect(world.drainAudioEvents().filter((event) => event.kind === "rootGateOpen")).toHaveLength(0);
    expect(world.northGateUnlocked).toBe(false);
    for (let index = 0; index < 40; index += 1) world.update(1 / 60, frame());
    expect(world.drainAudioEvents().filter((event) => event.kind === "rootGateOpen")).toHaveLength(1);
    expect(world.snapshot.gateUnlockProgress).toBeGreaterThan(0);
    expect(world.northGateUnlocked).toBe(false);
    expect(isMossRootPositionWalkable(MOSS_ROOT_LANDMARKS.rootGate, 0, { gateOpen: world.northGateUnlocked })).toBe(false);
    for (let index = 0; index < 150; index += 1) world.update(1 / 60, frame());
    expect(world.northGateUnlocked).toBe(true);
    expect(world.roomId).toBe("mossRootRuins");
    expect(world.roomTransitionOpacity).toBe(0);
    closeDialogue(world);
    world.active.pos = { ...MOSS_ROOT_GATE_TRANSFORM.approach };
    for (let index = 0; index < 110; index += 1) {
      world.update(1 / 60, frame(MOSS_ROOT_GATE_TRANSFORM.routeDirection));
    }
    expect(Math.hypot(
      world.active.pos.x - MOSS_ROOT_GATE_TRANSFORM.beyond.x,
      world.active.pos.y - MOSS_ROOT_GATE_TRANSFORM.beyond.y,
    )).toBeLessThan(46);
  });

  it("shows crystal guidance outside the pedestal and suppresses it during combat", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.setMossRootEncounterForQa("mossDeadEnd", "cleared");
    world.active.pos = { x: MOSS_ROOT_RUINS.crystal.x - 74, y: MOSS_ROOT_RUINS.crystal.y };
    world.update(1 / 60, frame());
    expect(world.banner).toBe("クリスタルがまばゆい光を放っている");
    world.active.pos = { x: MOSS_ROOT_RUINS.crystal.x - 46, y: MOSS_ROOT_RUINS.crystal.y };
    for (let index = 0; index < 76; index += 1) world.update(1 / 60, frame());
    expect(world.snapshot.interactionPrompt).toBe("E　クリスタルに触れる");
    world.setMossRootEncounterForQa("mossIntro", "active");
    world.active.pos = { x: MOSS_ROOT_RUINS.crystal.x - 46, y: MOSS_ROOT_RUINS.crystal.y };
    world.update(1 / 60, frame());
    expect(world.snapshot.interactionPrompt).toBeNull();
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(world.northGateUnlocked).toBe(false);
  });

  it("blocks only the crystal's ground pedestal, even after the root opens", () => {
    const options = {
      gateOpen: true,
      layerGateOpen: true,
      solidProps: MOSS_ROOT_SOLID_PROPS,
    };
    const crystalBase = MOSS_ROOT_SOLID_PROPS.find((prop) => prop.id === "transferCrystal")!;
    const westArch = MOSS_ROOT_SOLID_PROPS.find((prop) => prop.id === "westRuinArch")!;
    expect(mossRootBackdropWorldToSource(crystalBase.center)).toEqual({ x: 1160, y: 535 });
    expect(crystalBase.radiusX / MOSS_ROOT_RUINS.width * 1295).toBeCloseTo(23);
    expect(crystalBase.radiusY / MOSS_ROOT_RUINS.height * 1214).toBeCloseTo(14);
    expect(isMossRootNavigationPoint(crystalBase.center)).toBe(true);
    for (const gateOpen of [false, true]) {
      expect(isMossRootPositionWalkable(crystalBase.center, 9, { ...options, gateOpen })).toBe(false);
      expect(isMossRootPositionWalkable(MOSS_ROOT_RUINS.crystal, 9, { ...options, gateOpen })).toBe(false);
    }
    // Decorative arches do not acquire collision just because they share the prop list.
    expect(isMossRootPositionWalkable(westArch.center, 9, options))
      .toBe(isMossRootNavigationPoint(westArch.center));
    const left = mossRootBackdropSourceToWorld({ x: 1125, y: 535 });
    const right = mossRootBackdropSourceToWorld({ x: 1195, y: 535 });
    expect(isMossRootPositionWalkable(left, 9, options)).toBe(true);
    expect(isMossRootPositionWalkable(right, 9, options)).toBe(true);
    for (const [from, to] of [[left, right], [right, left]] as const) {
      const stopped = resolveMossRootMovement(from, to, 9, options);
      expect(isMossRootPositionWalkable(stopped, 9, options)).toBe(true);
      expect(Math.hypot(stopped.x - to.x, stopped.y - to.y)).toBeGreaterThan(30);
    }
    const projected = findNearestMossRootWalkablePosition(crystalBase.center, 9, options);
    expect(projected).not.toBeNull();
    expect(isMossRootPositionWalkable(projected!, 9, options)).toBe(true);
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.active.pos = { x: MOSS_ROOT_RUINS.crystal.x - 46, y: MOSS_ROOT_RUINS.crystal.y };
    expect(world.switchCharacter(true)).toBe(true);
    for (let index = 0; index < 12; index += 1) world.update(1 / 60, frame({ x: -1, y: 0 }));
    expect(isMossRootPositionWalkable(world.active.pos, world.active.radius, options)).toBe(true);
  });

  it("does not activate a second puzzle at the former small monument", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.active.pos = mossRootBackdropSourceToWorld({ x: 202, y: 526 });
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(world.snapshot.dialogue).toBeNull();
    expect(world.snapshot.interactionPrompt).toBeNull();
    expect(world.northGateUnlocked).toBe(false);
  });

  it("keeps Layer 1 free of healing-spring interaction after the redesign", () => {
    const formerSpring = mossRootBackdropSourceToWorld({ x: 648, y: 680 });
    expect(isMossRootPositionWalkable(formerSpring, 9, {
      gateOpen: true,
      layerGateOpen: true,
      solidProps: MOSS_ROOT_SOLID_PROPS,
    })).toBe(true);
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.active.pos = formerSpring;
    const hpBefore = world.active.hp;
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(world.snapshot.interactionPrompt).toBeNull();
    expect(world.snapshot.dialogue).toBeNull();
    expect(world.active.hp).toBe(hpBefore);
  });

  it("activates only the detected group and expands the battle formation", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.northGateUnlocked = true;
    world.active.pos = { ...MOSS_ROOT_ENCOUNTERS[0]!.enemies[0]! };
    for (let index = 0; index < 20; index += 1) world.update(1 / 60, frame());
    expect(world.activeEncounterGroupId).toBe("mossIntro");
    expect(world.encounterStates.mossIntro).toBe("active");
    expect(world.snapshot.partyPresence).toBe("formation");
    expect(world.snapshot.encounterTotal).toBe(3);
    expect(world.snapshot.encounterAlive).toBe(3);
    expect(enemiesFor(world, "mossIntro").every((enemy) => enemy.aware)).toBe(true);
    expect(enemiesFor(world, "mossFork").every((enemy) => !enemy.aware && enemy.aiState === "idle")).toBe(true);
    expect(enemiesFor(world, "mossDeadEnd").every((enemy) => !enemy.aware && enemy.aiState === "idle")).toBe(true);
    expect(enemiesFor(world, "mossGate").every((enemy) => !enemy.aware && enemy.aiState === "idle")).toBe(true);
  });

  it("uses one shared attacker token and keeps an encounter group separated", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.setMossRootEncounterForQa("mossIntro", "active");
    world.active.pos = { ...MOSS_ROOT_LANDMARKS.introPlaza };
    for (const member of world.party) member.invulnerable = 999;
    let maxTokens = 0;
    let minimumGap = Number.POSITIVE_INFINITY;
    for (let index = 0; index < 720; index += 1) {
      world.update(1 / 60, frame());
      const group = enemiesFor(world, "mossIntro").filter((enemy) => enemy.alive);
      maxTokens = Math.max(maxTokens, group.filter((enemy) => enemy.hasAttackToken).length);
      for (let first = 0; first < group.length; first += 1) {
        for (let second = first + 1; second < group.length; second += 1) {
          minimumGap = Math.min(minimumGap, Math.hypot(
            group[first]!.pos.x - group[second]!.pos.x,
            group[first]!.pos.y - group[second]!.pos.y,
          ));
        }
      }
    }
    expect(maxTokens).toBeLessThanOrEqual(1);
    expect(minimumGap).toBeGreaterThanOrEqual(24);
  });

  it("keeps party and enemies inside the raster mask throughout every Layer 1 encounter", () => {
    for (const group of MOSS_ROOT_ENCOUNTERS) {
      const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
      world.setMossRootEncounterForQa(group.id, "active");
      for (const member of world.party) member.invulnerable = 999;
      for (let frameIndex = 0; frameIndex < 240; frameIndex += 1) {
        world.update(1 / 60, frame());
        for (const member of world.party.filter((candidate) => !candidate.downed)) {
          expect(
            isMossRootPositionWalkable(member.pos, member.radius, open),
            `${group.id}:party:${member.id}@${member.pos.x},${member.pos.y}`,
          ).toBe(true);
        }
        for (const enemy of world.enemies.filter((candidate) => candidate.alive)) {
          expect(
            isMossRootPositionWalkable(enemy.pos, enemy.radius, open),
            `${group.id}:enemy:${enemy.id}@${enemy.pos.x},${enemy.pos.y}`,
          ).toBe(true);
        }
      }
    }
  });

  it("projects the central-basin QA party onto real floor while keeping the basin blocked", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.setStageCameraQa("nav-water");
    const basin = mossRootBackdropSourceToWorld({ x: 850, y: 570 });
    expect(isMossRootPositionWalkable(basin, 1, open)).toBe(false);
    for (const member of world.party) {
      expect(isMossRootPositionWalkable(member.pos, member.radius, open)).toBe(true);
    }
  });

  it("has no stage battle barriers and keeps every deployed formation on walkable tiles", () => {
    for (const group of MOSS_ROOT_ENCOUNTERS) {
      expect("barriers" in group).toBe(false);
      const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
      world.setMossRootEncounterForQa(group.id, "active");
      for (const member of world.party) {
        expect(isMossRootPositionWalkable(member.pos, member.radius, {
          gateOpen: true,
        }), `${group.id}:${member.id}@${member.pos.x},${member.pos.y}`).toBe(true);
      }
    }
  });

  it("requires the full distance hold before disengaging, then returns to solo exploration", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.setMossRootDisengageForQa("mossIntro");
    for (let index = 0; index < 41; index += 1) world.update(1 / 60, frame());
    expect(world.snapshot.activeEncounter).toBe("mossIntro");
    expect(world.snapshot.disengageProgress).toBeLessThan(1);
    for (let index = 0; index < 2; index += 1) world.update(1 / 60, frame());
    expect(world.stageEncounter).toBe("dormant");
    expect(world.activeEncounterGroupId).toBeNull();
    expect(world.encounterStates.mossIntro).toBe("dormant");
    expect(world.snapshot.partyPresence).toBe("solo");
    expect(musicTrackForPartyPresence(world.partyPresence)).toBe("exploration");
  });

  it("does not disengage while any living encounter enemy remains within range", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.setMossRootEncounterForQa("mossIntro", "active");
    world.active.pos = { ...MOSS_ROOT_LANDMARKS.introPlaza };
    for (let index = 0; index < 60; index += 1) world.update(1 / 60, frame());
    expect(world.stageEncounter).toBe("active");
    expect(world.snapshot.disengageProgress).toBe(0);
    expect(musicTrackForPartyPresence(world.partyPresence)).toBe("battle");
  });

  it("keeps a partially defeated disengaged group unchanged while its presentation remains visible", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.setMossRootPartialDisengageForQa("edge");
    const group = enemiesFor(world, "mossIntro");
    const firstEnemy = group[0]!;
    expect(firstEnemy.alive).toBe(false);
    const expAfterFirstDefeat = world.exp;
    expect(expAfterFirstDefeat).toBeGreaterThan(0);

    advance(world, STAGE_ENCOUNTER.disengageHold + 0.5);
    expect(world.encounterStates.mossIntro).toBe("dormant");
    expect(world.partyPresence).toBe("solo");
    expect(world.musicScene).toBe("exploration");
    const survivorPositions = group.slice(1).map((enemy) => ({ ...enemy.pos }));

    // Even after the seven-second minimum, neither a dead body nor a survivor
    // may visibly pop back to its authored home while the group edge is seen.
    advance(world, 8);
    expect(firstEnemy.alive).toBe(false);
    expect(group.slice(1).every((enemy) => enemy.alive)).toBe(true);
    expect(group.slice(1).map((enemy) => enemy.pos)).toEqual(survivorPositions);
    expect(firstEnemy.expGranted).toBe(true);
    expect(world.musicScene).toBe("exploration");
  });

  it("rebuilds a partially defeated group only after the full offscreen hold", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.setMossRootPartialDisengageForQa("far");
    const group = enemiesFor(world, "mossIntro");
    const firstEnemy = group[0]!;
    const expAfterFirstDefeat = world.exp;

    advance(world, 7.25);
    expect(world.encounterStates.mossIntro).toBe("dormant");
    expect(firstEnemy.alive).toBe(false);

    // Returning before 0.65 seconds clears the accumulated offscreen hold.
    world.setMossRootRespawnViewForQa("edge");
    advance(world, FIELD_ENEMY_RESPAWN_OFFSCREEN_HOLD + 0.2);
    expect(firstEnemy.alive).toBe(false);

    world.setMossRootRespawnViewForQa("far");
    advance(world, FIELD_ENEMY_RESPAWN_OFFSCREEN_HOLD + 0.1);
    expect(group.every((enemy) => enemy.alive && enemy.hp === enemy.maxHp)).toBe(true);
    expect(group.every((enemy) => enemy.aiState === "idle" && !enemy.hasAttackToken)).toBe(true);
    expect(firstEnemy.expGranted).toBe(true);
    expect(world.exp).toBe(expAfterFirstDefeat);
    expect(world.musicScene).toBe("exploration");
  });

  it("uses the same deferred partial-disengage reset on Layers 2 and 3", () => {
    const layer2 = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "lightwingCrystalCavern" });
    layer2.setFieldEnemyPartialDisengageForQa("lightwingDraft", { x: 2080, y: 320 });
    const lightwing = lightwingEnemiesFor(layer2, "lightwingDraft");
    advance(layer2, 8.5);
    expect(lightwing.every((enemy) => enemy.alive && enemy.hp === enemy.maxHp)).toBe(true);
    expect(lightwing[0]!.expGranted).toBe(true);
    expect(layer2.musicScene).toBe("exploration");

    const layer3 = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "spiritClothStonescaleDepths" });
    layer3.setFieldEnemyPartialDisengageForQa("depthsSpiritEntry", { x: 1900, y: 900 });
    const depths = depthsEnemiesFor(layer3, "depthsSpiritEntry");
    advance(layer3, 8.5);
    expect(depths.every((enemy) => enemy.alive && enemy.hp === enemy.maxHp)).toBe(true);
    expect(depths[0]!.expGranted).toBe(true);
    expect(layer3.musicScene).toBe("exploration");
  });

  it("never applies distance disengage to arena mode", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "arena" });
    world.active.pos = { x: 50, y: 300 };
    for (let index = 0; index < 120; index += 1) world.update(1 / 60, frame());
    expect(world.mode).toBe("arena");
    expect(world.snapshot.partyPresence).toBe("formation");
    expect(world.stageEncounter).toBeNull();
  });

  it("clears only the active group, collapses to exploration, and preserves other groups", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.setMossRootEncounterForQa("mossFork", "active");
    for (const enemy of enemiesFor(world, "mossFork")) enemy.alive = false;
    for (let index = 0; index < 48; index += 1) world.update(1 / 60, frame());
    expect(world.encounterStates.mossFork).toBe("cleared");
    expect(world.activeEncounterGroupId).toBeNull();
    expect(world.snapshot.partyPresence).toBe("solo");
    expect(world.enemies.filter((enemy) => enemy.alive)).toHaveLength(8);
    expect(enemiesFor(world, "mossDeadEnd").every((enemy) => enemy.alive)).toBe(true);
  });

  it("opens the upper-layer gate only after the final three enemies are defeated", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    expect(world.encounterStates.mossGate).not.toBe("cleared");
    expect(world.mossLayerGateUnlocked).toBe(false);
    expect(isMossRootPositionWalkable(MOSS_ROOT_RUINS.layerGate, 1, {
      gateOpen: true,
      layerGateOpen: false,
    })).toBe(true);
    world.setMossRootEncounterForQa("mossGate", "active");
    for (const enemy of enemiesFor(world, "mossGate")) {
      expect(world.defeatEnemy(enemy.id)).toBe(true);
    }
    for (let index = 0; index < 48; index += 1) world.update(1 / 60, frame());
    expect(world.encounterStates.mossGate).toBe("cleared");
    expect(world.mossLayerGateUnlocked).toBe(true);
    expect(isMossRootPositionWalkable(MOSS_ROOT_RUINS.layerGate, 1, {
      gateOpen: true,
      layerGateOpen: true,
    })).toBe(true);
  });

  it("supports deterministic camera and encounter QA states, including all-cleared", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.setStageCameraQa("center");
    expect(world.active.pos).toEqual(MOSS_ROOT_LANDMARKS.centralPlaza);
    expect(world.snapshot.camera.y).toBeGreaterThan(0);
    world.setMossRootEncounterForQa("mossDeadEnd", "active");
    expect(world.snapshot.activeEncounter).toBe("mossDeadEnd");
    expect(world.snapshot.encounterTotal).toBe(2);
    world.clearAllMossRootEncountersForQa();
    expect(world.snapshot.clearedEncounters).toHaveLength(4);
    expect(world.enemies.every((enemy) => !enemy.alive)).toBe(true);
    expect(world.snapshot.partyPresence).toBe("solo");
  });

  it("keeps an important dialogue open, types it over time, and blocks movement", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.setDialogueForQa("crystal-touch");
    const before = { ...world.active.pos };
    expect(world.snapshot.dialogue?.text).toBe("");
    world.update(0.05, frame({ x: 1, y: 0 }));
    expect(world.snapshot.dialogue?.text.length).toBeGreaterThan(0);
    expect(world.active.pos).toEqual(before);
    for (let index = 0; index < 5; index += 1) world.update(0.05, frame());
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(world.snapshot.dialogue?.fullyVisible).toBe(true);
    closeDialogue(world);
    expect(world.snapshot.dialogue).toBeNull();
  });

  it("moves layers from their connected edges but not during a battle", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.setLayerTransitionForQa("to-layer2");
    world.update(1 / 60, frame({ x: 0, y: -1 }));
    expect(world.snapshot.dialogue?.sourceId).toBe("mossLayerExit");
    closeDialogue(world);
    for (let index = 0; index < 32; index += 1) world.update(1 / 60, frame());
    expect(world.roomId).toBe("lightwingCrystalCavern");
    world.setLayerTransitionForQa("to-layer1");
    world.stageEncounter = "active";
    world.update(1 / 60, frame({ x: 0, y: 1 }));
    expect(world.roomId).toBe("lightwingCrystalCavern");
  });

  it("uses the Layer 2 south arch for return and never transitions from the west edge", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.setLayerTransitionForQa("arrival");
    world.active.pos = { x: 12, y: LIGHTWING_CRYSTAL_CAVERN.spawn.y };
    world.update(1 / 60, frame({ x: -1, y: 0 }));
    expect(world.roomId).toBe("lightwingCrystalCavern");

    world.setLayerTransitionForQa("to-layer1");
    world.update(1 / 60, frame({ x: 0, y: 1 }));
    for (let index = 0; index < 32; index += 1) world.update(1 / 60, frame());
    expect(world.roomId).toBe("mossRootRuins");
    expect(world.active.pos.y).toBeGreaterThan(MOSS_ROOT_RUINS.layerGate.y);
  });

  it("keeps defeated departure enemies hidden until the destination owns the entity set", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.mossLayerGateUnlocked = true;
    world.enemies.forEach((enemy) => { enemy.alive = false; });
    world.setLayerTransitionForQa("to-layer2");
    world.update(1 / 60, frame({ x: 0, y: -1 }));
    closeDialogue(world);
    expect(world.enemies.every((enemy) => !enemy.alive)).toBe(true);
    for (let index = 0; index < 32; index += 1) world.update(1 / 60, frame());
    expect(world.roomId).toBe("lightwingCrystalCavern");
    closeDialogue(world);

    world.setLayerTransitionForQa("to-layer1");
    world.update(1 / 60, frame({ x: 0, y: 1 }));
    for (let index = 0; index < 32; index += 1) world.update(1 / 60, frame());
    expect(world.roomId).toBe("mossRootRuins");
    expect(world.enemies.every((enemy) => enemy.alive && !enemy.expGranted)).toBe(true);
    expect(world.mossLayerGateUnlocked).toBe(true);
  });

  it("separates platform rise sounds and finishes with one crystal completion cue", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "lightwingCrystalCavern" });
    world.setLightwingSpringForQa("context");
    world.primaryCrystalActivated = true;
    world.active.pos = { x: LIGHTWING_CRYSTAL_CAVERN.secondaryCrystal.x + 42, y: LIGHTWING_CRYSTAL_CAVERN.secondaryCrystal.y };
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    closeDialogue(world);
    const bridgePoint = lightwingSourceToWorld({ x: 950, y: 380 });
    expect(world.secondaryCrystalActivated).toBe(true);
    expect(world.crystalPathUnlocked).toBe(false);
    expect(isLightwingPositionWalkable(bridgePoint, 9, { crystalPathUnlocked: world.crystalPathUnlocked })).toBe(false);
    const riseEvents: number[] = [];
    const completeEvents: number[] = [];
    for (let frameIndex = 0; frameIndex < 220; frameIndex += 1) {
      world.update(1 / 60, frame());
      const events = world.drainAudioEvents();
      const rises = events.filter((event) => event.kind === "crystalPlatformRise");
      expect(rises.length).toBeLessThanOrEqual(1);
      riseEvents.push(...rises.map(() => frameIndex));
      completeEvents.push(...events.filter((event) => event.kind === "crystalPathComplete").map(() => frameIndex));
    }
    expect(riseEvents).toHaveLength(5);
    expect(completeEvents).toHaveLength(1);
    expect(completeEvents[0]).toBeGreaterThan(riseEvents[4]!);
    expect(world.crystalPathUnlocked).toBe(true);
    expect(isLightwingPositionWalkable(bridgePoint, 9, { crystalPathUnlocked: world.crystalPathUnlocked })).toBe(true);
    for (let index = 1; index < riseEvents.length; index += 1) {
      expect(riseEvents[index]! - riseEvents[index - 1]!).toBeGreaterThanOrEqual(24);
    }
  });

  it("uses only grounded debris during root opening, never combat wind or slashes", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.setMossRootEncounterForQa("mossDeadEnd", "cleared");
    world.active.pos = { x: MOSS_ROOT_RUINS.crystal.x - 46, y: MOSS_ROOT_RUINS.crystal.y };
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    closeDialogue(world);
    const seenKinds = new Set<string>();
    for (let index = 0; index < 210; index += 1) {
      world.update(1 / 60, frame());
      world.effects.effects.filter((effect) => effect.active).forEach((effect) => seenKinds.add(effect.kind));
    }
    expect(seenKinds.has("wind") || seenKinds.has("slash")).toBe(false);
    expect(seenKinds.has("dust") || seenKinds.has("leaf")).toBe(true);
  });

  it("requires every defeated enemy envelope to leave the expanded camera", () => {
    const camera = { x: 100, y: 100, viewportWidth: 640, viewportHeight: 360 } as const;
    const edge = camera.x - FIELD_ENEMY_RESPAWN_CAMERA_MARGIN;
    const extent = 12 + FIELD_ENEMY_RESPAWN_PRESENTATION_PADDING;
    expect(isFieldEnemyGroupOutsideExpandedCamera([
      { pos: { x: edge - extent, y: 200 }, radius: 12 },
    ], camera)).toBe(false);
    expect(isFieldEnemyGroupOutsideExpandedCamera([
      { pos: { x: edge - extent - 1, y: 200 }, radius: 12 },
    ], camera)).toBe(true);
    expect(isFieldEnemyGroupOutsideExpandedCamera([
      { pos: { x: edge - extent - 1, y: 200 }, radius: 12 },
      { pos: { x: 120, y: 220 }, radius: 12 },
    ], camera)).toBe(false);
  });

  it("keeps a cleared Layer 1 group defeated while one spawn remains visible", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.mossLayerGateUnlocked = true;
    world.setMossRootRespawnForQa("edge");
    advance(world, FIELD_ENEMY_RESPAWN_OFFSCREEN_HOLD + 0.5);
    const group = enemiesFor(world, "mossIntro");
    expect(world.encounterStates.mossIntro).toBe("cleared");
    expect(group.every((enemy) => !enemy.alive)).toBe(true);
    expect(world.musicScene).toBe("exploration");
  });

  it("requires a continuous offscreen hold, then restores a fresh Layer 1 group", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.mossLayerGateUnlocked = true;
    world.setMossRootRespawnForQa("far");
    advance(world, FIELD_ENEMY_RESPAWN_OFFSCREEN_HOLD * 0.55);
    expect(enemiesFor(world, "mossIntro").every((enemy) => !enemy.alive)).toBe(true);

    // Returning before the hold completes clears the accumulated offscreen time.
    world.setMossRootRespawnForQa("edge");
    advance(world, FIELD_ENEMY_RESPAWN_OFFSCREEN_HOLD + 0.2);
    expect(enemiesFor(world, "mossIntro").every((enemy) => !enemy.alive)).toBe(true);

    world.setMossRootRespawnForQa("far");
    advance(world, FIELD_ENEMY_RESPAWN_OFFSCREEN_HOLD + 0.1);
    const group = enemiesFor(world, "mossIntro");
    expect(world.encounterStates.mossIntro).toBe("dormant");
    expect(group.every((enemy) => enemy.alive && !enemy.expGranted)).toBe(true);
    expect(group.every((enemy) => enemy.hp === enemy.maxHp && enemy.aiState === "idle")).toBe(true);
    expect(group.every((enemy) => !enemy.aware && !enemy.hasAttackToken && enemy.attackConnected === false)).toBe(true);
    expect(world.mossLayerGateUnlocked).toBe(true);
    expect(world.musicScene).toBe("exploration");
  });

  it("uses the same offscreen hold and fresh reset on Layers 2 and 3", () => {
    const layer2 = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "lightwingCrystalCavern" });
    layer2.setFieldEnemyRespawnForQa("lightwingIntro", { x: 2080, y: 320 });
    advance(layer2, FIELD_ENEMY_RESPAWN_OFFSCREEN_HOLD + 0.1);
    const lightwing = lightwingEnemiesFor(layer2, "lightwingIntro");
    expect(layer2.lightwingEncounterStates.lightwingIntro).toBe("dormant");
    expect(lightwing.every((enemy) => enemy.alive && enemy.hp === enemy.maxHp && !enemy.hasAttackToken)).toBe(true);
    expect(layer2.musicScene).toBe("exploration");

    const layer3 = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "spiritClothStonescaleDepths" });
    layer3.setFieldEnemyRespawnForQa("depthsSpiritEntry", { x: 1900, y: 900 });
    advance(layer3, FIELD_ENEMY_RESPAWN_OFFSCREEN_HOLD + 0.1);
    const depths = depthsEnemiesFor(layer3, "depthsSpiritEntry");
    expect(layer3.depthsEncounterStates.depthsSpiritEntry).toBe("dormant");
    expect(depths.every((enemy) => enemy.alive && enemy.hp === enemy.maxHp && !enemy.hasAttackToken)).toBe(true);
    expect(layer3.musicScene).toBe("exploration");
  });

  it("pauses normal enemy respawns throughout stage combat", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.setMossRootRespawnForQa("far");
    world.beginStageCombat();
    advance(world, FIELD_ENEMY_RESPAWN_OFFSCREEN_HOLD + 0.5);
    expect(enemiesFor(world, "mossIntro").every((enemy) => !enemy.alive)).toBe(true);
    expect(world.musicScene).toBe("battle");

    world.endStageCombat();
    advance(world, FIELD_ENEMY_RESPAWN_OFFSCREEN_HOLD + 0.1);
    expect(enemiesFor(world, "mossIntro").every((enemy) => enemy.alive)).toBe(true);
    expect(world.musicScene).toBe("exploration");
  });

  it("does not revive the departure layer during its visible transition frames", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    world.setMossRootRespawnForQa("far");
    const defeated = enemiesFor(world, "mossIntro");
    world.setLayerTransitionForQa("to-layer2");
    world.update(1 / 60, frame({ x: 0, y: -1 }));
    closeDialogue(world);
    advance(world, 0.15);
    expect(world.roomId).toBe("mossRootRuins");
    expect(defeated.every((enemy) => !enemy.alive)).toBe(true);
    advance(world, 0.35);
    expect(world.roomId).toBe("lightwingCrystalCavern");
    expect(world.enemies.every((enemy) => enemy.kind === "mossPlun" || enemy.kind === "lumibane")).toBe(true);
  });

  it("keeps Layer 3 ownership separate and validates all nine reachable safe homes", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "spiritClothStonescaleDepths" });
    expect(world.snapshot.stageLayer).toBe("spiritClothStonescaleDepths");
    expect(world.enemies).toHaveLength(9);
    expect(world.enemies.filter((enemy) => enemy.kind === "utsurobou")).toHaveLength(5);
    expect(world.enemies.filter((enemy) => enemy.kind === "iwaUroko")).toHaveLength(4);
    const reachable = depthsReachableTiles(false);
    for (const group of DEPTHS_ENCOUNTERS) {
      const occupied: { pos: { x: number; y: number }; radius: number }[] = [];
      for (const entry of group.enemies) {
        const radius = ENEMY_TUNING[entry.kind].radius;
        expect(isDepthsEnemySpawnSafe(entry.pos, radius, occupied, reachable), `${group.id}:${entry.kind}`).toBe(true);
        occupied.push({ pos: entry.pos, radius });
      }
    }
    for (const enemy of world.enemies) {
      expect(isDepthsPositionWalkable(enemy.pos, enemy.radius, { centralGateOpen: false })).toBe(true);
    }
  });

  it("uses only the approved native redline floor and replays movement to every Layer 3 landmark", () => {
    expect(DEPTHS_NAV_MASK_META).toMatchObject({ sourceWidth: 1638, sourceHeight: 960, walkablePixelCount: 231601 });
    for (const [x, y] of [[1400, 900], [830, 585], [205, 285], [1450, 260], [825, 110], [845, 10]] as const) {
      expect(depthsSourcePixel(x, y), `${x},${y}`).toBe(true);
    }
    for (const [x, y] of [[400, 180], [1590, 350], [-1, 200], [1638, 400], [900, 960]] as const) {
      expect(depthsSourcePixel(x, y), `${x},${y}`).toBe(false);
    }
    const width = 1638;
    const height = 960;
    const start = 900 * width + 1400;
    const search = (gateOpen: boolean) => {
      const previous = new Int32Array(width * height).fill(-1);
      const queue = new Int32Array(width * height);
      queue[0] = start;
      previous[start] = start;
      let head = 0;
      let tail = 1;
      while (head < tail) {
        const index = queue[head++]!;
        const x = index % width;
        const y = Math.floor(index / width);
        for (const next of [index - 1, index + 1, index - width, index + width]) {
          if (next < 0 || next >= previous.length || previous[next]! >= 0) continue;
          const nx = next % width;
          const ny = Math.floor(next / width);
          if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;
          const point = depthsSourceToWorld({ x: nx + 0.5, y: ny + 0.5 });
          if (!isDepthsPositionWalkable(point, 9, { centralGateOpen: gateOpen, solidProps: DEPTHS_SOLID_PROPS })) continue;
          previous[next] = index;
          queue[tail++] = next;
        }
      }
      return previous;
    };
    const closed = search(false);
    const open = search(true);
    const replay = (previous: Int32Array, x: number, y: number, gateOpen: boolean) => {
      const goal = y * width + x;
      expect(previous[goal], `${x},${y}`).toBeGreaterThanOrEqual(0);
      const route: number[] = [];
      for (let index = goal; index !== start; index = previous[index]!) route.push(index);
      route.reverse();
      let position = depthsSourceToWorld({ x: 1400.5, y: 900.5 });
      for (const index of route) {
        const target = depthsSourceToWorld({ x: index % width + 0.5, y: Math.floor(index / width) + 0.5 });
        position = resolveDepthsMovement(position, target, 9, { centralGateOpen: gateOpen, solidProps: DEPTHS_SOLID_PROPS });
        expect(Math.hypot(position.x - target.x, position.y - target.y)).toBeLessThan(0.02);
      }
      if (!gateOpen) {
        const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "spiritClothStonescaleDepths" });
        world.setSpiritClothStonescaleDepthsForQa("arrival");
        for (const index of route) {
          const target = depthsSourceToWorld({ x: index % width + 0.5, y: Math.floor(index / width) + 0.5 });
          const dx = target.x - world.active.pos.x;
          const dy = target.y - world.active.pos.y;
          const distance = Math.hypot(dx, dy);
          world.update(distance / world.active.moveSpeed, frame({ x: dx / distance, y: dy / distance }));
          expect(Math.hypot(world.active.pos.x - target.x, world.active.pos.y - target.y), `runtime route to ${x},${y} at ${index}`).toBeLessThan(0.1);
        }
        expect(world.roomId).toBe("spiritClothStonescaleDepths");
      }
    };
    for (const [x, y] of [[830, 585], [205, 285], [1450, 260]] as const) replay(closed, x, y, false);
    expect(closed[110 * width + 825]).toBe(-1);
    replay(open, 825, 110, true);
    replay(open, 845, 10, true);
  });

  it("keeps the central gate and redline boundary sealed during fast movement and warps", () => {
    const closed = { centralGateOpen: false, solidProps: DEPTHS_SOLID_PROPS };
    const open = { centralGateOpen: true, solidProps: DEPTHS_SOLID_PROPS };
    const below = depthsSourceToWorld({ x: 837, y: 350 });
    const above = depthsSourceToWorld({ x: 837, y: 290 });
    expect(depthsGateBlocksSource(837, 323)).toBe(true);
    const stopped = resolveDepthsMovement(below, above, 9, closed);
    expect(stopped.y).toBeGreaterThan(depthsSourceToWorld({ x: 0, y: 334 }).y);
    expect(resolveDepthsMovement(below, above, 9, open)).toEqual(above);
    expect(findNearestDepthsWalkablePosition(depthsSourceToWorld({ x: 825, y: 110 }), 9, closed)).toBeNull();
    for (const outside of [[400, 180], [1590, 350], [1639, 350]] as const) {
      const target = depthsSourceToWorld({ x: outside[0], y: outside[1] });
      expect(isDepthsPositionWalkable(target, 9, open)).toBe(false);
    }
    const edgeStart = depthsSourceToWorld({ x: 830, y: 585 });
    const edgeTarget = depthsSourceToWorld({ x: 400, y: 180 });
    const edgeStop = resolveDepthsMovement(edgeStart, edgeTarget, 9, open);
    expect(isDepthsPositionWalkable(edgeStop, 9, open)).toBe(true);
    expect(edgeStop).not.toEqual(edgeTarget);
  });

  it("opens the Layer 3 central seal only after both devices and keeps formation on walkable ground", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "spiritClothStonescaleDepths" });
    const gate = SPIRIT_CLOTH_STONESCALE_DEPTHS.centralGate;
    expect(isDepthsPositionWalkable(gate, 1, { centralGateOpen: false })).toBe(false);
    world.spiritLampActivated = true;
    expect(isDepthsPositionWalkable(gate, 1, { centralGateOpen: false })).toBe(false);
    world.stoneWedgeActivated = true;
    world.depthsCentralGateOpened = true;
    expect(isDepthsPositionWalkable(gate, 1, { centralGateOpen: true })).toBe(true);
    world.setSpiritClothStonescaleDepthsForQa("narrow-formation");
    world.beginStageCombat();
    for (const member of world.party) {
      expect(isDepthsPositionWalkable(member.pos, member.radius, { centralGateOpen: true })).toBe(true);
    }
  });

  it("uses narrow walkable cave mouths at both Layer 3 edges", () => {
    const south = SPIRIT_CLOTH_STONESCALE_DEPTHS.returnGateInnerSpawn;
    const north = SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoorInnerSpawn;
    expect(isDepthsPositionWalkable(south, 9, { centralGateOpen: false })).toBe(true);
    expect(isDepthsPositionWalkable(north, 9, { centralGateOpen: true })).toBe(true);
    expect(depthsReachableTiles(true).has(depthsReachabilityKey(north))).toBe(true);
    expect(isCrystalAltarPositionWalkable({ x: CRYSTAL_ALTAR.spawn.x, y: CRYSTAL_ALTAR.height - 2 }, 9)).toBe(true);
  });

  it("uses the approved 1496x1051 boss redline for floor points and swept movement", () => {
    expect(CRYSTAL_ALTAR_NAV_MASK_META).toMatchObject({ sourceWidth: 1496, sourceHeight: 1051, walkablePixelCount: 436203 });
    expect(CRYSTAL_ALTAR_BACKDROP_TRANSFORM.worldRect).toMatchObject({ width: 1496, height: 1051 });
    expect(crystalAltarWorldToSource(crystalAltarSourceToWorld({ x: 748, y: 520 }))).toEqual({ x: 748, y: 520 });
    for (const point of [CRYSTAL_ALTAR.spawn, CRYSTAL_ALTAR.arenaCenter, CRYSTAL_ALTAR.bossSpawn, CRYSTAL_ALTAR.sealStone]) {
      expect(crystalAltarNavigationPoint(point)).toBe(true);
      expect(isCrystalAltarPositionWalkable(point, 9)).toBe(true);
    }
    for (const [x, y] of [[370, 650], [1114, 650], [100, 500], [1350, 500], [550, 900], [748, 100], [617, 1049]] as const) {
      expect(crystalAltarSourcePixel(x, y), `${x},${y}`).toBe(false);
    }
    expect(crystalAltarSourcePixel(620, 1049)).toBe(true);
    expect(resolveCrystalAltarMovement(CRYSTAL_ALTAR.spawn, CRYSTAL_ALTAR.sealStone, 9)).toEqual(CRYSTAL_ALTAR.sealStone);
    expect(isCrystalAltarPositionWalkable(CRYSTAL_ALTAR.sealStone, 9, { sealStoneSolid: true })).toBe(false);
    for (const target of [{ x: 100, y: 500 }, { x: 1350, y: 500 }, { x: 0, y: 0 }, { x: 748, y: -400 }]) {
      const stopped = resolveCrystalAltarMovement(CRYSTAL_ALTAR.arenaCenter, target, 9);
      expect(isCrystalAltarPositionWalkable(stopped, 9)).toBe(true);
      expect(stopped).not.toEqual(target);
    }
  });

  it("blocks only the visible seal stone base, including fast approaches, while leaving the altar floor open", () => {
    const stone = CRYSTAL_ALTAR.sealStone;
    const visible = { sealStoneSolid: true };
    const south = { x: stone.x, y: stone.y + 34 };
    const north = { x: stone.x, y: stone.y - 28 };
    const west = { x: stone.x - 40, y: CRYSTAL_ALTAR_SEAL_STONE_BASE.y };
    const east = { x: stone.x + 40, y: CRYSTAL_ALTAR_SEAL_STONE_BASE.y };
    for (const point of [south, north, west, east]) {
      expect(isCrystalAltarPositionWalkable(point, 9, visible)).toBe(true);
    }
    expect(isCrystalAltarPositionWalkable(stone, 9)).toBe(true);
    for (const [start, target] of [[south, north], [north, south], [west, east], [east, west]] as const) {
      const stopped = resolveCrystalAltarMovement(start, target, 9, visible);
      expect(stopped).not.toEqual(target);
      expect(isCrystalAltarPositionWalkable(stopped, 9, visible)).toBe(true);
    }
    const diagonalTarget = { x: stone.x + 26, y: stone.y - 18 };
    const diagonalStop = resolveCrystalAltarMovement(
      { x: stone.x - 26, y: stone.y + 18 }, diagonalTarget, 9, visible,
    );
    expect(diagonalStop).not.toEqual(diagonalTarget);
    expect(isCrystalAltarPositionWalkable(diagonalStop, 9, visible)).toBe(true);
    const around = [south, { x: stone.x + 40, y: south.y }, east, { x: stone.x + 40, y: north.y }, north];
    for (let index = 1; index < around.length; index += 1) {
      expect(resolveCrystalAltarMovement(around[index - 1]!, around[index]!, 9, visible)).toEqual(around[index]);
    }
  });

  it("relocates a party inside the base when the seal forms and keeps the E interaction reachable", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "crystalAltar" });
    world.setVelgranBossForQa("defeat");
    expect(world.snapshot.velgran?.sealStoneVisible).toBe(false);
    world.party.forEach((member) => { member.pos = { ...CRYSTAL_ALTAR.sealStone }; });
    advance(world, 2.45);
    expect(world.snapshot.velgran?.sealStoneVisible).toBe(true);
    expect(world.party.every((member) => isCrystalAltarPositionWalkable(member.pos, member.radius, { sealStoneSolid: true }))).toBe(true);
    expect(world.party.every((member) => crystalAltarNavigationPoint(member.pos))).toBe(true);

    advance(world, 1.25);
    closeDialogue(world);
    world.active.pos = { x: CRYSTAL_ALTAR.sealStone.x, y: CRYSTAL_ALTAR.sealStone.y + 35 };
    expect(world.snapshot.interactionPrompt).toBe("E　森の封印石に触れる");
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(world.snapshot.velgran?.phase).toBe("blessing");
    expect(world.forestSealStoneObtained).toBe(false);
    expect(world.completeSealCinematic()).toBe(true);
    expect(world.forestSealStoneObtained).toBe(true);
    expect(world.snapshot.velgran?.sealStoneVisible).toBe(true);
    expect(isCrystalAltarPositionWalkable(CRYSTAL_ALTAR.sealStone, 9, { sealStoneSolid: true })).toBe(false);
  });

  it("moves through the boss arena to the north altar using real game input", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "crystalAltar" });
    world.setVelgranBossForQa("seal");
    expect(world.party.every((member) => isCrystalAltarPositionWalkable(member.pos, member.radius, { sealStoneSolid: true }))).toBe(true);
    world.active.pos = { ...CRYSTAL_ALTAR.spawn };
    world.update(1 / 60, frame());
    closeDialogue(world);
    let reachedNorth = false;
    for (let index = 0; index < 720; index += 1) {
      world.update(1 / 60, frame({ x: 0, y: -1 }));
      expect(isCrystalAltarPositionWalkable(world.active.pos, world.active.radius, { sealStoneSolid: true })).toBe(true);
      if (world.active.pos.y <= CRYSTAL_ALTAR.sealStone.y + 45) {
        reachedNorth = true;
        break;
      }
    }
    expect(reachedNorth).toBe(true);
  });

  it("starts the guardian near the central floor and deploys the party inside the redline", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "crystalAltar" });
    world.active.pos = { x: CRYSTAL_ALTAR.spawn.x, y: CRYSTAL_ALTAR.introTriggerY - 1 };
    world.update(1 / 60, frame());
    expect(world.snapshot.velgran?.phase).toBe("introParty");
    expect(world.snapshot.partyPresence).toBe("formation");
    expect(world.party.every((member) => isCrystalAltarPositionWalkable(member.pos, member.radius))).toBe(true);
  });

  it("retreats during the guardian fight and starts the shorter rematch on reentry", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "crystalAltar" });
    world.depthsCentralGateOpened = true;
    world.active.pos = { x: CRYSTAL_ALTAR.spawn.x, y: CRYSTAL_ALTAR.introTriggerY - 1 };
    world.update(1 / 60, frame());
    expect(world.snapshot.velgran?.phase).toBe("introParty");
    advance(world, 3.6);
    expect(world.snapshot.velgran?.phase).toBe("active");
    world.active.pos = { x: CRYSTAL_ALTAR.spawn.x, y: CRYSTAL_ALTAR.retreatY - 24 };
    for (let index = 0; index < 120 && world.roomId === "crystalAltar"; index += 1) {
      world.update(1 / 60, frame({ x: 0, y: 1 }));
    }
    advance(world, 0.6);
    expect(world.roomId).toBe("spiritClothStonescaleDepths");
    world.active.pos = { x: SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoor.x, y: SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoor.y + 20 };
    advance(world, 0.6);
    world.update(1 / 60, frame({ x: 0, y: -1 }));
    advance(world, 0.6);
    expect(world.roomId).toBe("crystalAltar");
    expect(world.snapshot.velgran?.phase).toBe("dormant");
    world.active.pos = { x: CRYSTAL_ALTAR.spawn.x, y: CRYSTAL_ALTAR.introTriggerY - 1 };
    world.update(1 / 60, frame());
    expect(world.snapshot.velgran?.phase).toBe("awakening");
  });

  it("makes the Layer 3 seal a wall-to-wall mandatory gate until both devices finish opening", () => {
    const goalKey = depthsReachabilityKey(SPIRIT_CLOTH_STONESCALE_DEPTHS.goal);
    expect(depthsReachableTiles(false).has(goalKey)).toBe(false);
    expect(depthsReachableTiles(true).has(goalKey)).toBe(true);

    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "spiritClothStonescaleDepths" });
    world.spiritLampActivated = true;
    world.stoneWedgeActivated = true;
    world.tryOpenDepthsCentralGateForQa();
    expect(world.depthsCentralGateOpened).toBe(false);
    advance(world, 1.1);
    expect(world.depthsCentralGateOpened).toBe(false);
    advance(world, 0.5);
    expect(world.depthsCentralGateOpened).toBe(true);
  });

  it("activates both Layer 3 devices through interaction and crosses the opened gate in normal updates", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "spiritClothStonescaleDepths" });
    world.setSpiritClothStonescaleDepthsForQa("central-gate");
    for (let index = 0; index < 90; index += 1) world.update(1 / 60, frame({ x: 0, y: -1 }));
    expect(world.depthsCentralGateOpened).toBe(false);
    expect(world.active.pos.y).toBeGreaterThan(depthsSourceToWorld({ x: 0, y: 334 }).y);

    world.setSpiritClothStonescaleDepthsForQa("spirit-lamp");
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(world.snapshot.dialogue).not.toBeNull();
    closeDialogue(world);
    expect(world.spiritLampActivated).toBe(true);
    expect(world.stoneWedgeActivated).toBe(false);
    expect(world.depthsCentralGateOpened).toBe(false);

    world.setSpiritClothStonescaleDepthsForQa("stone-wedge");
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(world.snapshot.dialogue).not.toBeNull();
    closeDialogue(world);
    expect(world.stoneWedgeActivated).toBe(true);
    expect(world.depthsCentralGateOpened).toBe(false);
    advance(world, 1.5);
    closeDialogue(world);
    expect(world.depthsCentralGateOpened).toBe(true);
    world.setSpiritClothStonescaleDepthsForQa("central-gate");
    for (let index = 0; index < 90; index += 1) world.update(1 / 60, frame({ x: 0, y: -1 }));
    expect(world.active.pos.y).toBeLessThan(depthsSourceToWorld({ x: 0, y: 311 }).y);
    expect(world.party.every((member) => isDepthsPositionWalkable(member.pos, member.radius, { centralGateOpen: true }))).toBe(true);
  });

  it("blocks only each stele's visible base and allows interaction from behind", () => {
    const options = { centralGateOpen: false, solidProps: DEPTHS_SOLID_PROPS };
    for (const x of [205, 1430]) {
      const front = depthsSourceToWorld({ x, y: x === 205 ? 285 : 260 });
      const behind = depthsSourceToWorld({ x, y: x === 205 ? 235 : 210 });
      const blockedFromFront = resolveDepthsMovement(front, behind, 9, options);
      const blockedFromBehind = resolveDepthsMovement(behind, front, 9, options);
      expect(blockedFromFront.y).toBeGreaterThan(behind.y);
      expect(blockedFromBehind.y).toBeLessThan(front.y);
      expect(isDepthsPositionWalkable(blockedFromFront, 9, options)).toBe(true);
      expect(isDepthsPositionWalkable(blockedFromBehind, 9, options)).toBe(true);
    }

    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "spiritClothStonescaleDepths" });
    world.setSpiritClothStonescaleDepthsForQa("spirit-lamp");
    world.active.pos = depthsSourceToWorld({ x: 205, y: 235 });
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(world.snapshot.dialogue).not.toBeNull();
    closeDialogue(world);
    expect(world.spiritLampActivated).toBe(true);

    world.setSpiritClothStonescaleDepthsForQa("stone-wedge");
    world.active.pos = depthsSourceToWorld({ x: 1430, y: 210 });
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(world.snapshot.dialogue).not.toBeNull();
    closeDialogue(world);
    expect(world.stoneWedgeActivated).toBe(true);
  });

  it("keeps the preboss crystal off the central route and behind the sealed gate", () => {
    const crystal = SPIRIT_CLOTH_STONESCALE_DEPTHS.restorationCrystal;
    const front = depthsSourceToWorld({ x: 930, y: 145 });
    const behind = depthsSourceToWorld({ x: 930, y: 90 });
    expect(depthsSourcePixel(930, 118)).toBe(true);
    expect(depthsReachableTiles(false).has(depthsReachabilityKey(front))).toBe(false);
    expect(depthsReachableTiles(true).has(depthsReachabilityKey(front))).toBe(true);
    expect(isDepthsPositionWalkable(crystal, 9, { centralGateOpen: true })).toBe(false);
    const blocked = resolveDepthsMovement(front, behind, 9, { centralGateOpen: true });
    expect(blocked.y).toBeGreaterThan(crystal.y);
    expect(isDepthsPositionWalkable(front, 9, { centralGateOpen: true })).toBe(true);
    expect(isDepthsPositionWalkable(behind, 9, { centralGateOpen: true })).toBe(true);
    const central = resolveDepthsMovement(
      depthsSourceToWorld({ x: 825, y: 180 }),
      depthsSourceToWorld({ x: 825, y: 80 }),
      9, { centralGateOpen: true },
    );
    expect(central.y).toBeCloseTo(depthsSourceToWorld({ x: 0, y: 80 }).y, 1);
  });

  it("revives and fully restores everyone with a reusable, combat-locked crystal", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "spiritClothStonescaleDepths" });
    world.setSpiritClothStonescaleDepthsForQa("restoration-crystal");
    for (const member of world.party) {
      member.hp = Math.max(1, Math.floor(member.maxHp / 3));
      member.mp = 0;
    }
    const nadi = world.party.find((member) => member.id === "nadi")!;
    nadi.hp = 0;
    nadi.downed = true;
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(world.party.every((member) => !member.downed && member.hp === member.maxHp && member.mp === member.maxMp)).toBe(true);
    expect(world.drainAudioEvents().some((event) => event.kind === "depthsRestorationCrystal")).toBe(true);
    expect(world.party.every((member) => isDepthsPositionWalkable(member.pos, member.radius, { centralGateOpen: true }))).toBe(true);

    nadi.hp = 1;
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(nadi.hp).toBe(1);
    advance(world, 1.2);
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(nadi.hp).toBe(nadi.maxHp);

    advance(world, 1.2);
    world.beginStageCombat();
    nadi.hp = 1;
    world.drainAudioEvents();
    world.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(nadi.hp).toBeLessThan(nadi.maxHp);
    expect(world.drainAudioEvents().some((event) => event.kind === "depthsRestorationCrystal")).toBe(false);

    const sealed = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "spiritClothStonescaleDepths" });
    sealed.active.pos = depthsSourceToWorld({ x: 930, y: 145 });
    sealed.active.hp = 1;
    sealed.update(1 / 60, frame({ x: 0, y: 0 }, ["interact"]));
    expect(sealed.active.hp).toBe(1);
  });

  it("keeps dormant Layer 3 enemies completely idle until their own encounter becomes active", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "spiritClothStonescaleDepths" });
    const before = world.enemies.map((enemy) => ({ id: enemy.id, pos: { ...enemy.pos } }));
    const hp = world.party.map((member) => member.hp);
    advance(world, 1.4);
    expect(world.snapshot.stageEncounter).toBe("dormant");
    expect(world.snapshot.partyPresence).toBe("solo");
    expect(musicTrackForPartyPresence(world.snapshot.partyPresence)).toBe("exploration");
    expect(world.enemies.every((enemy) => enemy.aiState === "idle" && !enemy.hasAttackToken)).toBe(true);
    expect(world.enemies.map((enemy) => enemy.pos)).toEqual(before.map((enemy) => enemy.pos));
    expect(world.party.map((member) => member.hp)).toEqual(hp);
  });

  it("repositions Iwa Uroko instead of charging into a Layer 3 wall and keeps collision pushes walkable", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "spiritClothStonescaleDepths" });
    world.setDepthsEncounterForQa("depthsStonePassage", "active");
    const iwa = depthsEnemiesFor(world, "depthsStonePassage")[0]!;
    const other = depthsEnemiesFor(world, "depthsStonePassage")[1]!;
    const radius = iwa.radius;
    const options = { centralGateOpen: false };
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    let wallCase: { origin: { x: number; y: number }; direction: { x: number; y: number } } | null = null;
    for (let row = 1; row < SPIRIT_CLOTH_STONESCALE_DEPTHS.height / 32 - 1 && !wallCase; row += 1) {
      for (let column = 1; column < SPIRIT_CLOTH_STONESCALE_DEPTHS.width / 32 - 1 && !wallCase; column += 1) {
        const origin = { x: column * 32 + 16, y: row * 32 + 16 };
        if (!isDepthsPositionWalkable(origin, radius, options)) continue;
        for (const direction of directions) {
          const near = { x: origin.x + direction.x * 8, y: origin.y + direction.y * 8 };
          const blocked = { x: origin.x + direction.x * 72, y: origin.y + direction.y * 72 };
          if (
            isDepthsPositionWalkable(near, radius, options) &&
            !isDepthsPositionWalkable(blocked, radius, options)
          ) {
            wallCase = { origin, direction };
            break;
          }
        }
      }
    }
    if (!wallCase) throw new Error("Expected a walkable Layer 3 point facing a nearby wall.");

    const internals = world as unknown as {
      isIwaUrokoChargePathClear(origin: { x: number; y: number }, direction: { x: number; y: number }, radius: number): boolean;
      beginEnemyAttack(enemy: typeof iwa, target: typeof world.active): void;
      resolveEnemySweptMovement(previous: { x: number; y: number }, desired: { x: number; y: number }, radius: number): { x: number; y: number };
      resolveEnemySeparation(delta: number): void;
      iwaChargeRetryUntil: Map<number, number>;
    };
    expect(internals.isIwaUrokoChargePathClear(
      wallCase.origin,
      wallCase.direction,
      radius,
    )).toBe(false);

    iwa.pos = { ...wallCase.origin };
    iwa.attackDirection = { ...wallCase.direction };
    iwa.facing = { ...wallCase.direction };
    iwa.hasAttackToken = true;
    world.active.pos = {
      x: wallCase.origin.x + wallCase.direction.x * 120,
      y: wallCase.origin.y + wallCase.direction.y * 120,
    };
    internals.beginEnemyAttack(iwa, world.active);
    expect(iwa.aiState).toBe("reposition");
    expect(iwa.hasAttackToken).toBe(false);
    expect(iwa.telegraph).toBe(0);
    expect(internals.iwaChargeRetryUntil.get(iwa.id)).toBeGreaterThan(0);

    // A second blocked attempt must exit the reposition loop through the
    // close-range fallback instead of releasing the token forever.
    iwa.pos = { ...wallCase.origin };
    iwa.attackDirection = { ...wallCase.direction };
    iwa.facing = { ...wallCase.direction };
    iwa.attackStyle = "default";
    iwa.hasAttackToken = true;
    internals.beginEnemyAttack(iwa, world.active);
    expect(iwa.aiState).toBe("windup");
    expect(iwa.attackStyle).toBe("iwaTailSweep");
    expect(iwa.stateTimer).toBe(0.5);
    expect(iwa.hasAttackToken).toBe(true);

    const swept = internals.resolveEnemySweptMovement(
      wallCase.origin,
      {
        x: wallCase.origin.x + wallCase.direction.x * 220,
        y: wallCase.origin.y + wallCase.direction.y * 220,
      },
      radius,
    );
    expect(isDepthsPositionWalkable(swept, radius, options)).toBe(true);
    expect(Math.hypot(swept.x - wallCase.origin.x, swept.y - wallCase.origin.y)).toBeLessThan(220);

    iwa.pos = { ...wallCase.origin };
    other.pos = { ...wallCase.origin };
    internals.resolveEnemySeparation(1 / 60);
    expect(isDepthsPositionWalkable(iwa.pos, iwa.radius, options)).toBe(true);
    expect(isDepthsPositionWalkable(other.pos, other.radius, options)).toBe(true);
  });

  it("joins nearby Layer 3 encounters without dropping formation or battle music", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "spiritClothStonescaleDepths" });
    world.setDepthsMultiEncounterForQa("depthsSpiritEntry", "depthsSpiritLamp");
    world.encounterGrace = 0;
    advance(world, 0.2);

    expect(world.activeEncounterGroupIds).toEqual(new Set([
      "depthsSpiritEntry",
      "depthsSpiritLamp",
    ]));
    expect(world.snapshot.stageEncounter).toBe("active");
    expect(world.snapshot.partyPresence).toBe("formation");
    expect(musicTrackForPartyPresence(world.snapshot.partyPresence)).toBe("battle");
    expect(world.snapshot.encounterTotal).toBe(
      depthsEnemiesFor(world, "depthsSpiritEntry").length +
      depthsEnemiesFor(world, "depthsSpiritLamp").length,
    );
    expect(world.snapshot.encounterAlive).toBe(world.snapshot.encounterTotal);

    const firstGroupTarget = depthsEnemiesFor(world, "depthsSpiritEntry")[0]!;
    const secondGroupTarget = depthsEnemiesFor(world, "depthsSpiritLamp")[0]!;
    firstGroupTarget.pos = { x: world.active.pos.x + 17, y: world.active.pos.y - 9 };
    secondGroupTarget.pos = { x: world.active.pos.x + 17, y: world.active.pos.y + 9 };
    const firstHp = firstGroupTarget.hp;
    const secondHp = secondGroupTarget.hp;
    const combatInternals = world as unknown as {
      spawnArea(options: {
        owner: "kyle";
        team: "party";
        pos: { x: number; y: number };
        radius: number;
        damage: number;
      }): unknown;
      updateAttackAreas(delta: number): void;
    };
    combatInternals.spawnArea({
      owner: "kyle",
      team: "party",
      pos: { x: world.active.pos.x + 17, y: world.active.pos.y },
      radius: 30,
      damage: 18,
    });
    combatInternals.updateAttackAreas(1 / 60);
    expect(firstGroupTarget.hp).toBeLessThan(firstHp);
    expect(secondGroupTarget.hp).toBeLessThan(secondHp);

    for (const enemy of depthsEnemiesFor(world, "depthsSpiritEntry")) enemy.alive = false;
    advance(world, 0.2);
    expect(world.activeEncounterGroupIds.has("depthsSpiritLamp")).toBe(true);
    expect(world.snapshot.stageEncounter).toBe("active");
    expect(world.snapshot.partyPresence).toBe("formation");
    expect(musicTrackForPartyPresence(world.snapshot.partyPresence)).toBe("battle");

    for (const enemy of depthsEnemiesFor(world, "depthsSpiritLamp")) enemy.alive = false;
    advance(world, 1.1);
    expect(world.activeEncounterGroupIds.size).toBe(0);
    expect(world.snapshot.partyPresence).toBe("solo");
    expect(musicTrackForPartyPresence(world.snapshot.partyPresence)).toBe("exploration");
  });

  it("uses the same nearby-group participation rule on Layers 1 and 2", () => {
    const layer1 = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    layer1.setMossRootEncounterForQa("mossIntro", "active");
    const mossFork = enemiesFor(layer1, "mossFork");
    mossFork.forEach((enemy, index) => {
      enemy.pos = { x: layer1.active.pos.x + 60 + index * 20, y: layer1.active.pos.y };
      enemy.idleAnchor = { ...enemy.pos };
      enemy.idleTarget = { ...enemy.pos };
    });
    advance(layer1, 0.2);
    expect(layer1.activeEncounterGroupIds.has("mossIntro")).toBe(true);
    expect(layer1.activeEncounterGroupIds.has("mossFork")).toBe(true);
    expect(mossFork.every((enemy) => enemy.aware)).toBe(true);

    const layer2 = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "lightwingCrystalCavern" });
    layer2.setLightwingEncounterForQa("lightwingIntro", "active");
    (layer2 as unknown as { stageEncounterDetectionSuppressed: boolean })
      .stageEncounterDetectionSuppressed = false;
    const lightwingDraft = lightwingEnemiesFor(layer2, "lightwingDraft");
    lightwingDraft.forEach((enemy, index) => {
      enemy.pos = { x: layer2.active.pos.x + 60 + index * 18, y: layer2.active.pos.y };
      enemy.idleAnchor = { ...enemy.pos };
      enemy.idleTarget = { ...enemy.pos };
    });
    advance(layer2, 0.2);
    expect(layer2.activeEncounterGroupIds.has("lightwingIntro")).toBe(true);
    expect(layer2.activeEncounterGroupIds.has("lightwingDraft")).toBe(true);
    expect(lightwingDraft.every((enemy) => enemy.aware)).toBe(true);
  });

  it("enables body contact only during active encounters on Layers 1, 2, and 3", () => {
    const cases = [
      {
        room: "mossRootRuins" as const,
        activate: (world: GameWorld) => world.setMossRootEncounterForQa("mossIntro", "active"),
        enemies: (world: GameWorld) => enemiesFor(world, "mossIntro"),
      },
      {
        room: "lightwingCrystalCavern" as const,
        activate: (world: GameWorld) => world.setLightwingEncounterForQa("lightwingIntro", "active"),
        enemies: (world: GameWorld) => lightwingEnemiesFor(world, "lightwingIntro"),
      },
      {
        room: "spiritClothStonescaleDepths" as const,
        activate: (world: GameWorld) => world.setDepthsEncounterForQa("depthsSpiritEntry", "active"),
        enemies: (world: GameWorld) => depthsEnemiesFor(world, "depthsSpiritEntry"),
      },
    ];

    for (const entry of cases) {
      const world = new GameWorld({
        initialPhase: "playing",
        mode: "stage",
        initialRoomId: entry.room,
        random: () => 0.5,
      });
      entry.activate(world);
      world.encounterGrace = 0;
      const enemy = entry.enemies(world)[0]!;
      enemy.pos = { ...world.active.pos };
      enemy.aware = true;
      enemy.aiState = "windup";
      enemy.stateTimer = 10;
      const before = world.active.hp;

      world.update(1 / 60, frame());

      expect(world.active.hp, entry.room).toBe(
        before - FIELD_ENEMY_CONTACT.damage[enemy.kind],
      );
    }

    const exploration = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    const dormant = exploration.enemies[0]!;
    dormant.pos = { ...exploration.active.pos };
    dormant.aware = true;
    const before = exploration.active.hp;
    exploration.update(1 / 60, frame());
    expect(exploration.active.hp).toBe(before);
  });

  it("does not let a player attack damage a visible but non-active Layer 3 group", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "spiritClothStonescaleDepths" });
    world.setDepthsEncounterForQa("depthsSpiritEntry", "active");
    world.encounterGrace = 0;
    const dormant = depthsEnemiesFor(world, "depthsSpiritLamp")[0]!;
    dormant.pos = { x: world.active.pos.x + 17, y: world.active.pos.y };
    dormant.idleAnchor = { ...dormant.pos };
    dormant.idleTarget = { ...dormant.pos };
    const hp = dormant.hp;
    world.active.facing = { x: 1, y: 0 };
    world.update(1 / 60, {
      ...frame(),
      held: new Set(["attack"]),
    });
    expect(dormant.hp).toBe(hp);
  });

  it("keeps dormant Layer 2 enemies idle while an unrelated group owns combat", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "lightwingCrystalCavern" });
    world.setLightwingEncounterForQa("lightwingIntro", "active");
    world.encounterGrace = 0;
    const dormant = world.enemies.slice(1).map((enemy) => ({ id: enemy.id, pos: { ...enemy.pos } }));
    advance(world, 1.0);
    expect(world.enemies.slice(1).every((enemy) => enemy.aiState === "idle" && !enemy.hasAttackToken)).toBe(true);
    expect(world.enemies.slice(1).map((enemy) => enemy.pos)).toEqual(dormant.map((enemy) => enemy.pos));
    expect(world.snapshot.partyPresence).toBe("formation");
  });

  it("switches layer-owned enemy arrays on DEV starts and Layer 2/3 boundary travel", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    expect(world.startDevelopmentLayer("lightwingCrystalCavern")).toBe(true);
    expect(world.enemies.every((enemy) => enemy.kind === "mossPlun" || enemy.kind === "lumibane")).toBe(true);
    expect(world.startDevelopmentLayer("spiritClothStonescaleDepths")).toBe(true);
    expect(world.enemies.every((enemy) => enemy.kind === "utsurobou" || enemy.kind === "iwaUroko")).toBe(true);
    expect(world.enemies).toHaveLength(9);

    world.startDevelopmentLayer("lightwingCrystalCavern");
    // The north exit is reached only after its local nest is cleared; mirror
    // that gameplay state so encounter detection cannot pre-empt edge travel.
    world.setLightwingCrystalCavernForQa("floor3-gate");
    world.active.pos = {
      x: LIGHTWING_CRYSTAL_CAVERN.layerGate.x,
      y: LIGHTWING_CRYSTAL_CAVERN.layerGate.y + 20,
    };
    // GameWorld clamps simulation delta, so clear the transition cooldown
    // with ordinary frames before crossing the Layer 2 north edge.
    for (let index = 0; index < 36; index += 1) world.update(1 / 60, frame());
    world.update(1 / 60, frame({ x: 0, y: -1 }));
    for (let index = 0; index < 32; index += 1) world.update(1 / 60, frame());
    expect(world.roomId).toBe("spiritClothStonescaleDepths");
    expect(world.enemies.every((enemy) => enemy.kind === "utsurobou" || enemy.kind === "iwaUroko")).toBe(true);
    expect(world.active.pos).toEqual(SPIRIT_CLOTH_STONESCALE_DEPTHS.returnGateInnerSpawn);
    expect(world.party.every((member) => member.facing.y < 0)).toBe(true);

    // The reverse trip is possible only through the matching narrow south
    // opening, and places the party safely inside Layer 2 rather than on the
    // transition trigger itself.
    for (let index = 0; index < 60; index += 1) world.update(1 / 60, frame());
    world.active.pos = {
      x: SPIRIT_CLOTH_STONESCALE_DEPTHS.returnGate.x,
      y: SPIRIT_CLOTH_STONESCALE_DEPTHS.returnGate.y - 18,
    };
    world.update(1 / 60, frame({ x: 0, y: 1 }));
    for (let index = 0; index < 32; index += 1) world.update(1 / 60, frame());
    expect(world.roomId).toBe("lightwingCrystalCavern");
    expect(world.active.pos.x).toBeCloseTo(LIGHTWING_CRYSTAL_CAVERN.layerGateInnerSpawn.x, 1);
    expect(world.active.pos.y).toBeCloseTo(LIGHTWING_CRYSTAL_CAVERN.layerGateInnerSpawn.y, 1);
    expect(world.party.every((member) => member.facing.y > 0)).toBe(true);
    // The arrival point and cooldown leave enough room to keep walking south
    // without being pulled straight back into Layer 3.
    for (let index = 0; index < 36; index += 1) world.update(1 / 60, frame({ x: 0, y: 1 }));
    expect(world.roomId).toBe("lightwingCrystalCavern");
  });

  it("enters and leaves the guardian arena through matching cave edges", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "spiritClothStonescaleDepths" });
    world.setSpiritClothStonescaleDepthsForQa("antechamber");
    world.active.pos = {
      x: SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoor.x,
      y: SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoor.y + 20,
    };
    advance(world, 0.6);
    world.update(1 / 60, frame({ x: 0, y: -1 }));
    advance(world, 0.55);
    expect(world.roomId).toBe("crystalAltar");
    expect(world.active.pos).toEqual(CRYSTAL_ALTAR.spawn);
    expect(world.party.every((member) => member.facing.y < 0)).toBe(true);

    // The arrival is far enough inside the altar corridor that continuing
    // the approach direction cannot immediately bounce the party back.
    for (let index = 0; index < 36; index += 1) world.update(1 / 60, frame({ x: 0, y: 1 }));
    expect(world.roomId).toBe("crystalAltar");

    world.active.pos = { x: CRYSTAL_ALTAR.spawn.x, y: CRYSTAL_ALTAR.retreatY - 24 };
    advance(world, 0.6);
    world.update(1 / 60, frame({ x: 0, y: 1 }));
    advance(world, 0.55);
    expect(world.roomId).toBe("spiritClothStonescaleDepths");
    expect(world.active.pos).toEqual(SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoorInnerSpawn);
    expect(world.party.every((member) => member.facing.y > 0)).toBe(true);
  });

  it("drives musicScene directly from Layer 1 encounter combat", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "mossRootRuins" });
    expect(world.musicScene).toBe("exploration");
    world.setMossRootEncounterForQa("mossIntro", "active");
    expect(world.musicScene).toBe("battle");
    world.setMossRootEncounterForQa("mossIntro", "dormant");
    expect(world.musicScene).toBe("exploration");
  });

  it("drives musicScene directly from Layer 2 encounter combat", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "lightwingCrystalCavern" });
    expect(world.musicScene).toBe("exploration");
    world.setLightwingEncounterForQa("lightwingIntro", "active");
    expect(world.musicScene).toBe("battle");
    world.setLightwingEncounterForQa("lightwingIntro", "dormant");
    expect(world.musicScene).toBe("exploration");
  });

  it("keeps musicScene in battle across Layer 3 multi-group participation", () => {
    const world = new GameWorld({ initialPhase: "playing", mode: "stage", initialRoomId: "spiritClothStonescaleDepths" });
    expect(world.musicScene).toBe("exploration");
    world.setDepthsMultiEncounterForQa("depthsSpiritEntry", "depthsSpiritLamp");
    expect(world.musicScene).toBe("battle");
    for (const enemy of depthsEnemiesFor(world, "depthsSpiritEntry")) enemy.alive = false;
    advance(world, 0.2);
    expect(world.musicScene).toBe("battle");
    world.setDepthsEncounterForQa("depthsSpiritLamp", "dormant");
    expect(world.musicScene).toBe("exploration");
  });
});
