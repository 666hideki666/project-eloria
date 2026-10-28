import type { Vec2 } from "../game/types";
import {
  CRYSTAL_ALTAR,
  crystalAltarNavigationPoint,
  crystalAltarSourcePixel,
  crystalAltarWorldToSource,
} from "./maps/crystalAltarMap";

export interface CrystalAltarCollisionOptions {
  sealStoneSolid?: boolean;
  peacefulGuardianSolid?: boolean;
}

// Only the narrow root touching the floor is solid. The glowing crystal above
// it may overlap an actor's upper body without blocking their ground point.
export const CRYSTAL_ALTAR_SEAL_STONE_BASE = {
  x: CRYSTAL_ALTAR.sealStone.x,
  y: CRYSTAL_ALTAR.sealStone.y - 3,
  radiusX: 17,
  radiusY: 8,
} as const;

/** An authored object footprint; the static redline floor remains unchanged. */
export const CRYSTAL_ALTAR_PEACEFUL_GUARDIAN_BASE = {
  x: CRYSTAL_ALTAR.sealStone.x,
  y: CRYSTAL_ALTAR.sealStone.y,
  radiusX: 40,
  radiusY: 16,
} as const;
type SolidBase = { x: number; y: number; radiusX: number; radiusY: number };

function baseContains(point: Vec2, base: SolidBase): boolean {
  const x = (point.x - base.x) / base.radiusX;
  const y = (point.y - base.y) / base.radiusY;
  return x * x + y * y <= 1;
}

function baseCrosses(from: Vec2, to: Vec2, base: SolidBase): boolean {
  const x = (from.x - base.x) / base.radiusX;
  const y = (from.y - base.y) / base.radiusY;
  const dx = (to.x - from.x) / base.radiusX;
  const dy = (to.y - from.y) / base.radiusY;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared > 0 ? Math.max(0, Math.min(1, -(x * dx + y * dy) / lengthSquared)) : 0;
  return (x + dx * t) ** 2 + (y + dy * t) ** 2 <= 1;
}

/** Navigation uses the ground-contact point; combat radii stay independent. */
export function isCrystalAltarPositionWalkable(
  point: Vec2,
  radius: number,
  options: CrystalAltarCollisionOptions = {},
): boolean {
  void radius;
  return Number.isFinite(point.x) && Number.isFinite(point.y) &&
    point.x >= 0 && point.y >= 0 &&
    point.x < CRYSTAL_ALTAR.width && point.y < CRYSTAL_ALTAR.height &&
    crystalAltarNavigationPoint(point) &&
    (!options.sealStoneSolid || !baseContains(point, CRYSTAL_ALTAR_SEAL_STONE_BASE)) &&
    (!options.peacefulGuardianSolid || !baseContains(point, CRYSTAL_ALTAR_PEACEFUL_GUARDIAN_BASE));
}

function axisSweepWalkable(from: Vec2, to: Vec2, options: CrystalAltarCollisionOptions): boolean {
  if (options.sealStoneSolid && baseCrosses(from, to, CRYSTAL_ALTAR_SEAL_STONE_BASE)) return false;
  if (options.peacefulGuardianSolid && baseCrosses(from, to, CRYSTAL_ALTAR_PEACEFUL_GUARDIAN_BASE)) return false;
  const start = crystalAltarWorldToSource(from);
  const end = crystalAltarWorldToSource(to);
  const x0 = Math.floor(start.x + 1e-7);
  const y0 = Math.floor(start.y + 1e-7);
  const x1 = Math.floor(end.x + 1e-7);
  const y1 = Math.floor(end.y + 1e-7);
  if (y0 === y1) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += 1) {
      if (!crystalAltarSourcePixel(x, y0)) return false;
    }
    return true;
  }
  if (x0 === x1) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y += 1) {
      if (!crystalAltarSourcePixel(x0, y)) return false;
    }
    return true;
  }
  return false;
}

/** Each axis leg crosses at most half a native pixel, including fast moves. */
export function resolveCrystalAltarMovement(
  previous: Vec2,
  desired: Vec2,
  radius: number,
  options: CrystalAltarCollisionOptions = {},
): Vec2 {
  const result = { ...previous };
  const sourceTravel = Math.max(Math.abs(desired.x - previous.x), Math.abs(desired.y - previous.y));
  const steps = Math.max(1, Math.ceil(sourceTravel * 2));
  const stepX = (desired.x - previous.x) / steps;
  const stepY = (desired.y - previous.y) / steps;
  for (let index = 0; index < steps; index += 1) {
    const nextX = { x: result.x + stepX, y: result.y };
    if (isCrystalAltarPositionWalkable(nextX, radius, options) && axisSweepWalkable(result, nextX, options)) result.x = nextX.x;
    const nextY = { x: result.x, y: result.y + stepY };
    if (isCrystalAltarPositionWalkable(nextY, radius, options) && axisSweepWalkable(result, nextY, options)) result.y = nextY.y;
  }
  return result;
}
