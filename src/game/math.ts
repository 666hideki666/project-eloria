import type { Vec2 } from "./types";

export const ZERO: Readonly<Vec2> = { x: 0, y: 0 };

export function vec(x = 0, y = 0): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(value: Vec2, amount: number): Vec2 {
  return { x: value.x * amount, y: value.y * amount };
}

export function lengthSq(value: Vec2): number {
  return value.x * value.x + value.y * value.y;
}

export function length(value: Vec2): number {
  return Math.sqrt(lengthSq(value));
}

export function normalize(value: Vec2, fallback: Vec2 = { x: 0, y: 1 }): Vec2 {
  const magnitude = length(value);
  if (magnitude < 0.0001) return { ...fallback };
  return { x: value.x / magnitude, y: value.y / magnitude };
}

export function distance(a: Vec2, b: Vec2): number {
  return length(sub(a, b));
}

export function distancePointToSegment(
  point: Vec2,
  start: Vec2,
  end: Vec2,
): number {
  const segment = sub(end, start);
  const segmentLengthSq = lengthSq(segment);
  if (segmentLengthSq < 0.000001) return distance(point, start);
  const offset = sub(point, start);
  const projection = clamp(dot(offset, segment) / segmentLengthSq, 0, 1);
  const closest = add(start, scale(segment, projection));
  return distance(point, closest);
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function perpendicular(value: Vec2): Vec2 {
  return { x: -value.y, y: value.x };
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function clampToArena(position: Vec2, margin: number): Vec2 {
  return {
    x: clamp(position.x, 42 + margin, 598 - margin),
    y: clamp(position.y, 54 + margin, 326 - margin),
  };
}

export function approach(current: number, target: number, amount: number): number {
  if (current < target) return Math.min(current + amount, target);
  return Math.max(current - amount, target);
}

export function angleBetween(direction: Vec2, offset: Vec2): number {
  const a = normalize(direction);
  const b = normalize(offset);
  return Math.acos(clamp(dot(a, b), -1, 1));
}

export function rotateDirectionToward(
  current: Vec2,
  target: Vec2,
  maxRadians: number,
): Vec2 {
  const fallback = { x: 1, y: 0 };
  const safeCurrent =
    Number.isFinite(current.x) && Number.isFinite(current.y)
      ? normalize(current, fallback)
      : fallback;
  const safeTarget =
    Number.isFinite(target.x) && Number.isFinite(target.y)
      ? normalize(target, safeCurrent)
      : safeCurrent;
  const currentAngle = Math.atan2(safeCurrent.y, safeCurrent.x);
  const targetAngle = Math.atan2(safeTarget.y, safeTarget.x);
  const difference = Math.atan2(
    Math.sin(targetAngle - currentAngle),
    Math.cos(targetAngle - currentAngle),
  );
  const correctionLimit = Number.isFinite(maxRadians)
    ? Math.max(0, maxRadians)
    : 0;
  const correctedAngle =
    currentAngle + clamp(difference, -correctionLimit, correctionLimit);
  return {
    x: Math.cos(correctedAngle),
    y: Math.sin(correctedAngle),
  };
}

export function hash2d(x: number, y: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}
