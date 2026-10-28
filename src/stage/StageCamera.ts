import { VIEW } from "../config";
import type { Vec2 } from "../game/types";

export interface CameraSnapshot {
  x: number;
  y: number;
  viewportWidth: typeof VIEW.width;
  viewportHeight: typeof VIEW.height;
}

export interface CameraWorldSize {
  width: number;
  height: number;
  cameraBounds?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
}

const DEAD_ZONE = {
  left: 260,
  right: 380,
  top: 145,
  bottom: 215,
} as const;

export class StageCamera {
  private x = 0;
  private y = 0;
  private targetX = 0;
  private targetY = 0;

  public constructor(private readonly world: CameraWorldSize) {}

  public snapTo(focus: Vec2): void {
    this.targetX = focus.x - VIEW.width * 0.5;
    this.targetY = focus.y - VIEW.height * 0.5;
    this.clampTarget();
    this.x = this.targetX;
    this.y = this.targetY;
  }

  public update(focus: Vec2, delta: number): void {
    const screenX = focus.x - this.x;
    const screenY = focus.y - this.y;
    if (screenX < DEAD_ZONE.left) this.targetX = focus.x - DEAD_ZONE.left;
    else if (screenX > DEAD_ZONE.right) this.targetX = focus.x - DEAD_ZONE.right;
    if (screenY < DEAD_ZONE.top) this.targetY = focus.y - DEAD_ZONE.top;
    else if (screenY > DEAD_ZONE.bottom) this.targetY = focus.y - DEAD_ZONE.bottom;
    this.clampTarget();
    const blend = 1 - Math.exp(-Math.max(0, delta) * 10);
    this.x += (this.targetX - this.x) * blend;
    this.y += (this.targetY - this.y) * blend;
  }

  public get snapshot(): CameraSnapshot {
    return {
      x: Math.round(this.x),
      y: Math.round(this.y),
      viewportWidth: VIEW.width,
      viewportHeight: VIEW.height,
    };
  }

  private clampTarget(): void {
    const bounds = this.world.cameraBounds ?? {
      left: 0,
      top: 0,
      right: Math.max(0, this.world.width - VIEW.width),
      bottom: Math.max(0, this.world.height - VIEW.height),
    };
    this.targetX = Math.max(bounds.left, Math.min(bounds.right, this.targetX));
    this.targetY = Math.max(bounds.top, Math.min(bounds.bottom, this.targetY));
  }
}
