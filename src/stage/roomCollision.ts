import { clamp } from "../game/math";
import type { Vec2 } from "../game/types";
import type {
  CircleObstacle,
  RectObstacle,
  RoomObstacle,
  StageRoomDefinition,
} from "./types";

const EPSILON = 0.0001;

function clampToRoomBounds(
  position: Vec2,
  radius: number,
  room: StageRoomDefinition,
): Vec2 {
  return {
    x: clamp(position.x, room.bounds.left + radius, room.bounds.right - radius),
    y: clamp(position.y, room.bounds.top + radius, room.bounds.bottom - radius),
  };
}

function resolveRectAxis(
  previous: Vec2,
  desired: Vec2,
  radius: number,
  obstacle: RectObstacle,
  axis: "x" | "y",
): Vec2 {
  const otherAxis = axis === "x" ? "y" : "x";
  const min = axis === "x" ? obstacle.left - radius : obstacle.top - radius;
  const max = axis === "x" ? obstacle.right + radius : obstacle.bottom + radius;
  const otherMin = otherAxis === "x"
    ? obstacle.left - radius
    : obstacle.top - radius;
  const otherMax = otherAxis === "x"
    ? obstacle.right + radius
    : obstacle.bottom + radius;
  if (previous[otherAxis] < otherMin || previous[otherAxis] > otherMax) {
    return desired;
  }

  const next = { ...desired };
  if (previous[axis] <= min && desired[axis] > min) {
    next[axis] = min;
  } else if (previous[axis] >= max && desired[axis] < max) {
    next[axis] = max;
  } else if (previous[axis] > min && previous[axis] < max) {
    next[axis] = Math.abs(previous[axis] - min) <= Math.abs(max - previous[axis])
      ? min
      : max;
  }
  return next;
}

function resolveCircleAxis(
  previous: Vec2,
  desired: Vec2,
  radius: number,
  obstacle: CircleObstacle,
  axis: "x" | "y",
): Vec2 {
  const otherAxis = axis === "x" ? "y" : "x";
  const centerAxis = axis === "x" ? obstacle.x : obstacle.y;
  const centerOther = otherAxis === "x" ? obstacle.x : obstacle.y;
  const expandedRadius = obstacle.radius + radius;
  const offset = previous[otherAxis] - centerOther;
  const remaining = expandedRadius * expandedRadius - offset * offset;
  if (remaining <= EPSILON) return desired;

  const edge = Math.sqrt(remaining);
  const min = centerAxis - edge;
  const max = centerAxis + edge;
  const next = { ...desired };
  if (previous[axis] <= min && desired[axis] > min) {
    next[axis] = min;
  } else if (previous[axis] >= max && desired[axis] < max) {
    next[axis] = max;
  } else if (previous[axis] > min && previous[axis] < max) {
    next[axis] = Math.abs(previous[axis] - min) <= Math.abs(max - previous[axis])
      ? min
      : max;
  }
  return next;
}

function resolveObstacleAxis(
  previous: Vec2,
  desired: Vec2,
  radius: number,
  obstacle: RoomObstacle,
  axis: "x" | "y",
): Vec2 {
  return obstacle.kind === "rect"
    ? resolveRectAxis(previous, desired, radius, obstacle, axis)
    : resolveCircleAxis(previous, desired, radius, obstacle, axis);
}

/**
 * Resolves an actor's desired room movement one axis at a time. Axis separation
 * keeps wall movement readable and avoids pulling battle-arena collision rules
 * into exploration rooms.
 */
export function resolveRoomMovement(
  previous: Vec2,
  desired: Vec2,
  radius: number,
  room: StageRoomDefinition,
): Vec2 {
  if (!Number.isFinite(desired.x) || !Number.isFinite(desired.y)) {
    return clampToRoomBounds(previous, radius, room);
  }
  const safeRadius = Number.isFinite(radius) ? Math.max(0, radius) : 0;
  const start = clampToRoomBounds(previous, safeRadius, room);
  let resolvedX = clampToRoomBounds({ x: desired.x, y: start.y }, safeRadius, room);
  for (const obstacle of room.obstacles) {
    resolvedX = resolveObstacleAxis(start, resolvedX, safeRadius, obstacle, "x");
  }

  const afterX = { x: resolvedX.x, y: start.y };
  let resolvedY = clampToRoomBounds({ x: afterX.x, y: desired.y }, safeRadius, room);
  for (const obstacle of room.obstacles) {
    resolvedY = resolveObstacleAxis(afterX, resolvedY, safeRadius, obstacle, "y");
  }
  return clampToRoomBounds({ x: resolvedX.x, y: resolvedY.y }, safeRadius, room);
}
