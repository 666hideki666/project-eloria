import type { Vec2 } from "../game/types";
import {
  DEPTHS_SOLID_PROPS,
  SPIRIT_CLOTH_STONESCALE_DEPTHS,
  depthsGateBlocksSource,
  depthsNavigationPoint,
  depthsReachabilityKey,
  depthsReachableTiles,
  depthsSourcePixel,
  depthsWorldToSource,
} from "./maps/spiritClothStonescaleDepthsMap";

type DepthsSolidProp = (typeof DEPTHS_SOLID_PROPS)[number];

export interface DepthsCollisionOptions {
  centralGateOpen: boolean;
  solidProps?: readonly DepthsSolidProp[];
}

function insideProp(point: Vec2, prop: DepthsSolidProp): boolean {
  const dx = (point.x - prop.center.x) / prop.radiusX;
  const dy = (point.y - prop.center.y) / prop.radiusY;
  return dx * dx + dy * dy <= 1;
}

function segmentCrossesProp(from: Vec2, to: Vec2, prop: DepthsSolidProp): boolean {
  const x = (from.x - prop.center.x) / prop.radiusX;
  const y = (from.y - prop.center.y) / prop.radiusY;
  const dx = (to.x - from.x) / prop.radiusX;
  const dy = (to.y - from.y) / prop.radiusY;
  const length = dx * dx + dy * dy;
  const t = length > 1e-12 ? Math.max(0, Math.min(1, -(x * dx + y * dy) / length)) : 0;
  return (x + dx * t) ** 2 + (y + dy * t) ** 2 <= 1;
}

/** Only the actor's ground-contact point participates in navigation. */
export function isDepthsPositionWalkable(point: Vec2, radius: number, options: DepthsCollisionOptions): boolean {
  void radius;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) ||
    point.x < 0 || point.y < 0 ||
    point.x >= SPIRIT_CLOTH_STONESCALE_DEPTHS.width ||
    point.y >= SPIRIT_CLOTH_STONESCALE_DEPTHS.height) return false;
  if (!depthsNavigationPoint(point)) return false;
  const source = depthsWorldToSource(point);
  if (!options.centralGateOpen && depthsGateBlocksSource(source.x, source.y)) return false;
  return !(options.solidProps ?? DEPTHS_SOLID_PROPS).some((prop) => insideProp(point, prop));
}

/** Warps and encounter resets stay in the spawn-connected component. */
export function findNearestDepthsWalkablePosition(
  desired: Vec2,
  radius: number,
  options: DepthsCollisionOptions,
  maximumDistance = 180,
): Vec2 | null {
  const reachable = depthsReachableTiles(options.centralGateOpen);
  const valid = (point: Vec2) =>
    isDepthsPositionWalkable(point, radius, options) && reachable.has(depthsReachabilityKey(point));
  if (valid(desired)) return { ...desired };
  for (let ring = 6; ring <= maximumDistance; ring += 6) {
    const samples = Math.max(20, Math.ceil(2 * Math.PI * ring / 6));
    for (let index = 0; index < samples; index += 1) {
      const angle = index / samples * Math.PI * 2;
      const candidate = { x: desired.x + Math.cos(angle) * ring, y: desired.y + Math.sin(angle) * ring };
      if (valid(candidate)) return candidate;
    }
  }
  return null;
}

/** Check each native pixel in every axis leg, including thin void strips. */
function axisSweepWalkable(from: Vec2, to: Vec2, options: DepthsCollisionOptions): boolean {
  if ((options.solidProps ?? DEPTHS_SOLID_PROPS).some((prop) => segmentCrossesProp(from, to, prop))) return false;
  const start = depthsWorldToSource(from);
  const end = depthsWorldToSource(to);
  const x0 = Math.floor(start.x + 1e-7);
  const y0 = Math.floor(start.y + 1e-7);
  const x1 = Math.floor(end.x + 1e-7);
  const y1 = Math.floor(end.y + 1e-7);
  if (y0 === y1) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += 1) {
      if (!depthsSourcePixel(x, y0) || (!options.centralGateOpen && depthsGateBlocksSource(x, y0))) return false;
    }
    return true;
  }
  if (x0 === x1) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y += 1) {
      if (!depthsSourcePixel(x0, y) || (!options.centralGateOpen && depthsGateBlocksSource(x0, y))) return false;
    }
    return true;
  }
  return false;
}

export function resolveDepthsMovement(previous: Vec2, desired: Vec2, radius: number, options: DepthsCollisionOptions): Vec2 {
  const result = { ...previous };
  const sourceTravel = Math.max(Math.abs(desired.x - previous.x), Math.abs(desired.y - previous.y)) / 1.5;
  const steps = Math.max(1, Math.ceil(sourceTravel * 2));
  const stepX = (desired.x - previous.x) / steps;
  const stepY = (desired.y - previous.y) / steps;
  for (let index = 0; index < steps; index += 1) {
    const nextX = { x: result.x + stepX, y: result.y };
    if (isDepthsPositionWalkable(nextX, radius, options) && axisSweepWalkable(result, nextX, options)) result.x = nextX.x;
    const nextY = { x: result.x, y: result.y + stepY };
    if (isDepthsPositionWalkable(nextY, radius, options) && axisSweepWalkable(result, nextY, options)) result.y = nextY.y;
  }
  return result;
}
