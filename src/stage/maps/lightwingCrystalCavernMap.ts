import { VIEW } from "../../config";
import walkabilityData from "../../../assets/environments/lightwing-crystal-cavern/lightwing-crystal-cavern-walkability-v2.rle.json";
import type { EnemyKind, Vec2 } from "../../game/types";
import type { ScrollingStageDefinition } from "../types";

const TILE_SIZE = 32;
const WORLD_COLUMNS = 72;
const WORLD_ROWS = 42;
const WORLD_WIDTH = WORLD_COLUMNS * TILE_SIZE;
const WORLD_HEIGHT = WORLD_ROWS * TILE_SIZE;

export const LIGHTWING_BACKDROP_TRANSFORM = {
  sourceWidth: 1638,
  sourceHeight: 960,
  worldRect: { x: 0, y: 0, width: WORLD_WIDTH, height: WORLD_HEIGHT },
} as const;

export function lightwingSourceToWorld(point: Vec2): Vec2 {
  return { x: point.x / 1638 * WORLD_WIDTH, y: point.y / 960 * WORLD_HEIGHT };
}

export function lightwingWorldToSource(point: Vec2): Vec2 {
  return { x: point.x / WORLD_WIDTH * 1638, y: point.y / WORLD_HEIGHT * 960 };
}

type Span = readonly [number, number];
const walkability = walkabilityData as unknown as {
  version: number; sourceWidth: number; sourceHeight: number;
  staticRows: readonly (readonly Span[])[];
  bridgeRows: readonly (readonly Span[])[];
};
if (walkability.sourceWidth !== 1638 || walkability.sourceHeight !== 960) {
  throw new Error("Lightwing redline mask must match the native background image");
}

function inSpans(spans: readonly Span[], x: number): boolean {
  let low = 0; let high = spans.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const span = spans[middle]!;
    if (x < span[0]) high = middle - 1;
    else if (x >= span[1]) low = middle + 1;
    else return true;
  }
  return false;
}

export function lightwingNavigationSourcePixel(x: number, y: number, bridgeOpen: boolean): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= 1638 || y >= 960) return false;
  const sourceX = Math.floor(x + 1e-7);
  const sourceY = Math.floor(y + 1e-7);
  return inSpans(walkability.staticRows[sourceY] ?? [], sourceX) ||
    (bridgeOpen && inSpans(walkability.bridgeRows[sourceY] ?? [], sourceX));
}

export function lightwingNavigationPoint(point: Vec2, bridgeOpen: boolean): boolean {
  const source = lightwingWorldToSource(point);
  return lightwingNavigationSourcePixel(source.x, source.y, bridgeOpen);
}

export function lightwingBridgeSourcePixel(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < 1638 && y < 960 &&
    inSpans(walkability.bridgeRows[Math.floor(y)] ?? [], Math.floor(x));
}

export const LIGHTWING_CRYSTAL_CAVERN: ScrollingStageDefinition & {
  primaryCrystal: Vec2;
  secondaryCrystal: Vec2;
  spring: Vec2;
  returnGate: Vec2;
  returnGateHalfWidth: number;
  returnGateInnerSpawn: Vec2;
  layerGate: Vec2;
  layerGateHalfWidth: number;
  layerGateInnerSpawn: Vec2;
} = {
  id: "lightwingCrystalCavern",
  name: "晶界・光羽の晶洞",
  tileSize: TILE_SIZE,
  columns: WORLD_COLUMNS,
  rows: WORLD_ROWS,
  width: WORLD_COLUMNS * TILE_SIZE,
  height: WORLD_ROWS * TILE_SIZE,
  /** South entrance from Layer 1; leave enough room to turn back naturally. */
  spawn: lightwingSourceToWorld({ x: 475, y: 900 }),
  primaryCrystal: lightwingSourceToWorld({ x: 300, y: 194 }),
  secondaryCrystal: lightwingSourceToWorld({ x: 170, y: 630 }),
  spring: lightwingSourceToWorld({ x: 565, y: 375 }),
  returnGate: lightwingSourceToWorld({ x: 475, y: 950 }),
  returnGateHalfWidth: 44,
  returnGateInnerSpawn: lightwingSourceToWorld({ x: 475, y: 900 }),
  goal: lightwingSourceToWorld({ x: 1456, y: 110 }),
  layerGate: lightwingSourceToWorld({ x: 1456, y: 110 }),
  layerGateHalfWidth: 48,
  layerGateInnerSpawn: lightwingSourceToWorld({ x: 1415, y: 245 }),
  cameraBounds: {
    left: 0,
    top: 0,
    right: WORLD_COLUMNS * TILE_SIZE - VIEW.width,
    bottom: WORLD_ROWS * TILE_SIZE - VIEW.height,
  },
  progression: "westToEast",
};

