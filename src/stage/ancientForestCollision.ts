import type { Vec2 } from "../game/types";
import {
  ANCIENT_FOREST,
  ancientForestNavigationPoint,
  ancientForestSourcePixel,
  ancientForestWorldToSource,
} from "./maps/ancientForestMap";

export interface AncientForestCollisionOptions {
  /** Story progression at the village exit; the static red floor remains intact. */
  villageExitOpen?: boolean;
}

/** Navigation uses only the actor's ground-contact point, not the combat radius. */
export function isAncientForestPositionWalkable(
  point: Vec2,
  radius: number,
  options: AncientForestCollisionOptions = {},
): boolean {
  void radius;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) ||
    point.x < 0 || point.y < 0 || point.x >= ANCIENT_FOREST.width || point.y >= ANCIENT_FOREST.height) return false;
  const source = ancientForestWorldToSource(point);
  return ancientForestNavigationPoint(point) &&
    (options.villageExitOpen === true || source.y <= ANCIENT_FOREST.villageControlSourceY);
}

function axisSweep(from: Vec2, to: Vec2, options: AncientForestCollisionOptions): boolean {
  const start = ancientForestWorldToSource(from);
  const end = ancientForestWorldToSource(to);
  if (options.villageExitOpen !== true && Math.max(start.y, end.y) > ANCIENT_FOREST.villageControlSourceY) return false;
  const x0 = Math.floor(start.x + 1e-7);
  const y0 = Math.floor(start.y + 1e-7);
  const x1 = Math.floor(end.x + 1e-7);
  const y1 = Math.floor(end.y + 1e-7);
  if (y0 === y1) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += 1) {
      if (!ancientForestSourcePixel(x, y0)) return false;
    }
    return true;
  }
  if (x0 === x1) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y += 1) {
      if (!ancientForestSourcePixel(x0, y)) return false;
    }
    return true;
  }
  return false;
}

/** x/y slide legs inspect every source-image pixel, even for a large leap. */
export function resolveAncientForestMovement(
  previous: Vec2,
  desired: Vec2,
  radius: number,
  options: AncientForestCollisionOptions = {},
): Vec2 {
  const result = { ...previous };
  const sourceStart = ancientForestWorldToSource(previous);
  const sourceEnd = ancientForestWorldToSource(desired);
  const steps = Math.max(1, Math.ceil(Math.max(
    Math.abs(sourceEnd.x - sourceStart.x),
    Math.abs(sourceEnd.y - sourceStart.y),
  ) * 2));
  const stepX = (desired.x - previous.x) / steps;
  const stepY = (desired.y - previous.y) / steps;
  for (let index = 0; index < steps; index += 1) {
    const nextX = { x: result.x + stepX, y: result.y };
    if (isAncientForestPositionWalkable(nextX, radius, options) && axisSweep(result, nextX, options)) result.x = nextX.x;
    const nextY = { x: result.x, y: result.y + stepY };
    if (isAncientForestPositionWalkable(nextY, radius, options) && axisSweep(result, nextY, options)) result.y = nextY.y;
  }
  return result;
}

/** Project scripted spawns and future warps onto the same footpoint mask. */
export function findNearestAncientForestWalkablePosition(
  desired: Vec2,
  radius: number,
  options: AncientForestCollisionOptions = {},
  maximumDistance = 90,
): Vec2 | null {
  if (isAncientForestPositionWalkable(desired, radius, options)) return { ...desired };
  for (let ring = 2; ring <= maximumDistance; ring += 2) {
    const samples = Math.max(16, Math.ceil(Math.PI * 2 * ring / 2));
    for (let index = 0; index < samples; index += 1) {
      const angle = index / samples * Math.PI * 2;
      const candidate = { x: desired.x + Math.cos(angle) * ring, y: desired.y + Math.sin(angle) * ring };
      if (isAncientForestPositionWalkable(candidate, radius, options)) return candidate;
    }
  }
  return null;
}
