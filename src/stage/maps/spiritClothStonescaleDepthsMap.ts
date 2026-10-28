import { VIEW } from "../../config";
import depthsWalkabilityData from "../../../assets/environments/spirit-cloth-stonescale-depths/spirit-cloth-stonescale-depths-walkability-v1.rle.json";
import type { EnemyKind, Vec2 } from "../../game/types";
import type { ScrollingStageDefinition } from "../types";

const SOURCE_WIDTH = 1638;
const SOURCE_HEIGHT = 960;
const SOURCE_TO_WORLD = 1.5;
const WORLD_WIDTH = SOURCE_WIDTH * SOURCE_TO_WORLD;
const WORLD_HEIGHT = SOURCE_HEIGHT * SOURCE_TO_WORLD;
const REACHABILITY_CELL = 8;

export const DEPTHS_BACKDROP_TRANSFORM = {
  sourceWidth: SOURCE_WIDTH,
  sourceHeight: SOURCE_HEIGHT,
  worldRect: { x: 0, y: 0, width: WORLD_WIDTH, height: WORLD_HEIGHT },
} as const;

export function depthsSourceToWorld(point: Vec2): Vec2 {
  return { x: point.x * SOURCE_TO_WORLD, y: point.y * SOURCE_TO_WORLD };
}

export function depthsWorldToSource(point: Vec2): Vec2 {
  return { x: point.x / SOURCE_TO_WORLD, y: point.y / SOURCE_TO_WORLD };
}

interface DepthsMaskData {
  version: number;
  sourceWidth: number;
  sourceHeight: number;
  sourceMaskSha256: string;
  walkablePixelCount: number;
  rows: readonly (readonly (readonly [number, number])[])[];
}

const mask = depthsWalkabilityData as unknown as DepthsMaskData;
if (mask.sourceWidth !== SOURCE_WIDTH || mask.sourceHeight !== SOURCE_HEIGHT || mask.walkablePixelCount !== 231601) {
  throw new Error("Layer 3 redline mask does not match the approved 1638x960 background");
}

export const DEPTHS_NAV_MASK_META = {
  version: mask.version,
  sourceWidth: mask.sourceWidth,
  sourceHeight: mask.sourceHeight,
  sourceMaskSha256: mask.sourceMaskSha256,
  walkablePixelCount: mask.walkablePixelCount,
} as const;

/** Static floor only: a closed gate is handled independently by collision. */
export function depthsSourcePixel(x: number, y: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || py < 0 || px >= SOURCE_WIDTH || py >= SOURCE_HEIGHT) return false;
  return mask.rows[py]!.some(([start, end]) => px >= start && px < end);
}

export function depthsNavigationPoint(point: Vec2): boolean {
  const source = depthsWorldToSource(point);
  return depthsSourcePixel(source.x, source.y);
}

/** Door footprint spans wall to wall at the only northbound neck. */
export const DEPTHS_CENTRAL_GATE_SOURCE_RECT = {
  left: 770, right: 904, top: 311, bottom: 334,
} as const;

export function depthsGateBlocksSource(x: number, y: number): boolean {
  return x >= DEPTHS_CENTRAL_GATE_SOURCE_RECT.left &&
    x <= DEPTHS_CENTRAL_GATE_SOURCE_RECT.right &&
    y >= DEPTHS_CENTRAL_GATE_SOURCE_RECT.top &&
    y <= DEPTHS_CENTRAL_GATE_SOURCE_RECT.bottom;
}

const source = (x: number, y: number) => depthsSourceToWorld({ x, y });

