import { VIEW } from "../../config";
import mossRootWalkabilityData from "../../../assets/environments/moss-root-ruins/moss-root-ruins-walkability-v2.rle.json";
import type { Vec2 } from "../../game/types";
import type { ScrollingStageDefinition } from "../types";

const WORLD_COLUMNS = 64;
const WORLD_ROWS = 60;
const TILE_SIZE = 32;
const WORLD_WIDTH = WORLD_COLUMNS * TILE_SIZE;
const WORLD_HEIGHT = WORLD_ROWS * TILE_SIZE;

export const MOSS_ROOT_BACKDROP_TRANSFORM = {
  sourceWidth: 1295,
  sourceHeight: 1214,
  worldRect: { x: 0, y: 0, width: WORLD_WIDTH, height: WORLD_HEIGHT },
} as const;

export function mossRootBackdropSourceToWorld(point: Vec2): Vec2 {
  const { sourceWidth, sourceHeight, worldRect } = MOSS_ROOT_BACKDROP_TRANSFORM;
  return {
    x: worldRect.x + point.x / sourceWidth * worldRect.width,
    y: worldRect.y + point.y / sourceHeight * worldRect.height,
  };
}

export function mossRootBackdropWorldToSource(point: Vec2): Vec2 {
  const { sourceWidth, sourceHeight, worldRect } = MOSS_ROOT_BACKDROP_TRANSFORM;
  return {
    x: (point.x - worldRect.x) / worldRect.width * sourceWidth,
    y: (point.y - worldRect.y) / worldRect.height * sourceHeight,
  };
}

const ROOT_GATE_SOURCE_CENTER = { x: 648, y: 300 } as const;
const ROOT_GATE_ROTATION = 0;
const rootGateCenter = mossRootBackdropSourceToWorld(ROOT_GATE_SOURCE_CENTER);
const rootGateApproach = mossRootBackdropSourceToWorld({ x: 648, y: 360 });
const rootGateBeyond = mossRootBackdropSourceToWorld({ x: 648, y: 235 });
const rootGateRouteLength = Math.hypot(
  rootGateBeyond.x - rootGateApproach.x,
  rootGateBeyond.y - rootGateApproach.y,
);

/**
 * One transform owns the seal art, collision, effects and QA positions. The
 * long axis spans the final stair bottleneck rather than following the
 * obsolete straight-ahead route.
 */
export const MOSS_ROOT_GATE_TRANSFORM = {
  sourceCenter: ROOT_GATE_SOURCE_CENTER,
  center: rootGateCenter,
  rotation: ROOT_GATE_ROTATION,
  tangent: { x: Math.cos(ROOT_GATE_ROTATION), y: Math.sin(ROOT_GATE_ROTATION) },
  visualWidth: 196,
  visualHeight: 98,
  visualBaseline: 36,
  collision: {
    center: rootGateCenter,
    width: 190,
    height: 52,
    rotation: ROOT_GATE_ROTATION,
  },
  approach: rootGateApproach,
  beyond: rootGateBeyond,
  routeDirection: {
    x: (rootGateBeyond.x - rootGateApproach.x) / rootGateRouteLength,
    y: (rootGateBeyond.y - rootGateApproach.y) / rootGateRouteLength,
  },
} as const;

export const MOSS_ROOT_LANDMARKS = {
  transferPlaza: { x: 1024, y: 1594 },
  crystal: mossRootBackdropSourceToWorld({ x: 1160, y: 525 }),
  rootGate: MOSS_ROOT_GATE_TRANSFORM.center,
  introPlaza: { x: 1024, y: 1594 },
  waterRuins: mossRootBackdropSourceToWorld({ x: 202, y: 526 }),
  centralPlaza: { x: 1024, y: 640 },
  deadEnd: mossRootBackdropSourceToWorld({ x: 350, y: 230 }),
  crossing: { x: 1024, y: 992 },
  rightPlaza: mossRootBackdropSourceToWorld({ x: 1160, y: 525 }),
  rootMaze: mossRootBackdropSourceToWorld({ x: 430, y: 330 }),
  finalPlaza: { x: 1024, y: 220 },
  layerGate: { x: 1024, y: 16 },
} as const;

export const MOSS_ROOT_RUINS: ScrollingStageDefinition & {
  crystal: Vec2;
  layerGate: Vec2;
  layerGateHalfWidth: number;
  layerGateInnerSpawn: Vec2;
  southExit: Vec2;
  southExitHalfWidth: number;
} = {
  id: "mossRootRuins",
  name: "晶界・苔根の遺構",
  tileSize: TILE_SIZE,
  columns: WORLD_COLUMNS,
  rows: WORLD_ROWS,
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  spawn: { x: 1024, y: 1840 },
  crystal: MOSS_ROOT_LANDMARKS.crystal,
  goal: MOSS_ROOT_LANDMARKS.layerGate,
  layerGate: MOSS_ROOT_LANDMARKS.layerGate,
  layerGateHalfWidth: 48,
  layerGateInnerSpawn: { x: 1024, y: 144 },
  southExit: { x: 1024, y: 1890 },
  southExitHalfWidth: 40,
  cameraBounds: {
    left: 0,
    top: 0,
    right: WORLD_WIDTH - VIEW.width,
    bottom: WORLD_HEIGHT - VIEW.height,
  },
  progression: "southToNorth",
};

