import { EFFECT_POOL_SIZE } from "../config";
import type { Vec2 } from "../game/types";

export type EffectKind =
  | "spark"
  | "slash"
  | "ring"
  | "wind"
  | "leaf"
  | "crystal"
  | "dust"
  | "text"
  | "barrier"
  | "bladeArc"
  | "moonTrail"
  | "phosphorMote"
  | "impactRing";

export interface Effect {
  active: boolean;
  kind: EffectKind;
  pos: Vec2;
  velocity: Vec2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  text: string;
  layer: "back" | "front" | "hud";
}

export interface EffectOptions {
  kind: EffectKind;
  pos: Vec2;
  velocity?: Vec2;
  life?: number;
  size?: number;
  color?: string;
  alpha?: number;
  rotation?: number;
  text?: string;
  layer?: Effect["layer"];
}

function createEffect(): Effect {
  return {
    active: false,
    kind: "spark",
    pos: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    life: 0,
    maxLife: 0,
    size: 2,
    color: "#ffffff",
    alpha: 1,
    rotation: 0,
    text: "",
    layer: "front",
  };
}

export class EffectPool {
  public readonly effects: Effect[];
  public spawnCount = 0;
  private cursor = 0;

  public constructor(size = EFFECT_POOL_SIZE) {
    this.effects = Array.from({ length: size }, createEffect);
  }

  public spawn(options: EffectOptions): Effect {
    let effect = this.effects.find((item) => !item.active);
    if (!effect) {
      effect = this.effects[this.cursor];
      this.cursor = (this.cursor + 1) % this.effects.length;
    }
    if (!effect) throw new Error("Effect pool cannot be empty.");

    const life = options.life ?? 0.35;
    effect.active = true;
    effect.kind = options.kind;
    effect.pos = { ...options.pos };
    effect.velocity = { ...(options.velocity ?? { x: 0, y: 0 }) };
    effect.life = life;
    effect.maxLife = life;
    effect.size = options.size ?? 3;
    effect.color = options.color ?? "#ffffff";
    effect.alpha = options.alpha ?? 1;
    effect.rotation = options.rotation ?? 0;
    effect.text = options.text ?? "";
    effect.layer = options.layer ?? "front";
    this.spawnCount += 1;
    return effect;
  }

  public update(delta: number, pauseText = false): void {
    for (const effect of this.effects) {
      if (!effect.active || (pauseText && effect.kind === "text")) continue;
      effect.life -= delta;
      if (effect.life <= 0) {
        effect.active = false;
        continue;
      }
      effect.pos.x += effect.velocity.x * delta;
      effect.pos.y += effect.velocity.y * delta;
      effect.velocity.x *= Math.pow(0.1, delta);
      effect.velocity.y *= Math.pow(0.1, delta);
      if (effect.kind === "leaf") effect.rotation += delta * 4;
    }
  }

  public clear(): void {
    for (const effect of this.effects) effect.active = false;
  }
}