export const LIGHTWING_SOLID_PROPS = [
  { id: "primaryCrystal", center: LIGHTWING_CRYSTAL_CAVERN.primaryCrystal, radiusX: 40, radiusY: 23 },
  { id: "secondaryCrystal", center: LIGHTWING_CRYSTAL_CAVERN.secondaryCrystal, radiusX: 40, radiusY: 23 },
] as const;

export type LightwingCrystalTile =
  | "floor"
  | "wall"
  | "water"
  | "bridge"
  | "platformLocked"
  | "platform"
  | "void"
  | "returnPassage"
  | "layerGate";

export type LightwingEncounterGroupId =
  | "lightwingIntro"
  | "lightwingDraft"
  | "lightwingDeadEnd"
  | "mixedChannel"
  | "lightwingNest";
export type LightwingEncounterGroupState = "dormant" | "noticed" | "active" | "cleared";

export interface LightwingEncounterEnemy {
  kind: "mossPlun" | "lumibane";
  pos: Vec2;
}

export interface LightwingEncounterDefinition {
  id: LightwingEncounterGroupId;
  required: boolean;
  detectionRadius: number;
  enemies: readonly LightwingEncounterEnemy[];
}

type TilePoint = readonly [number, number];

/** Five sequential sections of the lake bridge, west to east. */
export const LIGHTWING_PLATFORM_RISE_STEPS: readonly Vec2[] = [
  lightwingSourceToWorld({ x: 830, y: 390 }),
  lightwingSourceToWorld({ x: 905, y: 382 }),
  lightwingSourceToWorld({ x: 980, y: 380 }),
  lightwingSourceToWorld({ x: 1055, y: 383 }),
  lightwingSourceToWorld({ x: 1130, y: 395 }),
] as const;