export const SPIRIT_CLOTH_STONESCALE_DEPTHS: ScrollingStageDefinition & {
  returnGate: Vec2;
  returnGateHalfWidth: number;
  returnGateInnerSpawn: Vec2;
  spiritLamp: Vec2;
  stoneWedge: Vec2;
  restorationCrystal: Vec2;
  centralGate: Vec2;
  bossDoor: Vec2;
  bossDoorHalfWidth: number;
  bossDoorInnerSpawn: Vec2;
} = {
  id: "spiritClothStonescaleDepths",
  name: "晶界・霊布と石鱗の深層",
  tileSize: 32,
  columns: Math.ceil(WORLD_WIDTH / 32),
  rows: Math.ceil(WORLD_HEIGHT / 32),
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  spawn: source(1400, 900),
  returnGate: source(1430, 960),
  returnGateHalfWidth: 110,
  returnGateInnerSpawn: source(1400, 900),
  spiritLamp: source(205, 250),
  stoneWedge: source(1430, 230),
  restorationCrystal: source(930, 118),
  centralGate: source(837, 323),
  bossDoor: source(845, 0),
  bossDoorHalfWidth: 45,
  bossDoorInnerSpawn: source(825, 110),
  goal: source(845, 4),
  cameraBounds: {
    left: 0,
    top: 0,
    right: WORLD_WIDTH - VIEW.width,
    bottom: WORLD_HEIGHT - VIEW.height,
  },
  progression: "freeform",
};

/** Only the ground-contact bases are solid; the approved floor remains intact. */
export const DEPTHS_SOLID_PROPS = [
  { id: "spiritLamp", center: { x: SPIRIT_CLOTH_STONESCALE_DEPTHS.spiritLamp.x, y: SPIRIT_CLOTH_STONESCALE_DEPTHS.spiritLamp.y + 4 }, radiusX: 23, radiusY: 11 },
  { id: "stoneWedge", center: { x: SPIRIT_CLOTH_STONESCALE_DEPTHS.stoneWedge.x, y: SPIRIT_CLOTH_STONESCALE_DEPTHS.stoneWedge.y + 4 }, radiusX: 25, radiusY: 11 },
  { id: "restorationCrystal", center: { x: SPIRIT_CLOTH_STONESCALE_DEPTHS.restorationCrystal.x, y: SPIRIT_CLOTH_STONESCALE_DEPTHS.restorationCrystal.y + 3 }, radiusX: 17, radiusY: 8 },
] as const;

export type DepthsEncounterGroupId = "depthsSpiritEntry" | "depthsSpiritLamp" | "depthsStonePassage" | "depthsStoneWedge";
export type DepthsEncounterGroupState = "dormant" | "noticed" | "active" | "cleared";

export interface DepthsEncounterEnemy {
  kind: "utsurobou" | "iwaUroko";
  pos: Vec2;
}

export interface DepthsEncounterDefinition {
  id: DepthsEncounterGroupId;
  required: boolean;
  detectionRadius: number;
  enemies: readonly DepthsEncounterEnemy[];
}

export const DEPTHS_ENCOUNTERS: readonly DepthsEncounterDefinition[] = [
  { id: "depthsSpiritEntry", required: true, detectionRadius: 126, enemies: [
    { kind: "utsurobou", pos: source(450, 530) }, { kind: "utsurobou", pos: source(600, 600) },
  ] },
  { id: "depthsSpiritLamp", required: true, detectionRadius: 138, enemies: [
    { kind: "utsurobou", pos: source(150, 260) }, { kind: "utsurobou", pos: source(245, 245) }, { kind: "iwaUroko", pos: source(270, 285) },
  ] },
  { id: "depthsStonePassage", required: true, detectionRadius: 120, enemies: [
    { kind: "iwaUroko", pos: source(1100, 660) }, { kind: "iwaUroko", pos: source(1270, 600) },
  ] },
  { id: "depthsStoneWedge", required: true, detectionRadius: 132, enemies: [
    { kind: "iwaUroko", pos: source(1390, 220) }, { kind: "utsurobou", pos: source(1480, 240) },
  ] },
] as const;

