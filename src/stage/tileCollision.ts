import type { Vec2 } from "../game/types";
import {
  MOSS_ROOT_BACKDROP_TRANSFORM,
  MOSS_ROOT_GATE_TRANSFORM,
  MOSS_ROOT_RUINS,
  MOSS_ROOT_SOLID_PROPS,
  isMossRootNavigationPoint,
  isMossRootNavigationSourcePixel,
  mossRootBackdropWorldToSource,
} from "./maps/mossRootRuinsMap";

type MossRootSolidProp = (typeof MOSS_ROOT_SOLID_PROPS)[number];

export interface TileCollisionOptions {
  gateOpen: boolean;
  layerGateOpen?: boolean;
  blockers?: readonly { x: number; y: number; width: number; height: number }[];
  solidProps?: readonly MossRootSolidProp[];
}

function rootGateLocalPoint(point: Vec2): Vec2 {
  const gate = MOSS_ROOT_GATE_TRANSFORM.collision;
  const dx = point.x - gate.center.x;
  const dy = point.y - gate.center.y;
  const cosine = Math.cos(gate.rotation);
  const sine = Math.sin(gate.rotation);
  return { x: dx * cosine + dy * sine, y: -dx * sine + dy * cosine };
}

function insideClosedRootGate(point: Vec2): boolean {
  const local = rootGateLocalPoint(point);
  const gate = MOSS_ROOT_GATE_TRANSFORM.collision;
  return Math.abs(local.x) <= gate.width * 0.5 && Math.abs(local.y) <= gate.height * 0.5;
}

/** Segment/rotated-rectangle intersection, independent of the static red floor. */
function crossesClosedRootGate(from: Vec2, to: Vec2): boolean {
  const start = rootGateLocalPoint(from);
  const end = rootGateLocalPoint(to);
  const gate = MOSS_ROOT_GATE_TRANSFORM.collision;
  let lower = 0;
  let upper = 1;
  for (const [position, travel, halfExtent] of [
    [start.x, end.x - start.x, gate.width * 0.5],
    [start.y, end.y - start.y, gate.height * 0.5],
  ] as const) {
    if (Math.abs(travel) < 1e-9) {
      if (Math.abs(position) <= halfExtent) continue;
      return false;
    }
    const first = (-halfExtent - position) / travel;
    const second = (halfExtent - position) / travel;
    lower = Math.max(lower, Math.min(first, second));
    upper = Math.min(upper, Math.max(first, second));
    if (lower > upper) return false;
  }
  return true;
}

function transferCrystalBase(options: TileCollisionOptions): MossRootSolidProp | undefined {
  // Other painted props are deliberately not made solid. Only the crystal's
  // ground-contact pedestal is an always-present obstruction over the red floor.
  return (options.solidProps ?? MOSS_ROOT_SOLID_PROPS).find((prop) => prop.id === "transferCrystal");
}

function insideTransferCrystalBase(point: Vec2, options: TileCollisionOptions): boolean {
  const base = transferCrystalBase(options);
  if (!base) return false;
  const x = (point.x - base.center.x) / base.radiusX;
  const y = (point.y - base.center.y) / base.radiusY;
  return x * x + y * y <= 1;
}

/** Closest approach in ellipse-normalized space catches even a fast sweep. */
function crossesTransferCrystalBase(from: Vec2, to: Vec2, options: TileCollisionOptions): boolean {
  const base = transferCrystalBase(options);
  if (!base) return false;
  const startX = (from.x - base.center.x) / base.radiusX;
  const startY = (from.y - base.center.y) / base.radiusY;
  const travelX = (to.x - from.x) / base.radiusX;
  const travelY = (to.y - from.y) / base.radiusY;
  const lengthSquared = travelX * travelX + travelY * travelY;
  const progress = lengthSquared > 1e-12
    ? Math.max(0, Math.min(1, -(startX * travelX + startY * travelY) / lengthSquared))
    : 0;
  const closestX = startX + travelX * progress;
  const closestY = startY + travelY * progress;
  return closestX * closestX + closestY * closestY <= 1;
}

