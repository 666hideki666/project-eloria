import type { CameraSnapshot } from "../stage/StageCamera";
import type { Vec2 } from "./types";

/** Two logical tiles beyond the visible 640x360 camera. */
export const FIELD_ENEMY_RESPAWN_CAMERA_MARGIN = 64;
/**
 * Covers the half-size of a 48px sprite, its shadow, and the HP/armor bars
 * beyond the collision circle. The camera margin is applied outside this.
 */
export const FIELD_ENEMY_RESPAWN_PRESENTATION_PADDING = 32;
/** A brief camera-stable hold prevents one-frame edge crossings from spawning. */
export const FIELD_ENEMY_RESPAWN_OFFSCREEN_HOLD = 0.65;

export interface FieldEnemyRespawnPoint {
  pos: Vec2;
  radius: number;
}

/**
 * A group is eligible only when every member's complete presentation envelope
 * is beyond the expanded camera rectangle. One visible edge member keeps the
 * entire defeated group dormant.
 */
export function isFieldEnemyGroupOutsideExpandedCamera(
  points: readonly FieldEnemyRespawnPoint[],
  camera: CameraSnapshot,
  margin = FIELD_ENEMY_RESPAWN_CAMERA_MARGIN,
): boolean {
  if (points.length === 0) return false;
  const left = camera.x - margin;
  const right = camera.x + camera.viewportWidth + margin;
  const top = camera.y - margin;
  const bottom = camera.y + camera.viewportHeight + margin;

  return points.every((point) => {
    const extent = point.radius + FIELD_ENEMY_RESPAWN_PRESENTATION_PADDING;
    const presentationLeft = point.pos.x - extent;
    const presentationRight = point.pos.x + extent;
    const presentationTop = point.pos.y - extent;
    const presentationBottom = point.pos.y + extent;
    return presentationRight < left || presentationLeft > right ||
      presentationBottom < top || presentationTop > bottom;
  });
}