/**
 * Landmark collision stays separate from the 32px tile layout.  These small
 * ellipses cover only the visible stone bases, so the player can still walk
 * around (and interact with) the tall silhouettes above them.
 */
export const MOSS_ROOT_SOLID_PROPS = [
  {
    id: "transferCrystal",
    center: mossRootBackdropSourceToWorld({ x: 1160, y: 535 }),
    radiusX: 23 / MOSS_ROOT_BACKDROP_TRANSFORM.sourceWidth * WORLD_WIDTH,
    radiusY: 14 / MOSS_ROOT_BACKDROP_TRANSFORM.sourceHeight * WORLD_HEIGHT,
  },
  {
    id: "westRuinArch",
    center: mossRootBackdropSourceToWorld({ x: 202, y: 478 }),
    radiusX: 20,
    radiusY: 18,
  },
] as const;

export type MossRootTile =
  | "floor"
  | "wall"
  | "root"
  | "water"
  | "bridge"
  | "void"
  | "gate"
  | "layerGate";
export type EncounterGroupId = "mossIntro" | "mossFork" | "mossDeadEnd" | "mossGate";
export type EncounterGroupState = "dormant" | "noticed" | "active" | "cleared";

export interface MossEncounterDefinition {
  id: EncounterGroupId;
  required: boolean;
  detectionRadius: number;
  enemies: readonly Vec2[];
}

interface MossRootWalkabilityRasterData {
  version: number;
  coordinateSpace: string;
  sourceWidth: number;
  sourceHeight: number;
  sha256: string;
  rows: readonly (readonly (readonly [number, number])[])[];
}

const mossRootWalkability = mossRootWalkabilityData as unknown as MossRootWalkabilityRasterData;
if (
  mossRootWalkability.sourceWidth !== MOSS_ROOT_BACKDROP_TRANSFORM.sourceWidth ||
  mossRootWalkability.sourceHeight !== MOSS_ROOT_BACKDROP_TRANSFORM.sourceHeight
) {
  throw new Error("Moss-root raster walkability mask must match the backdrop's native dimensions");
}

/** Metadata for the user's red-boundary-derived native floor mask. */
export const MOSS_ROOT_NAV_MASK_META = {
  version: mossRootWalkability.version,
  coordinateSpace: mossRootWalkability.coordinateSpace,
  sourceWidth: mossRootWalkability.sourceWidth,
  sourceHeight: mossRootWalkability.sourceHeight,
  sha256: mossRootWalkability.sha256,
} as const;

export const MOSS_ROOT_NAV_MASK_ROWS = mossRootWalkability.rows;

function rowContainsSourceX(
  spans: readonly (readonly [number, number])[],
  sourceX: number,
): boolean {
  let low = 0;
  let high = spans.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const span = spans[middle]!;
    if (sourceX < span[0]) high = middle - 1;
    else if (sourceX >= span[1]) low = middle + 1;
    else return true;
  }
  return false;
}

/** Exact lookup into the background-native binary walkability raster. */
export function isMossRootNavigationSourcePixel(sourceX: number, sourceY: number): boolean {
  if (
    sourceX < 0 || sourceY < 0 ||
    sourceX >= MOSS_ROOT_NAV_MASK_META.sourceWidth ||
    sourceY >= MOSS_ROOT_NAV_MASK_META.sourceHeight
  ) return false;
  return rowContainsSourceX(MOSS_ROOT_NAV_MASK_ROWS[sourceY] ?? [], sourceX);
}

export function isMossRootNavigationPoint(point: Vec2): boolean {
  const sourcePoint = mossRootBackdropWorldToSource(point);
  // Native integer source coordinates can round-trip through the world scale
  // as n - a few ulps; keep the authored pixel on that exact seam.
  return isMossRootNavigationSourcePixel(
    Math.floor(sourcePoint.x + 1e-7),
    Math.floor(sourcePoint.y + 1e-7),
  );
}

function orientedRectBounds(rect: { center: Vec2; width: number; height: number; rotation: number }) {
  const halfWidth = rect.width * 0.5;
  const halfHeight = rect.height * 0.5;
  const extentX = Math.abs(Math.cos(rect.rotation)) * halfWidth +
    Math.abs(Math.sin(rect.rotation)) * halfHeight;
  const extentY = Math.abs(Math.sin(rect.rotation)) * halfWidth +
    Math.abs(Math.cos(rect.rotation)) * halfHeight;
  return {
    x: rect.center.x - extentX,
    y: rect.center.y - extentY,
    width: extentX * 2,
    height: extentY * 2,
  };
}

