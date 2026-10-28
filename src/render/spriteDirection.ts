import type { Vec2 } from "../game/types";

export type SpriteDirection = "down" | "up" | "left" | "right";

export function resolveSpriteDirection(
  vector: Vec2,
  previous: SpriteDirection,
): SpriteDirection {
  const horizontal = Math.abs(vector.x);
  const vertical = Math.abs(vector.y);
  if (horizontal < 0.001 && vertical < 0.001) return previous;

  if (Math.abs(horizontal - vertical) < 0.001) {
    const previousIsHorizontal = previous === "left" || previous === "right";
    if (previousIsHorizontal && horizontal > 0) {
      return vector.x < 0 ? "left" : "right";
    }
    return vector.y < 0 ? "up" : "down";
  }

  if (horizontal > vertical) return vector.x < 0 ? "left" : "right";
  return vector.y < 0 ? "up" : "down";
}