export const DEPTHS_SAFE_GROUP_ANCHORS: Record<DepthsEncounterGroupId, Vec2> = {
  depthsSpiritEntry: source(470, 550),
  depthsSpiritLamp: source(205, 285),
  depthsStonePassage: source(1150, 680),
  depthsStoneWedge: source(1450, 260),
};

export const DEPTHS_ENEMY_GROUP = new Map<number, DepthsEncounterGroupId>();
let enemyId = 1;
for (const group of DEPTHS_ENCOUNTERS) for (const _enemy of group.enemies) {
  DEPTHS_ENEMY_GROUP.set(enemyId, group.id);
  enemyId += 1;
}

export function depthsReachabilityKey(point: Vec2): string {
  const sourcePoint = depthsWorldToSource(point);
  return `${Math.floor(sourcePoint.x / REACHABILITY_CELL)},${Math.floor(sourcePoint.y / REACHABILITY_CELL)}`;
}

const reachabilityCache = new Map<boolean, ReadonlySet<string>>();

/** Source-grid connectivity is used only for spawn/warp validation, never as collision. */
export function depthsReachableTiles(centralGateOpen: boolean): ReadonlySet<string> {
  const cached = reachabilityCache.get(centralGateOpen);
  if (cached) return cached;
  const start = depthsWorldToSource(SPIRIT_CLOTH_STONESCALE_DEPTHS.spawn);
  const queue: [number, number][] = [[Math.floor(start.x / REACHABILITY_CELL), Math.floor(start.y / REACHABILITY_CELL)]];
  const reached = new Set<string>();
  for (let head = 0; head < queue.length; head += 1) {
    const [column, row] = queue[head]!;
    const key = `${column},${row}`;
    if (reached.has(key)) continue;
    const x = column * REACHABILITY_CELL + REACHABILITY_CELL / 2;
    const y = row * REACHABILITY_CELL + REACHABILITY_CELL / 2;
    if (!depthsSourcePixel(x, y) || (!centralGateOpen && depthsGateBlocksSource(x, y))) continue;
    reached.add(key);
    queue.push([column + 1, row], [column - 1, row], [column, row + 1], [column, row - 1]);
  }
  reachabilityCache.set(centralGateOpen, reached);
  return reached;
}

export interface DepthsSpawnOccupant { pos: Vec2; radius: number; }

export function isDepthsEnemySpawnSafe(point: Vec2, radius: number, occupied: readonly DepthsSpawnOccupant[] = [], reachable?: ReadonlySet<string>): boolean {
  if (!depthsNavigationPoint(point)) return false;
  const s = depthsWorldToSource(point);
  if (depthsGateBlocksSource(s.x, s.y)) return false;
  for (const prop of DEPTHS_SOLID_PROPS) {
    const dx = (point.x - prop.center.x) / prop.radiusX;
    const dy = (point.y - prop.center.y) / prop.radiusY;
    if (dx * dx + dy * dy <= 1) return false;
  }
  if (reachable && !reachable.has(depthsReachabilityKey(point))) return false;
  return occupied.every((other) => Math.hypot(point.x - other.pos.x, point.y - other.pos.y) >= radius + other.radius + 16);
}

export function findNearestSafeDepthsEnemySpawn(desired: Vec2, radius: number, _kind: EnemyKind, occupied: readonly DepthsSpawnOccupant[] = [], reachable?: ReadonlySet<string>): Vec2 | null {
  if (isDepthsEnemySpawnSafe(desired, radius, occupied, reachable)) return { ...desired };
  for (let distance = 8; distance <= 192; distance += 8) for (let step = 0; step < 24; step += 1) {
    const angle = (Math.PI * 2 * step) / 24;
    const candidate = { x: Math.round(desired.x + Math.cos(angle) * distance), y: Math.round(desired.y + Math.sin(angle) * distance) };
    if (isDepthsEnemySpawnSafe(candidate, radius, occupied, reachable)) return candidate;
  }
  return null;
}