export const MOSS_ROOT_NAV_BLOCKERS = {
  rootGate: orientedRectBounds(MOSS_ROOT_GATE_TRANSFORM.collision),
  layerGate: { x: 970, y: 0, width: 108, height: 72 },
} as const;

function tileCenterInsideRect(column: number, row: number, rect: { x: number; y: number; width: number; height: number }): boolean {
  const x = (column + 0.5) * TILE_SIZE;
  const y = (row + 0.5) * TILE_SIZE;
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function buildTiles(): readonly (readonly MossRootTile[])[] {
  const grid = Array.from({ length: MOSS_ROOT_RUINS.rows }, () =>
    Array<MossRootTile>(MOSS_ROOT_RUINS.columns).fill("void"));

  for (let row = 0; row < MOSS_ROOT_RUINS.rows; row += 1) {
    for (let column = 0; column < MOSS_ROOT_RUINS.columns; column += 1) {
      const center = { x: (column + 0.5) * TILE_SIZE, y: (row + 0.5) * TILE_SIZE };
      if (isMossRootNavigationPoint(center)) grid[row]![column] = "floor";
    }
  }

  const result = grid.map((row) => [...row]);
  for (let row = 0; row < MOSS_ROOT_RUINS.rows; row += 1) {
    for (let column = 0; column < MOSS_ROOT_RUINS.columns; column += 1) {
      if (grid[row]![column] !== "void") continue;
      let adjacent = false;
      for (let offsetY = -1; offsetY <= 1 && !adjacent; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (grid[row + offsetY]?.[column + offsetX] === "floor") {
            adjacent = true;
            break;
          }
        }
      }
      if (adjacent) result[row]![column] =
        (column * 11 + row * 7) % 7 === 0 ? "root" : "wall";
    }
  }

  for (let row = 0; row < MOSS_ROOT_RUINS.rows; row += 1) {
    for (let column = 0; column < MOSS_ROOT_RUINS.columns; column += 1) {
      if (result[row]![column] !== "floor") continue;
      if (tileCenterInsideRect(column, row, MOSS_ROOT_NAV_BLOCKERS.rootGate)) {
        result[row]![column] = "gate";
      } else if (tileCenterInsideRect(column, row, MOSS_ROOT_NAV_BLOCKERS.layerGate)) {
        result[row]![column] = "layerGate";
      }
    }
  }

  return result;
}

export const MOSS_ROOT_RUINS_TILES = buildTiles();

export const MOSS_ROOT_ENCOUNTERS: readonly MossEncounterDefinition[] = [
  {
    id: "mossIntro",
    required: true,
    detectionRadius: 132,
    enemies: [
      mossRootBackdropSourceToWorld({ x: 585, y: 1005 }),
      mossRootBackdropSourceToWorld({ x: 648, y: 965 }),
      mossRootBackdropSourceToWorld({ x: 710, y: 1005 }),
    ],
  },
  {
    id: "mossFork",
    required: true,
    detectionRadius: 126,
    enemies: [
      mossRootBackdropSourceToWorld({ x: 610, y: 665 }),
      mossRootBackdropSourceToWorld({ x: 685, y: 665 }),
    ],
  },
  {
    id: "mossDeadEnd",
    required: false,
    detectionRadius: 118,
    enemies: [
      mossRootBackdropSourceToWorld({ x: 1150, y: 515 }),
      mossRootBackdropSourceToWorld({ x: 1180, y: 545 }),
    ],
  },
  {
    id: "mossGate",
    required: true,
    detectionRadius: 138,
    enemies: [
      mossRootBackdropSourceToWorld({ x: 590, y: 160 }),
      mossRootBackdropSourceToWorld({ x: 648, y: 205 }),
      mossRootBackdropSourceToWorld({ x: 705, y: 160 }),
    ],
  },
] as const;

export const MOSS_ROOT_ENEMY_GROUP = new Map<number, EncounterGroupId>();
let nextEnemyId = 1;
for (const group of MOSS_ROOT_ENCOUNTERS) {
  for (const _position of group.enemies) {
    MOSS_ROOT_ENEMY_GROUP.set(nextEnemyId, group.id);
    nextEnemyId += 1;
  }
}

export function tileAt(column: number, row: number): MossRootTile {
  return MOSS_ROOT_RUINS_TILES[row]?.[column] ?? "void";
}

export function isBaseTileWalkable(
  tile: MossRootTile,
  gateOpen: boolean,
  layerGateOpen = false,
): boolean {
  return tile === "floor" || tile === "bridge" ||
    (tile === "gate" && gateOpen) ||
    (tile === "layerGate" && layerGateOpen);
}
