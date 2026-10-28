import { ACCESSIBILITY } from "../config";
import type { EnemyState, Vec2 } from "../game/types";
import {
  type EnemyActionSpriteConfig,
  type EnemyActionSpritePhase,
  type EnemySpriteClip,
  type EnemySpriteConfig,
} from "./enemySpriteConfig";
import {
  resolveSpriteDirection,
  type SpriteDirection,
} from "./spriteDirection";

export type EnemySpriteLoadStatus = "loading" | "ready" | "failed";

export interface EnemySpriteDebugState {
  status: EnemySpriteLoadStatus;
  direction: SpriteDirection;
  clip: EnemySpriteClip | EnemyActionSpritePhase;
  frame: number;
  action?: string;
  sheet?: "base" | "action";
  actionStatus?: EnemySpriteLoadStatus;
}

interface EnemyAnimationState {
  direction: SpriteDirection;
  clip: EnemySpriteClip;
  elapsed: number;
  frame: number;
  previousWorldTime: number;
  previousPos: Vec2;
  actionName: string | null;
  actionDirection: SpriteDirection;
}

interface LoadedEnemyActionSprite {
  config: EnemyActionSpriteConfig;
  image: HTMLImageElement;
  status: EnemySpriteLoadStatus;
}

interface ActiveEnemyActionSprite {
  config: EnemyActionSpriteConfig;
  phase: EnemyActionSpritePhase;
}

interface RenderableEnemySpriteConfig {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  drawScale: number;
  anchor: {
    x: number;
    y: number;
  };
  directionDrawOffsetX: Record<SpriteDirection, number>;
  directionDrawOffsetY: Record<SpriteDirection, number>;
}

function frameSequenceDuration(
  durations: readonly number[],
): number {
  return durations.reduce(
    (sum, duration) => sum + duration,
    0,
  );
}

function clipDuration(
  config: EnemySpriteConfig,
  clip: EnemySpriteClip,
): number {
  return frameSequenceDuration(
    config.clips[clip].frameDurationsSeconds,
  );
}

export function enemySpritePhaseOffset(
  config: EnemySpriteConfig,
  enemyId: number,
  clip: EnemySpriteClip,
): number {
  const phase = ((enemyId * 0.37) % 1 + 1) % 1;
  return phase * clipDuration(config, clip);
}

export function selectEnemySpriteFrame(
  config: EnemySpriteConfig,
  direction: SpriteDirection,
  clip: EnemySpriteClip,
  elapsed: number,
): number {
  const directionFrames = config.directions[direction].frames;
  const clipConfig = config.clips[clip];
  const frameIndexes = clipConfig.framesWithinDirection;
  if (frameIndexes.length === 0) {
    return directionFrames[0] ??
      config.directions[direction].row * config.columns;
  }

  const duration = clipDuration(config, clip);
  const animationTime = clipConfig.loop && duration > 0
    ? ((Math.max(0, elapsed) % duration) + duration) % duration
    : Math.min(Math.max(0, elapsed), duration);
  let boundary = 0;
  for (let index = 0; index < frameIndexes.length; index += 1) {
    boundary += clipConfig.frameDurationsSeconds[index] ?? 0;
    if (animationTime < boundary) {
      const frameWithinDirection = frameIndexes[index] ?? frameIndexes[0] ?? 0;
      return directionFrames[frameWithinDirection] ??
        config.directions[direction].row * config.columns;
    }
  }

  const finalIndex = frameIndexes.at(-1) ?? 0;
  return directionFrames[finalIndex] ??
    config.directions[direction].row * config.columns;
}

export function selectEnemyActionSpriteFrame(
  config: EnemyActionSpriteConfig,
  direction: SpriteDirection,
  phase: EnemyActionSpritePhase,
  elapsed: number,
): number {
  const directionFrames = config.directions[direction].frames;
  const phaseConfig = config.phases[phase];
  const frameIndexes = phaseConfig.framesWithinDirection;
  if (frameIndexes.length === 0) {
    return directionFrames[0] ??
      config.directions[direction].row * config.columns;
  }

  const duration = frameSequenceDuration(
    phaseConfig.frameDurationsSeconds,
  );
  const animationTime = phaseConfig.loop && duration > 0
    ? ((Math.max(0, elapsed) % duration) + duration) % duration
    : Math.min(Math.max(0, elapsed), duration);
  let boundary = 0;
  for (let index = 0; index < frameIndexes.length; index += 1) {
    boundary += phaseConfig.frameDurationsSeconds[index] ?? 0;
    if (animationTime < boundary) {
      const frameWithinDirection = frameIndexes[index] ??
        frameIndexes[0] ??
        0;
      return directionFrames[frameWithinDirection] ??
        config.directions[direction].row * config.columns;
    }
  }

  const finalIndex = frameIndexes.at(-1) ?? 0;
  return directionFrames[finalIndex] ??
    config.directions[direction].row * config.columns;
}