function buildTiles(): readonly (readonly LightwingCrystalTile[])[] {
  const grid = Array.from({ length: WORLD_ROWS }, () =>
    Array<LightwingCrystalTile>(WORLD_COLUMNS).fill("void"));
  const paintEllipse = (cx: number, cy: number, rx: number, ry: number, tile: LightwingCrystalTile) => {
    for (let row = Math.max(0, Math.floor(cy - ry - 1)); row <= Math.min(WORLD_ROWS - 1, Math.ceil(cy + ry + 1)); row += 1) {
      for (let column = Math.max(0, Math.floor(cx - rx - 1)); column <= Math.min(WORLD_COLUMNS - 1, Math.ceil(cx + rx + 1)); column += 1) {
        const dx = (column + 0.5 - cx) / rx;
        const dy = (row + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1 + ((column * 13 + row * 19) % 5 - 2) * 0.015) grid[row]![column] = tile;
      }
    }
  };
  const path = (points: readonly TilePoint[], width: number, tile: LightwingCrystalTile = "floor") => {
    for (let index = 1; index < points.length; index += 1) {
      const [sx, sy] = points[index - 1]!;
      const [ex, ey] = points[index]!;
      const steps = Math.max(1, Math.ceil(Math.hypot(ex - sx, ey - sy) * 4));
      for (let step = 0; step <= steps; step += 1) {
        const t = step / steps;
        paintEllipse(sx + (ex - sx) * t, sy + (ey - sy) * t, width / 2, width * 0.42, tile);
      }
    }
  };

  // A–L: a deliberately winding left-to-right cave route.  Each large
  // ellipse reads as one landmark, while the narrow links make the camera
  // reveal the route gradually instead of presenting one long corridor.
  paintEllipse(5.5, 27.5, 4.2, 3.1, "floor"); // A arrival
  // The Layer 1 connection enters from the south.  This is intentionally a
  // quiet, broad lead-in before the first lumibane at B.
  paintEllipse(13, 38.5, 3.4, 3.0, "floor"); // south return arch
  paintEllipse(14, 30, 5.8, 3.8, "floor"); // B shallow lake
  paintEllipse(23, 14, 5.7, 4.2, "floor"); // C draft chamber
  paintEllipse(34, 10, 4.5, 3.4, "floor"); // D primary crystal
  paintEllipse(34, 4.8, 3.4, 2.4, "floor"); // E optional bridge pocket
  paintEllipse(34, 28, 5.1, 3.5, "floor"); // F lower channel
  paintEllipse(45, 31, 5.8, 4.1, "floor"); // G mixed chamber
  // H used to be a separate spring plaza. The recovery landmark now belongs
  // to the large lake below, so this remains an ordinary shoreline bend.
  paintEllipse(54, 35, 3.8, 3.1, "floor");
  paintEllipse(58, 29, 3.8, 3.2, "floor"); // I secondary crystal
  paintEllipse(65, 10, 5.7, 5.2, "floor"); // K nest
  paintEllipse(68, 3.8, 3.4, 2.8, "floor"); // L upper gate

  path([[13, 38.5], [13.4, 34.6], [14, 30]], 3.8);
  // Keep the Layer 1 return route as an ordinary two-tile cave corridor all
  // the way to the south edge. It must never depend on the northern gate.
  for (let row = 38; row < WORLD_ROWS; row += 1) {
    grid[row]![12] = "returnPassage";
    grid[row]![13] = "returnPassage";
  }
  path([[5.5, 27.5], [9.5, 28.2], [14, 30]], 4.0);
  path([[15, 27.5], [17, 23], [19.5, 18], [23, 14]], 3.4);
  path([[27, 13], [30.5, 11.2], [34, 10]], 3.5);
  path([[34, 12.8], [31, 17.5], [30.5, 23], [34, 28]], 3.4);
  path([[38, 29], [41, 32.3], [45, 31]], 3.6);
  path([[49, 32.5], [52, 34.5], [54, 35]], 3.5);
  path([[55.8, 33.2], [57.2, 31.2], [58, 29]], 3.2);
  path([[34, 7.4], [34, 5.1]], 2.8); // optional E branch

  // Central flooded rift.  The activation-only platform chain is painted on
  // top of this water, so it becomes the sole crossing to the nest.
  paintEllipse(51.5, 19.5, 13.2, 10.8, "water");
  // A permanent, narrow causeway reaches a small shore-side sanctuary. It
  // deliberately stops at the lake shrine and is not an enemy home or a
  // bypass for the activation-only crystal platforms.
  path([[49, 32.3], [51, 31.2], [52.4, 29.7], [54, 28.1]], 3.0, "bridge");
  paintEllipse(54, 27.45, 2.25, 1.35, "bridge");
  path([[55.8, 28.2], [58, 29]], 3.0, "bridge");
  path([[59.5, 27.3], [61.5, 24.5], [62.5, 21], [63.5, 18], [64, 15], [65, 12]], 2.1, "platformLocked");
  path([[65, 8], [67, 6], [68, 4]], 3.2);
  // A narrow, north-facing stair/cave throat reaches the actual map edge.
  // Only its visible two-tile opening is traversable when the nest is clear.
  for (let row = 0; row <= 4; row += 1) {
    grid[row]![67] = "layerGate";
    grid[row]![68] = "layerGate";
  }

  // The bridge is a distinct traversable landmark.  Keep plazas free of
  // isolated one-tile blockers so their walkable area reads clearly and can
  // safely host an encounter group.
  for (let row = 28; row <= 31; row += 1) {
    for (let column = 10; column <= 12; column += 1) {
      if (grid[row]?.[column] === "floor") grid[row]![column] = "bridge";
    }
  }
  // Every walkable tile is sealed by a continuous one-tile rock rim (or the
  // authored lake).  This deliberately avoids the old hash-selected holes,
  // where a finished floor could touch black void directly.
  const result = grid.map((row) => [...row]);
  const traversable = (tile: LightwingCrystalTile) => tile === "floor" || tile === "bridge" || tile === "platformLocked" || tile === "returnPassage" || tile === "layerGate";
  for (let row = 0; row < WORLD_ROWS; row += 1) {
    for (let column = 0; column < WORLD_COLUMNS; column += 1) {
      if (grid[row]![column] !== "void") continue;
      let nearWalkable = false;
      for (let oy = -1; oy <= 1; oy += 1) for (let ox = -1; ox <= 1; ox += 1) {
        if (traversable(grid[row + oy]?.[column + ox] ?? "void")) nearWalkable = true;
      }
      if (nearWalkable) result[row]![column] = "wall";
    }
  }
  return result;
}

/** Compatibility tile grid for encounter placement and fallback rendering.
 * Pixel navigation always uses the redline spans above, never these tiles. */
