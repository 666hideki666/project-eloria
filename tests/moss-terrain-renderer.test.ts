import { describe, expect, it, vi } from "vitest";
import type { WorldSnapshot } from "../src/game/types";
import { Renderer } from "../src/render/Renderer";
import {
  MOSS_PALETTE,
  MOSS_ROOT_BACKDROP_META,
  MOSS_ROOT_SCENE_DECORATIONS,
  drawMossRootRuinsBackground,
  drawMossRootRuinsCrystal,
  drawMossRootRuinsForeground,
  mossRootCrystalDepthY,
  mossRootNeighborMask,
  mossTerrainVariant,
} from "../src/render/stages/MossRootRuinsRenderer";
import {
  MOSS_ROOT_LANDMARKS,
  MOSS_ROOT_RUINS,
  MOSS_ROOT_RUINS_TILES,
  MOSS_ROOT_SOLID_PROPS,
  tileAt,
} from "../src/stage/maps/mossRootRuinsMap";

function terrainContext(): CanvasRenderingContext2D {
  return {
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function terrainSnapshot(x: number, y: number): WorldSnapshot {
  return {
    time: 1.25,
    clearedEncounters: [],
    camera: { x, y, viewportWidth: 640, viewportHeight: 360 },
  } as unknown as WorldSnapshot;
}

describe("moss-root core terrain renderer", () => {
  it("uses stable, bounded terrain variants and an explicit palette", () => {
    expect(mossTerrainVariant(18, 27, 4)).toBe(mossTerrainVariant(18, 27, 4));
    expect(mossTerrainVariant(18, 27, 4)).toBeGreaterThanOrEqual(0);
    expect(mossTerrainVariant(18, 27, 4)).toBeLessThan(4);
    expect(MOSS_PALETTE.waterBase).toBe("#0b4844");
    expect(MOSS_PALETTE.rootLight).toBe("#725332");
  });

  it("maps the authored square backdrop onto the existing scrolling world", () => {
    expect(MOSS_ROOT_BACKDROP_META.sourceWidth).toBe(1295);
    expect(MOSS_ROOT_BACKDROP_META.sourceHeight).toBe(1214);
    expect(MOSS_ROOT_BACKDROP_META.worldWidth).toBe(MOSS_ROOT_RUINS.width);
    expect(MOSS_ROOT_BACKDROP_META.worldHeight).toBe(MOSS_ROOT_RUINS.height);
    expect(MOSS_ROOT_BACKDROP_META.worldWidth / MOSS_ROOT_BACKDROP_META.worldHeight).toBeCloseTo(2048 / 1920);
  });

  it("draws the crystal once at the solid pedestal's footpoint, not in the background", () => {
    const context = terrainContext();
    const snapshot = {
      ...terrainSnapshot(MOSS_ROOT_RUINS.crystal.x - 320, MOSS_ROOT_RUINS.crystal.y - 180),
      northGateUnlocked: false,
      gateUnlockProgress: 0,
    } as WorldSnapshot;
    const crystalShadow = [
      MOSS_ROOT_RUINS.crystal.x,
      MOSS_ROOT_RUINS.crystal.y + 5,
      29, 9, 0, 0, Math.PI * 2,
    ];
    expect(mossRootCrystalDepthY()).toBe(MOSS_ROOT_SOLID_PROPS[0].center.y);
    drawMossRootRuinsBackground(context, snapshot);
    expect(context.ellipse).not.toHaveBeenCalledWith(...crystalShadow);
    drawMossRootRuinsCrystal(context, snapshot);
    expect(context.ellipse).toHaveBeenCalledWith(...crystalShadow);
    expect((context.ellipse as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call: unknown[]) => call.every((value, index) => value === crystalShadow[index]),
    )).toHaveLength(1);
  });

  it("sorts the crystal between actors behind and in front of its stone base", () => {
    const order: string[] = [];
    const renderer = Object.create(Renderer.prototype) as Renderer;
    const hooks = renderer as unknown as {
      drawCharacter: (member: { id: string }) => void;
      drawEnemy: (enemy: { id: number }) => void;
      drawActors: (snapshot: WorldSnapshot, overlays: readonly { y: number; draw: () => void }[]) => void;
    };
    hooks.drawCharacter = (member) => { order.push(member.id); };
    hooks.drawEnemy = (enemy) => { order.push(`enemy${enemy.id}`); };
    const depthY = mossRootCrystalDepthY();
    const snapshot = {
      partyPresence: "formation",
      activeId: "kyle",
      party: [
        { id: "kyle", pos: { x: 0, y: depthY - 1 } },
        { id: "nadi", pos: { x: 0, y: depthY + 1 } },
      ],
      enemies: [{ id: 3, alive: true, pos: { x: 0, y: depthY + 2 } }],
      velgran: null,
    } as unknown as WorldSnapshot;
    hooks.drawActors(snapshot, [{ y: depthY, draw: () => { order.push("crystal"); } }]);
    expect(order).toEqual(["kyle", "crystal", "nadi", "enemy3"]);

    order.length = 0;
    hooks.drawActors({ ...snapshot, partyPresence: "solo", activeId: "nadi" }, [
      { y: depthY, draw: () => { order.push("crystal"); } },
    ]);
    expect(order).toEqual(["crystal", "nadi", "enemy3"]);

    order.length = 0;
    hooks.drawActors(snapshot, [
      { y: depthY - 2, draw: () => { order.push("rear crystal"); } },
      { y: depthY + 0.5, draw: () => { order.push("front crystal"); } },
    ]);
    expect(order).toEqual(["rear crystal", "kyle", "front crystal", "nadi", "enemy3"]);
  });

  it("resolves neighbour masks safely at every map edge", () => {
    for (let row = 0; row < MOSS_ROOT_RUINS.rows; row += 1) {
      for (let column = 0; column < MOSS_ROOT_RUINS.columns; column += 1) {
        const mask = mossRootNeighborMask(column, row, tileAt(column, row));
        expect(mask).toBeGreaterThanOrEqual(0);
        expect(mask).toBeLessThan(16);
      }
    }
    expect(MOSS_ROOT_RUINS_TILES).toHaveLength(60);
  });

  it("keeps curated scene dressing bounded, varied, and collision-neutral", () => {
    expect(MOSS_ROOT_SCENE_DECORATIONS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(MOSS_ROOT_SCENE_DECORATIONS.map((item) => item.kind))).toEqual(
      new Set(["crystal", "pillar", "root", "rubble", "moss"]),
    );
    for (const decoration of MOSS_ROOT_SCENE_DECORATIONS) {
      expect(decoration.x).toBeGreaterThanOrEqual(0);
      expect(decoration.x).toBeLessThanOrEqual(MOSS_ROOT_RUINS.width);
      expect(decoration.y).toBeGreaterThanOrEqual(0);
      expect(decoration.y).toBeLessThanOrEqual(MOSS_ROOT_RUINS.height);
      expect(decoration.size).toBeGreaterThan(0);
      expect(decoration.size).toBeLessThanOrEqual(64);
    }
  });

  it("draws all named plaza compositions with camera culling", () => {
    const context = terrainContext();
    const landmarks = [
      MOSS_ROOT_LANDMARKS.transferPlaza,
      MOSS_ROOT_LANDMARKS.introPlaza,
      MOSS_ROOT_LANDMARKS.centralPlaza,
      MOSS_ROOT_LANDMARKS.rightPlaza,
      MOSS_ROOT_LANDMARKS.finalPlaza,
    ];
    for (const landmark of landmarks) {
      const snapshot = terrainSnapshot(
        Math.max(0, Math.min(MOSS_ROOT_RUINS.width - 640, landmark.x - 320)),
        Math.max(0, Math.min(MOSS_ROOT_RUINS.height - 360, landmark.y - 180)),
      );
      expect(() => drawMossRootRuinsBackground(context, snapshot)).not.toThrow();
    }
    expect(context.fillRect).toHaveBeenCalled();
  });

  it("draws representative camera views without reading outside the tile map", () => {
    const context = terrainContext();
    for (const [x, y] of [[0, 0], [1408, 0], [0, 1560], [1408, 1560]] as const) {
      const snapshot = terrainSnapshot(x, y);
      expect(() => drawMossRootRuinsBackground(context, snapshot)).not.toThrow();
      expect(() => drawMossRootRuinsForeground(context, snapshot)).not.toThrow();
    }
    expect(context.fillRect).toHaveBeenCalled();
  });
});
