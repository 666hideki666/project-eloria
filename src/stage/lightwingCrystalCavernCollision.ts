import type { Vec2 } from "../game/types";
import {
  LIGHTWING_CRYSTAL_CAVERN,
  LIGHTWING_SOLID_PROPS,
  lightwingNavigationPoint,
  lightwingNavigationSourcePixel,
  lightwingWorldToSource,
} from "./maps/lightwingCrystalCavernMap";

type LightwingSolidProp = (typeof LIGHTWING_SOLID_PROPS)[number];

export interface LightwingCollisionOptions {
  crystalPathUnlocked: boolean;
  layerGateOpen?: boolean;
  solidProps?: readonly LightwingSolidProp[];
  /** Kept for old callers; the user's red outline also bounds flying actors. */
  allowWater?: boolean;
}

function insideProp(point: Vec2, prop: LightwingSolidProp): boolean {
  const x = (point.x - prop.center.x) / prop.radiusX;
  const y = (point.y - prop.center.y) / prop.radiusY;
  return x * x + y * y <= 1;
}

function crossesProp(from: Vec2, to: Vec2, prop: LightwingSolidProp): boolean {
  const sx = (from.x - prop.center.x) / prop.radiusX;
  const sy = (from.y - prop.center.y) / prop.radiusY;
  const dx = (to.x - from.x) / prop.radiusX;
  const dy = (to.y - from.y) / prop.radiusY;
  const length = dx * dx + dy * dy;
  const t = length > 1e-12 ? Math.max(0, Math.min(1, -(sx * dx + sy * dy) / length)) : 0;
  return (sx + t * dx) ** 2 + (sy + t * dy) ** 2 <= 1;
}

/** Navigation uses the actor's footpoint. Combat radius is independent. */
export function isLightwingPositionWalkable(point: Vec2, radius: number, options: LightwingCollisionOptions): boolean {
  void radius;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) ||
      point.x < 0 || point.y < 0 ||
      point.x >= LIGHTWING_CRYSTAL_CAVERN.width || point.y >= LIGHTWING_CRYSTAL_CAVERN.height) return false;
  if (!lightwingNavigationPoint(point, options.crystalPathUnlocked)) return false;
  return !(options.solidProps ?? LIGHTWING_SOLID_PROPS).some((prop) => insideProp(point, prop));
}

/** Check every native image pixel crossed by an orthogonal movement leg. */
function axisSweep(from: Vec2, to: Vec2, options: LightwingCollisionOptions): boolean {
  if ((options.solidProps ?? LIGHTWING_SOLID_PROPS).some((prop) => crossesProp(from, to, prop))) return false;
  const start = lightwingWorldToSource(from);
  const end = lightwingWorldToSource(to);
  const x0 = Math.floor(start.x + 1e-7);
  const y0 = Math.floor(start.y + 1e-7);
  const x1 = Math.floor(end.x + 1e-7);
  const y1 = Math.floor(end.y + 1e-7);
  if (y0 === y1) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += 1) {
      if (!lightwingNavigationSourcePixel(x, y0, options.crystalPathUnlocked)) return false;
    }
    return true;
  }
  if (x0 === x1) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y += 1) {
      if (!lightwingNavigationSourcePixel(x0, y, options.crystalPathUnlocked)) return false;
    }
    return true;
  }
  return false;
}

export function resolveLightwingMovement(previous: Vec2, desired: Vec2, radius: number, options: LightwingCollisionOptions): Vec2 {
  const result = { ...previous };
  const sourceStart = lightwingWorldToSource(previous);
  const sourceEnd = lightwingWorldToSource(desired);
  const steps = Math.max(1, Math.ceil(Math.max(
    Math.abs(sourceEnd.x - sourceStart.x), Math.abs(sourceEnd.y - sourceStart.y),
  ) * 2));
  const stepX = (desired.x - previous.x) / steps;
  const stepY = (desired.y - previous.y) / steps;
  for (let i = 0; i < steps; i += 1) {
    const nextX = { x: result.x + stepX, y: result.y };
    if (isLightwingPositionWalkable(nextX, radius, options) && axisSweep(result, nextX, options)) result.x = nextX.x;
    const nextY = { x: result.x, y: result.y + stepY };
    if (isLightwingPositionWalkable(nextY, radius, options) && axisSweep(result, nextY, options)) result.y = nextY.y;
  }
  return result;
}