export function resolveEnemyActionSprite(
  config: EnemySpriteConfig,
  enemy: EnemyState,
): ActiveEnemyActionSprite | null {
  if (enemy.attackStyle === "iwaTailSweep") return null;
  if (
    enemy.aiState !== "windup" &&
    enemy.aiState !== "attack" &&
    enemy.aiState !== "recover"
  ) {
    return null;
  }
  for (const action of Object.values(config.actions)) {
    if (action.phases[enemy.aiState]) {
      return {
        config: action,
        phase: enemy.aiState,
      };
    }
  }
  return null;
}

export function resolveEnemySpriteClip(
  enemy: EnemyState,
  previousPos: Vec2,
): EnemySpriteClip {
  if (Math.hypot(enemy.knockback.x, enemy.knockback.y) > 0.5) return "idle";

  if (
    enemy.aiState === "approach" ||
    enemy.aiState === "reposition" ||
    enemy.aiState === "recover" ||
    (
      enemy.archetype === "heavyCharge" &&
      enemy.aiState === "attack"
    )
  ) {
    return "move";
  }

  if (enemy.aiState === "idle") {
    const moved = Math.hypot(
      enemy.pos.x - previousPos.x,
      enemy.pos.y - previousPos.y,
    );
    const targetDistance = Math.hypot(
      enemy.idleTarget.x - enemy.pos.x,
      enemy.idleTarget.y - enemy.pos.y,
    );
    return moved > 0.05 || targetDistance > 2 ? "move" : "idle";
  }

  return "idle";
}

export class EnemySpriteRenderer {
  private readonly image: HTMLImageElement;
  private readonly actionSprites = new Map<string, LoadedEnemyActionSprite>();
  private readonly animationByEnemyId = new Map<number, EnemyAnimationState>();
  private readonly debugByEnemyId = new Map<number, EnemySpriteDebugState>();
  private loadStatus: EnemySpriteLoadStatus = "loading";
  private destroyed = false;

  public constructor(public readonly config: EnemySpriteConfig) {
    this.image = new Image();
    this.image.decoding = "async";
    this.image.onload = () => {
      if (this.destroyed) return;
      const dimensionsAreValid =
        this.image.naturalWidth === this.config.sheetWidth &&
        this.image.naturalHeight === this.config.sheetHeight;
      this.loadStatus = dimensionsAreValid ? "ready" : "failed";
    };
    this.image.onerror = () => {
      if (!this.destroyed) this.loadStatus = "failed";
    };
    this.image.src = this.config.imageUrl;

    for (const actionConfig of Object.values(this.config.actions)) {
      const image = new Image();
      const loaded: LoadedEnemyActionSprite = {
        config: actionConfig,
        image,
        status: "loading",
      };
      image.decoding = "async";
      image.onload = () => {
        if (this.destroyed) return;
        const dimensionsAreValid =
          image.naturalWidth === actionConfig.sheetWidth &&
          image.naturalHeight === actionConfig.sheetHeight;
        loaded.status = dimensionsAreValid ? "ready" : "failed";
      };
      image.onerror = () => {
        if (!this.destroyed) loaded.status = "failed";
      };
      image.src = actionConfig.imageUrl;
      this.actionSprites.set(actionConfig.action, loaded);
    }
  }

  public get status(): EnemySpriteLoadStatus {
    return this.loadStatus;
  }

  public getDebugState(enemyId: number): EnemySpriteDebugState | null {
    return this.debugByEnemyId.get(enemyId) ?? null;
  }

  public getActionStatus(action: string): EnemySpriteLoadStatus | undefined {
    return this.actionSprites.get(action)?.status;
  }