export const LIGHTWING_CRYSTAL_CAVERN_TILES: readonly (readonly LightwingCrystalTile[])[] = (() => {
  const fallback = buildTiles();
  return fallback.map((row, rowIndex) => row.map((_tile, column) => {
    const world = { x: (column + 0.5) * TILE_SIZE, y: (rowIndex + 0.5) * TILE_SIZE };
    const source = lightwingWorldToSource(world);
    if (lightwingNavigationPoint(world, false)) {
      if (source.x >= 1430 && source.x <= 1480 && source.y <= 130) return "layerGate";
      if (source.y >= 940 && source.x >= 440 && source.x <= 510) return "returnPassage";
      return "floor";
    }
    if (lightwingBridgeSourcePixel(source.x, source.y)) return "platformLocked";
    if (source.x >= 770 && source.x <= 1210 && source.y >= 350 && source.y <= 450) return "water";
    return "void";
  }));
})();

export const LIGHTWING_ENCOUNTERS: readonly LightwingEncounterDefinition[] = [
  { id: "lightwingIntro", required: true, detectionRadius: 116, enemies: [{ kind: "lumibane", pos: lightwingSourceToWorld({ x: 470, y: 760 }) }] },
  { id: "lightwingDraft", required: true, detectionRadius: 124, enemies: [
    { kind: "lumibane", pos: lightwingSourceToWorld({ x: 330, y: 440 }) }, { kind: "lumibane", pos: lightwingSourceToWorld({ x: 405, y: 472 }) }, { kind: "lumibane", pos: lightwingSourceToWorld({ x: 650, y: 455 }) },
  ] },
  { id: "lightwingDeadEnd", required: false, detectionRadius: 120, enemies: [
    { kind: "lumibane", pos: lightwingSourceToWorld({ x: 245, y: 185 }) }, { kind: "lumibane", pos: lightwingSourceToWorld({ x: 345, y: 185 }) },
  ] },
  { id: "mixedChannel", required: true, detectionRadius: 132, enemies: [
    { kind: "mossPlun", pos: lightwingSourceToWorld({ x: 120, y: 615 }) }, { kind: "mossPlun", pos: lightwingSourceToWorld({ x: 240, y: 610 }) },
    { kind: "lumibane", pos: lightwingSourceToWorld({ x: 145, y: 665 }) }, { kind: "lumibane", pos: lightwingSourceToWorld({ x: 220, y: 665 }) },
  ] },
  { id: "lightwingNest", required: true, detectionRadius: 140, enemies: [
    { kind: "lumibane", pos: lightwingSourceToWorld({ x: 1360, y: 215 }) }, { kind: "lumibane", pos: lightwingSourceToWorld({ x: 1450, y: 235 }) },
    { kind: "lumibane", pos: lightwingSourceToWorld({ x: 1410, y: 285 }) }, { kind: "lumibane", pos: lightwingSourceToWorld({ x: 1500, y: 275 }) },
  ] },
] as const;

/** Known-central floor anchors used only if a malformed authored point cannot
 * be corrected by the deterministic local ring search. */
export const LIGHTWING_SAFE_GROUP_ANCHORS: Record<LightwingEncounterGroupId, Vec2> = {
  lightwingIntro: lightwingSourceToWorld({ x: 470, y: 760 }),
  lightwingDraft: lightwingSourceToWorld({ x: 405, y: 472 }),
  lightwingDeadEnd: lightwingSourceToWorld({ x: 245, y: 185 }),
  mixedChannel: lightwingSourceToWorld({ x: 120, y: 615 }),
  lightwingNest: lightwingSourceToWorld({ x: 1415, y: 245 }),
};

export const LIGHTWING_ENEMY_GROUP = new Map<number, LightwingEncounterGroupId>();
let enemyId = 1;
for (const group of LIGHTWING_ENCOUNTERS) {
  for (const _enemy of group.enemies) {
    LIGHTWING_ENEMY_GROUP.set(enemyId, group.id);
    enemyId += 1;
  }
}

export function lightwingTileAt(column: number, row: number): LightwingCrystalTile {
  return LIGHTWING_CRYSTAL_CAVERN_TILES[row]?.[column] ?? "void";
}

