import { VIEW } from "../../config";
import type { Vec2 } from "../../game/types";
import walkabilityData from "../../../assets/environments/ancient-forest/ancient-forest-walkability-v1.rle.json";
import type { ScrollingStageDefinition } from "../types";

const SOURCE_WIDTH = 1536;
const SOURCE_HEIGHT = 1024;
const WORLD_WIDTH = 1152;
const WORLD_HEIGHT = 768;

export const ANCIENT_FOREST_BACKDROP_TRANSFORM = {
  sourceWidth: SOURCE_WIDTH,
  sourceHeight: SOURCE_HEIGHT,
  worldRect: { x: 0, y: 0, width: WORLD_WIDTH, height: WORLD_HEIGHT },
} as const;

export function ancientForestSourceToWorld(point: Vec2): Vec2 {
  return { x: point.x / SOURCE_WIDTH * WORLD_WIDTH, y: point.y / SOURCE_HEIGHT * WORLD_HEIGHT };
}

export function ancientForestWorldToSource(point: Vec2): Vec2 {
  return { x: point.x / WORLD_WIDTH * SOURCE_WIDTH, y: point.y / WORLD_HEIGHT * SOURCE_HEIGHT };
}

type Span = readonly [number, number];
const walkability = walkabilityData as unknown as {
  sourceWidth: number;
  sourceHeight: number;
  rows: readonly (readonly Span[])[];
};
if (walkability.sourceWidth !== SOURCE_WIDTH || walkability.sourceHeight !== SOURCE_HEIGHT ||
  walkability.rows.length !== SOURCE_HEIGHT) {
  throw new Error("Ancient Forest redline mask must match the native background image");
}

/** The static user-marked floor, including the village road below its story gate. */
export function ancientForestSourcePixel(x: number, y: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y) ||
    x < 0 || y < 0 || x >= SOURCE_WIDTH || y >= SOURCE_HEIGHT) return false;
  const sourceX = Math.floor(x + 1e-7);
  const spans = walkability.rows[Math.floor(y + 1e-7)] ?? [];
  let low = 0;
  let high = spans.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const [start, end] = spans[middle]!;
    if (sourceX < start) high = middle - 1;
    else if (sourceX >= end) low = middle + 1;
    else return true;
  }
  return false;
}

export function ancientForestNavigationPoint(point: Vec2): boolean {
  const source = ancientForestWorldToSource(point);
  return ancientForestSourcePixel(source.x, source.y);
}

export const ANCIENT_FOREST: ScrollingStageDefinition & {
  caveEntry: Vec2;
  caveEntryHalfWidth: number;
  caveEntrySourceY: number;
  caveReturnSpawn: Vec2;
  villageControlSourceY: number;
} = {
  id: "ancientForest",
  name: "古の森",
  tileSize: 32,
  columns: 36,
  rows: 24,
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  spawn: ancientForestSourceToWorld({ x: 780, y: 900 }),
  caveEntry: ancientForestSourceToWorld({ x: 825, y: 90 }),
  caveEntryHalfWidth: 21,
  caveEntrySourceY: 105,
  caveReturnSpawn: ancientForestSourceToWorld({ x: 825, y: 160 }),
  villageControlSourceY: 1010,
  goal: ancientForestSourceToWorld({ x: 825, y: 90 }),
  cameraBounds: {
    left: 0,
    top: 0,
    right: WORLD_WIDTH - VIEW.width,
    bottom: WORLD_HEIGHT - VIEW.height,
  },
  progression: "southToNorth",
};