  public draw(
    context: CanvasRenderingContext2D,
    enemy: EnemyState,
    worldTime: number,
    squashY = 1,
  ): boolean {
    const animation = this.updateAnimation(enemy, worldTime);
    const action = resolveEnemyActionSprite(this.config, enemy);
    let image = this.image;
    let renderConfig: RenderableEnemySpriteConfig = this.config;
    let direction = animation.direction;
    let frame = animation.frame;
    let appliedSquash = squashY;
    let canDraw = this.loadStatus === "ready";
    let debugState: EnemySpriteDebugState = {
      status: this.loadStatus,
      direction,
      clip: animation.clip,
      frame,
    };

    if (action) {
      if (animation.actionName !== action.config.action) {
        animation.actionName = action.config.action;
        animation.actionDirection = resolveSpriteDirection(
          enemy.attackDirection,
          animation.direction,
        );
      }
      const loadedAction = this.actionSprites.get(action.config.action);
      if (loadedAction?.status === "ready") {
        image = loadedAction.image;
        renderConfig = action.config;
        direction = animation.actionDirection;
        frame = selectEnemyActionSpriteFrame(
          action.config,
          direction,
          action.phase,
          enemy.stateAge,
        );
        appliedSquash = 1;
        canDraw = true;
        debugState = {
          status: "ready",
          direction,
          clip: action.phase,
          frame,
          action: action.config.action,
          sheet: "action",
          actionStatus: "ready",
        };
      } else {
        direction = animation.actionDirection;
        frame = selectEnemySpriteFrame(
          this.config,
          direction,
          animation.clip,
          animation.elapsed,
        );
        debugState = {
          status: this.loadStatus,
          direction,
          clip: animation.clip,
          frame,
          action: action.config.action,
          sheet: "base",
          actionStatus: loadedAction?.status ?? "failed",
        };
      }
    } else {
      animation.actionName = null;
      animation.actionDirection = animation.direction;
    }
    this.debugByEnemyId.set(enemy.id, debugState);
    if (!canDraw) return false;

    const sourceX =
      (frame % renderConfig.columns) * renderConfig.frameWidth;
    const sourceY =
      Math.floor(frame / renderConfig.columns) *
      renderConfig.frameHeight;
    const drawWidth = Math.round(
      renderConfig.frameWidth * renderConfig.drawScale,
    );
    const drawHeight = Math.round(
      renderConfig.frameHeight * renderConfig.drawScale,
    );
    const drawX = Math.round(
      -renderConfig.anchor.x * drawWidth +
        renderConfig.directionDrawOffsetX[direction],
    );
    const drawY = Math.round(
      -renderConfig.anchor.y * drawHeight +
        renderConfig.directionDrawOffsetY[direction],
    );

    context.save();
    context.imageSmoothingEnabled = false;
    context.translate(Math.round(enemy.pos.x), Math.round(enemy.pos.y));
    context.scale(1 / appliedSquash, appliedSquash);
    context.drawImage(
      image,
      sourceX,
      sourceY,
      renderConfig.frameWidth,
      renderConfig.frameHeight,
      drawX,
      drawY,
      drawWidth,
      drawHeight,
    );
    if (enemy.hurtFlash > 0) {
      context.globalCompositeOperation = "screen";
      context.globalAlpha = ACCESSIBILITY.strongFlashes ? 0.62 : 0.3;
      context.drawImage(
        image,
        sourceX,
        sourceY,
        renderConfig.frameWidth,
        renderConfig.frameHeight,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
      );
    }
    context.restore();
    return true;
  }

  public destroy(): void {
    this.destroyed = true;
    this.image.onload = null;
    this.image.onerror = null;
    for (const action of this.actionSprites.values()) {
      action.image.onload = null;
      action.image.onerror = null;
    }
    this.actionSprites.clear();
    this.animationByEnemyId.clear();
    this.debugByEnemyId.clear();
  }

  private updateAnimation(
    enemy: EnemyState,
    worldTime: number,
  ): EnemyAnimationState {
    const existing = this.animationByEnemyId.get(enemy.id);
    if (!existing) {
      const direction = resolveSpriteDirection(enemy.facing, "down");
      const clip = resolveEnemySpriteClip(enemy, enemy.pos);
      const elapsed = enemySpritePhaseOffset(this.config, enemy.id, clip);
      const created: EnemyAnimationState = {
        direction,
        clip,
        elapsed,
        frame: selectEnemySpriteFrame(
          this.config,
          direction,
          clip,
          elapsed,
        ),
        previousWorldTime: worldTime,
        previousPos: { ...enemy.pos },
        actionName: null,
        actionDirection: direction,
      };
      this.animationByEnemyId.set(enemy.id, created);
      return created;
    }

    const direction = resolveSpriteDirection(enemy.facing, existing.direction);
    const clip = resolveEnemySpriteClip(enemy, existing.previousPos);
    const delta = Math.min(
      0.05,
      Math.max(0, worldTime - existing.previousWorldTime),
    );
    existing.direction = direction;
    if (clip !== existing.clip) {
      existing.clip = clip;
      existing.elapsed = enemySpritePhaseOffset(this.config, enemy.id, clip);
    } else {
      existing.elapsed += delta;
    }
    existing.frame = selectEnemySpriteFrame(
      this.config,
      direction,
      clip,
      existing.elapsed,
    );
    existing.previousWorldTime = worldTime;
    existing.previousPos = { ...enemy.pos };
    return existing;
  }
}