/** Returns the reveal chunk for a crystal-platform tile, if it has one. */
export function lightwingPlatformRiseStepAt(column: number, row: number): number | null {
  const center = { x: column * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  LIGHTWING_PLATFORM_RISE_STEPS.forEach((step, index) => {
    const distance = Math.hypot(center.x - step.x, center.y - step.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  // The painted route is deliberately wider than a single tile around each
  // authored step.  Every locked route tile belongs to its closest rise
  // chunk, so no dormant stone is accidentally visible before its cue.
  return bestIndex >= 0 ? bestIndex : null;
}

export function isLightwingTileWalkable(tile: LightwingCrystalTile, pathUnlocked: boolean, gateOpen: boolean): boolean {
  return tile === "floor" || tile === "bridge" || tile === "returnPassage" || (tile === "platformLocked" && pathUnlocked) || (tile === "platform" && pathUnlocked) || (tile === "layerGate" && gateOpen);
}

export interface LightwingSpawnOccupant {
  pos: Vec2;
  radius: number;
}

export interface LightwingReachabilityOptions {
  crystalPathUnlocked: boolean;
  layerGateOpen: boolean;
}

const tileKey = (column: number, row: number) => `${column},${row}`;

const lightwingReachabilityCache = new Map<string, ReadonlySet<string>>();

/** Source-pixel flood fill follows the actual red outline through narrow
 * bends that the 32px compatibility tiles can miss. */
export function lightwingReachableTiles(options: LightwingReachabilityOptions): ReadonlySet<string> {
  const cacheKey = `${options.crystalPathUnlocked}:${options.layerGateOpen}`;
  const cached = lightwingReachabilityCache.get(cacheKey);
  if (cached) return cached;
  const width = 1638;
  const height = 960;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const spawn = lightwingWorldToSource(LIGHTWING_CRYSTAL_CAVERN.spawn);
  const start = Math.floor(spawn.y) * width + Math.floor(spawn.x);
  queue[0] = start;
  visited[start] = 1;
  let head = 0;
  let tail = 1;
  const reached = new Set<string>();
  while (head < tail) {
    const index = queue[head++]!;
    const x = index % width;
    const y = Math.floor(index / width);
    const world = lightwingSourceToWorld({ x, y });
    reached.add(tileKey(Math.floor(world.x / TILE_SIZE), Math.floor(world.y / TILE_SIZE)));
    for (const neighbor of [index - 1, index + 1, index - width, index + width]) {
      if (neighbor < 0 || neighbor >= visited.length || visited[neighbor]) continue;
      const nx = neighbor % width;
      const ny = Math.floor(neighbor / width);
      if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;
      if (!lightwingNavigationSourcePixel(nx, ny, options.crystalPathUnlocked)) continue;
      visited[neighbor] = 1;
      queue[tail++] = neighbor;
    }
  }
  lightwingReachabilityCache.set(cacheKey, reached);
  return reached;
}

/** Enemy homes deliberately stay on ordinary floor/bridge, never lake or a
 * progression-only platform.  This mirrors collision without importing the
 * collision module (which itself depends on this map). */
export function isLightwingEnemySpawnSafe(
  point: Vec2,
  radius: number,
  occupied: readonly LightwingSpawnOccupant[] = [],
  reachable?: ReadonlySet<string>,
): boolean {
  if (
    point.x - radius < 0 || point.y - radius < 0 ||
    point.x + radius >= LIGHTWING_CRYSTAL_CAVERN.width ||
    point.y + radius >= LIGHTWING_CRYSTAL_CAVERN.height
  ) return false;
  for (const prop of LIGHTWING_SOLID_PROPS) {
    const dx = (point.x - prop.center.x) / (prop.radiusX + radius);
    const dy = (point.y - prop.center.y) / (prop.radiusY + radius);
    if (dx * dx + dy * dy <= 1) return false;
  }
  if (!lightwingNavigationPoint(point, false)) return false;
  if (reachable && !reachable.has(tileKey(Math.floor(point.x / TILE_SIZE), Math.floor(point.y / TILE_SIZE)))) return false;
  return occupied.every((other) => Math.hypot(point.x - other.pos.x, point.y - other.pos.y) >= radius + other.radius + 16);
}

/** Deterministic expanding-ring correction for authored enemy homes. */
export function findNearestSafeLightwingEnemySpawn(
  desired: Vec2,
  radius: number,
  _kind: EnemyKind,
  occupied: readonly LightwingSpawnOccupant[] = [],
  reachable?: ReadonlySet<string>,
): Vec2 | null {
  if (isLightwingEnemySpawnSafe(desired, radius, occupied, reachable)) return { ...desired };
  for (let distance = 16; distance <= 160; distance += 16) {
    for (let step = 0; step < 16; step += 1) {
      const angle = (Math.PI * 2 * step) / 16;
      const candidate = {
        x: Math.round(desired.x + Math.cos(angle) * distance),
        y: Math.round(desired.y + Math.sin(angle) * distance),
      };
      if (isLightwingEnemySpawnSafe(candidate, radius, occupied, reachable)) return candidate;
    }
  }
  return null;
}