export function isMossRootPositionWalkable(
  point: Vec2,
  radius: number,
  options: TileCollisionOptions,
): boolean {
  if (
    !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
    point.x < 0 || point.y < 0 ||
    point.x >= MOSS_ROOT_RUINS.width ||
    point.y >= MOSS_ROOT_RUINS.height
  ) return false;
  // The red trace is static floor. The one remaining northern root is a
  // separate dynamic blocker until its entire withdrawal animation finishes.
  // Body/attack radii remain unchanged for combat.
  void radius;
  return isMossRootNavigationPoint(point) &&
    (options.gateOpen || !insideClosedRootGate(point)) &&
    !insideTransferCrystalBase(point, options);
}

/** Projects scripted spawns, QA warps and encounter resets onto the same
 * footpoint raster used by live movement. It never invents a bridge or uses
 * a combat hitbox radius to reject a narrow red-interior passage. */
export function findNearestMossRootWalkablePosition(
  desired: Vec2,
  radius: number,
  options: TileCollisionOptions,
  maximumDistance = 240,
): Vec2 | null {
  if (isMossRootPositionWalkable(desired, radius, options)) return { ...desired };
  const radialStep = Math.max(4, Math.min(8, radius * 0.6));
  for (let ring = radialStep; ring <= maximumDistance; ring += radialStep) {
    const samples = Math.max(16, Math.ceil((Math.PI * 2 * ring) / radialStep));
    for (let index = 0; index < samples; index += 1) {
      const angle = index / samples * Math.PI * 2;
      const candidate = {
        x: desired.x + Math.cos(angle) * ring,
        y: desired.y + Math.sin(angle) * ring,
      };
      if (isMossRootPositionWalkable(candidate, radius, options)) return candidate;
    }
  }
  return null;
}

/** The slide solver moves in orthogonal legs. Examine every native backdrop
 * pixel crossed by each leg, including thin one-pixel red/void separators. */
function isMossRootAxisSweepWalkable(from: Vec2, to: Vec2, options: TileCollisionOptions): boolean {
  if (!options.gateOpen && crossesClosedRootGate(from, to)) return false;
  if (crossesTransferCrystalBase(from, to, options)) return false;
  const start = mossRootBackdropWorldToSource(from);
  const end = mossRootBackdropWorldToSource(to);
  const startX = Math.floor(start.x + 1e-7);
  const startY = Math.floor(start.y + 1e-7);
  const endX = Math.floor(end.x + 1e-7);
  const endY = Math.floor(end.y + 1e-7);
  if (startY === endY) {
    for (let x = Math.min(startX, endX); x <= Math.max(startX, endX); x += 1) {
      if (!isMossRootNavigationSourcePixel(x, startY)) return false;
    }
    return true;
  }
  if (startX === endX) {
    for (let y = Math.min(startY, endY); y <= Math.max(startY, endY); y += 1) {
      if (!isMossRootNavigationSourcePixel(startX, y)) return false;
    }
    return true;
  }
  // All production callers use axis-aligned legs. Reject a future diagonal
  // call rather than silently skipping pixels across the red boundary.
  return false;
}

export function resolveMossRootMovement(
  previous: Vec2,
  desired: Vec2,
  radius: number,
  options: TileCollisionOptions,
): Vec2 {
  const result = { ...previous };
  const scaleX = MOSS_ROOT_BACKDROP_TRANSFORM.sourceWidth / MOSS_ROOT_RUINS.width;
  const scaleY = MOSS_ROOT_BACKDROP_TRANSFORM.sourceHeight / MOSS_ROOT_RUINS.height;
  // Subpixel-sized world steps allow the old x/y slide behavior to follow
  // sharp bends; the axis sweep prevents even a fast knockback from jumping a
  // one-pixel blocked band between those steps.
  const sourceTravel = Math.max(
    Math.abs(desired.x - previous.x) * scaleX,
    Math.abs(desired.y - previous.y) * scaleY,
  );
  const steps = Math.max(1, Math.ceil(sourceTravel * 2));
  const stepX = (desired.x - previous.x) / steps;
  const stepY = (desired.y - previous.y) / steps;
  for (let index = 0; index < steps; index += 1) {
    const nextX = { x: result.x + stepX, y: result.y };
    if (
      isMossRootPositionWalkable(nextX, radius, options) &&
      isMossRootAxisSweepWalkable(result, nextX, options)
    ) result.x = nextX.x;
    const nextY = { x: result.x, y: result.y + stepY };
    if (
      isMossRootPositionWalkable(nextY, radius, options) &&
      isMossRootAxisSweepWalkable(result, nextY, options)
    ) result.y = nextY.y;
  }
  return result;
}
