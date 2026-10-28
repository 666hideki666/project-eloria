import { VIEW } from "../../config";
import type { Vec2 } from "../../game/types";
import type { ScrollingStageDefinition } from "../types";
import walkabilityData from "../../../assets/environments/bosses/velgran/velgran-boss-arena-walkability-v1.rle.json";

const SOURCE_WIDTH = 1496;
const SOURCE_HEIGHT = 1051;
const SOURCE_TO_WORLD = 1;
const WORLD_WIDTH = SOURCE_WIDTH * SOURCE_TO_WORLD;
const WORLD_HEIGHT = SOURCE_HEIGHT * SOURCE_TO_WORLD;

export const CRYSTAL_ALTAR_BACKDROP_TRANSFORM = {
  sourceWidth: SOURCE_WIDTH,
  sourceHeight: SOURCE_HEIGHT,
  worldRect: { x: 0, y: 0, width: WORLD_WIDTH, height: WORLD_HEIGHT },
} as const;

export function crystalAltarSourceToWorld(point: Vec2): Vec2 {
  return { x: point.x * SOURCE_TO_WORLD, y: point.y * SOURCE_TO_WORLD };
}

export function crystalAltarWorldToSource(point: Vec2): Vec2 {
  return { x: point.x / SOURCE_TO_WORLD, y: point.y / SOURCE_TO_WORLD };
}

interface CrystalAltarMaskData {
  version: number;
  sourceWidth: number;
  sourceHeight: number;
  sourceRedlineSha256: string;
  walkablePixelCount: number;
  rows: readonly (readonly (readonly [number, number])[])[];
}

const mask = walkabilityData as unknown as CrystalAltarMaskData;
if (mask.sourceWidth !== SOURCE_WIDTH || mask.sourceHeight !== SOURCE_HEIGHT || mask.walkablePixelCount !== 436203) {
  throw new Error("Velgran arena redline mask does not match the approved 1496x1051 background");
}

export const CRYSTAL_ALTAR_NAV_MASK_META = {
  version: mask.version,
  sourceWidth: mask.sourceWidth,
  sourceHeight: mask.sourceHeight,
  sourceRedlineSha256: mask.sourceRedlineSha256,
  walkablePixelCount: mask.walkablePixelCount,
} as const;

export function crystalAltarSourcePixel(x: number, y: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || py < 0 || px >= SOURCE_WIDTH || py >= SOURCE_HEIGHT) return false;
  return mask.rows[py]!.some(([start, end]) => px >= start && px < end);
}

export function crystalAltarNavigationPoint(point: Vec2): boolean {
  const source = crystalAltarWorldToSource(point);
  return crystalAltarSourcePixel(source.x, source.y);
}

const source = (x: number, y: number): Vec2 => crystalAltarSourceToWorld({ x, y });
const sourceRect = (left: number, top: number, right: number, bottom: number) => ({
  left: source(left, top).x,
  top: source(left, top).y,
  right: source(right, bottom).x,
  bottom: source(right, bottom).y,
});

export const CRYSTAL_ALTAR: ScrollingStageDefinition & {
  arenaCenter: Vec2;
  bossSpawn: Vec2;
  bossCombatBounds: { left: number; top: number; right: number; bottom: number };
  introTriggerY: number;
  retreatY: number;
  sealStone: Vec2;
} = {
  id: "crystalAltar",
  name: "晶界・森晶の祭壇",
  tileSize: 32,
  columns: Math.ceil(WORLD_WIDTH / 32),
  rows: Math.ceil(WORLD_HEIGHT / 32),
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  spawn: source(748, 930),
  goal: source(748, 185),
  cameraBounds: {
    left: 0,
    top: 0,
    right: WORLD_WIDTH - VIEW.width,
    bottom: WORLD_HEIGHT - VIEW.height,
  },
  progression: "southToNorth",
  arenaCenter: source(748, 520),
  bossSpawn: source(748, 500),
  bossCombatBounds: sourceRect(530, 375, 966, 660),
  introTriggerY: source(0, 590).y,
  retreatY: source(0, 1020).y,
  sealStone: source(748, 185),
};
