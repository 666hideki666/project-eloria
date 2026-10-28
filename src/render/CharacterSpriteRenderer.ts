import { ACCESSIBILITY } from "../config";
import type {
  CharacterActionKind,
  CharacterState,
  GamePhase,
  Vec2,
} from "../game/types";
import {
  type CharacterActionSpriteConfig,
  type CharacterSpriteConfig,
  type CharacterSpriteDirection,
} from "./characterSpriteConfig";
import { DOWNED_CHARACTER_SPRITES, DOWNED_FRAME } from "./downedCharacterSprites";
import { resolveSpriteDirection } from "./spriteDirection";

export type CharacterSpritePose = "idle" | "walk" | "action" | "downed";
export type CharacterSpriteLoadStatus = "loading" | "ready" | "failed";

export interface CharacterSpriteDebugState {
  status: CharacterSpriteLoadStatus;
  downedStatus: CharacterSpriteLoadStatus;
  direction: CharacterSpriteDirection;
  pose: CharacterSpritePose;
  frame: number;
  actionKind: CharacterActionKind | null;
  sequenceId: number;
  sheet: "base" | "action";
}

interface AnimationState {
  direction: CharacterSpriteDirection;
  pose: CharacterSpritePose;
  elapsed: number;
  frame: number;
  previousWorldTime: number;
  actionSequenceId: number;
  actionKind: CharacterActionKind | null;
  sheet: "base" | "action";
}

interface ActionSpriteAsset {
  config: CharacterActionSpriteConfig;
  image: HTMLImageElement;
  status: CharacterSpriteLoadStatus;
}

export function resolveCharacterSpriteDirection(
  vector: Vec2,
  previous: CharacterSpriteDirection,
): CharacterSpriteDirection {
  return resolveSpriteDirection(vector, previous);
}

export function selectCharacterSpriteFrame(
  config: CharacterSpriteConfig,
  direction: CharacterSpriteDirection,
  pose: CharacterSpritePose,
  elapsed: number,
): number {
  const directionFrames = config.directions[direction];
  const frames = pose === "walk"
    ? directionFrames.walk
    : directionFrames.idle;
  if (frames.length === 0) return directionFrames.row * config.columns;
  if (pose === "action" || pose === "downed") return frames[0] ?? 0;
  const fps = pose === "walk" ? config.walkFps : config.idleFps;
  return frames[Math.floor(elapsed * fps) % frames.length] ?? frames[0] ?? 0;
}

export function selectCharacterActionSpriteFrame(
  config: CharacterActionSpriteConfig,
  direction: CharacterSpriteDirection,
  elapsed: number,
): number {
  const frames = config.directions[direction].frames;
  if (frames.length === 0) {
    return config.directions[direction].row * config.columns;
  }

  const duration = Math.max(
    config.durationSeconds,
    config.frameDurationsSeconds.reduce((sum, value) => sum + value, 0),
  );
  const animationTime = config.loop && duration > 0
    ? Math.max(0, elapsed) % duration
    : Math.min(Math.max(0, elapsed), duration);
  let boundary = 0;
  for (let index = 0; index < frames.length; index += 1) {
    boundary += config.frameDurationsSeconds[index] ?? 0;
    if (animationTime < boundary) return frames[index] ?? frames[0] ?? 0;
  }
  return frames.at(-1) ?? frames[0] ?? 0;
}

export class CharacterSpriteRenderer {
  private readonly image: HTMLImageElement;
  private readonly downedImage: HTMLImageElement;
  private downedLoadStatus: CharacterSpriteLoadStatus = "loading";
  private readonly actionSprites = new Map<
    CharacterActionKind,
    ActionSpriteAsset
  >();
  private loadStatus: CharacterSpriteLoadStatus = "loading";
  private destroyed = false;
  private readonly animation: AnimationState;

  public constructor(public readonly config: CharacterSpriteConfig) {
    const initialDirection: CharacterSpriteDirection = "right";
    this.animation = {
      direction: initialDirection,
      pose: "idle",
      elapsed: 0,
      frame:
        config.directions[initialDirection].idle[0] ??
        config.directions[initialDirection].row * config.columns,
      previousWorldTime: 0,
      actionSequenceId: 0,
      actionKind: null,
      sheet: "base",
    };
    this.image = new Image();
    this.image.decoding = "async";
    this.image.onload = () => {
      if (this.destroyed) return;
      const validDimensions =
        this.image.naturalWidth === this.config.sheetWidth &&
        this.image.naturalHeight === this.config.sheetHeight;
      this.loadStatus = validDimensions ? "ready" : "failed";
    };
    this.image.onerror = () => {
      if (!this.destroyed) this.loadStatus = "failed";
    };
    this.image.src = this.config.imageUrl;

    for (const [kind, actionConfig] of Object.entries(this.config.actions)) {
      if (!actionConfig) continue;
      const image = new Image();
      const asset: ActionSpriteAsset = {
        config: actionConfig,
        image,
        status: "loading",
      };
      this.actionSprites.set(kind as CharacterActionKind, asset);
      image.decoding = "async";
      image.onload = () => {
        if (this.destroyed) return;
        const validDimensions =
          image.naturalWidth === actionConfig.sheetWidth &&
          image.naturalHeight === actionConfig.sheetHeight;
        asset.status = validDimensions ? "ready" : "failed";
      };
      image.onerror = () => {
        if (!this.destroyed) asset.status = "failed";
      };
      image.src = actionConfig.imageUrl;
    }

    this.downedImage = new Image();
    this.downedImage.decoding = "async";
    this.downedImage.onload = () => {
      if (this.destroyed) return;
      this.downedLoadStatus = this.downedImage.naturalWidth === DOWNED_FRAME.width &&
        this.downedImage.naturalHeight === DOWNED_FRAME.height ? "ready" : "failed";
    };
    this.downedImage.onerror = () => {
      if (!this.destroyed) this.downedLoadStatus = "failed";
    };
    this.downedImage.src = DOWNED_CHARACTER_SPRITES[config.characterId];
  }

  public get debugState(): CharacterSpriteDebugState {
    return {
      status: this.loadStatus,
      downedStatus: this.downedLoadStatus,
      direction: this.animation.direction,
      pose: this.animation.pose,
      frame: this.animation.frame,
      actionKind: this.animation.actionKind,
      sequenceId: this.animation.actionSequenceId,
      sheet: this.animation.sheet,
    };
  }

  public draw(
    context: CanvasRenderingContext2D,
    member: CharacterState,
    worldTime: number,
    phase: GamePhase,
  ): boolean {
    this.updateAnimation(member, worldTime, phase);
    if (member.downed) {
      if (this.downedLoadStatus !== "ready") return false;
      // Ground-contact coordinates remain unchanged. A single authored pose has
      // no bob, facing mirror, action animation, or invulnerability flicker.
      const scale = this.config.drawScale;
      context.save();
      context.imageSmoothingEnabled = false;
      context.drawImage(
        this.downedImage,
        0, 0, DOWNED_FRAME.width, DOWNED_FRAME.height,
        -Math.round(DOWNED_FRAME.anchorX * scale),
        -Math.round(DOWNED_FRAME.anchorY * scale),
        DOWNED_FRAME.width * scale, DOWNED_FRAME.height * scale,
      );
      context.restore();
      return true;
    }
    if (this.loadStatus !== "ready") return false;

    const actionAsset = this.animation.sheet === "action" &&
      this.animation.actionKind
      ? this.actionSprites.get(this.animation.actionKind)
      : undefined;
    const spriteImage = actionAsset?.image ?? this.image;
    const frameWidth = actionAsset?.config.frameWidth ?? this.config.frameWidth;
    const frameHeight =
      actionAsset?.config.frameHeight ?? this.config.frameHeight;
    const columns = actionAsset?.config.columns ?? this.config.columns;
    const frame = this.animation.frame;
    const sourceX = (frame % columns) * frameWidth;
    const sourceY =
      Math.floor(frame / columns) * frameHeight;
    // Nadi's six left-facing base frames contain an isolated 2-pixel-high
    // artifact at rows 46-47, well below the boots (which end at row 37).
    const trimBottom = this.config.characterId === "nadi" &&
      this.animation.sheet === "base" && this.animation.direction === "left" ? 2 : 0;
    const sourceHeight = frameHeight - trimBottom;
    const drawWidth = frameWidth * this.config.drawScale;
    const drawHeight = sourceHeight * this.config.drawScale;
    const anchorX = Math.round(
      frameWidth *
        this.config.anchor.x *
        this.config.drawScale,
    );
    const anchorY = Math.round(
      frameHeight *
        this.config.anchor.y *
        this.config.drawScale,
    );
    const directionOffsetY =
      this.config.directionDrawOffsetY[this.animation.direction];
    const drawX = Math.round(this.config.drawOffsetX - anchorX);
    const drawY = Math.round(
      this.config.drawOffsetY + directionOffsetY - anchorY,
    );

    context.drawImage(
      spriteImage,
      sourceX,
      sourceY,
      frameWidth,
      sourceHeight,
      drawX,
      drawY,
      drawWidth,
      drawHeight,
    );

    if (member.hurtFlash > 0 && ACCESSIBILITY.strongFlashes) {
      context.save();
      context.globalAlpha *= 0.62;
      context.globalCompositeOperation = "screen";
      context.drawImage(
        spriteImage,
        sourceX,
        sourceY,
        frameWidth,
        sourceHeight,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
      );
      context.restore();
    }
    return true;
  }

  public destroy(): void {
    this.destroyed = true;
    this.image.onload = null;
    this.image.onerror = null;
    this.downedImage.onload = null;
    this.downedImage.onerror = null;
    for (const asset of this.actionSprites.values()) {
      asset.image.onload = null;
      asset.image.onerror = null;
    }
    this.actionSprites.clear();
  }

  private updateAnimation(
    member: CharacterState,
    worldTime: number,
    phase: GamePhase,
  ): void {
    if (phase !== "playing") {
      this.animation.previousWorldTime = worldTime;
      return;
    }
    const rawDelta = worldTime - this.animation.previousWorldTime;
    const delta =
      rawDelta > 0 && rawDelta <= 0.1 && phase === "playing" ? rawDelta : 0;
    const moving =
      !member.downed &&
      member.actionTimer <= 0 &&
      phase === "playing" &&
      Math.hypot(member.moveIntent.x, member.moveIntent.y) > 0.05;
    const actionActive = !member.downed && member.actionTimer > 0;
    const actionSequenceChanged =
      actionActive &&
      member.actionSequenceId !== this.animation.actionSequenceId;

    let direction = this.animation.direction;
    if (actionSequenceChanged) {
      direction = resolveCharacterSpriteDirection(
        member.actionKind ? member.actionFacing : member.facing,
        direction,
      );
    } else if (moving) {
      direction = resolveCharacterSpriteDirection(member.moveIntent, direction);
    } else if (actionActive && this.animation.pose !== "action") {
      direction = resolveCharacterSpriteDirection(member.facing, direction);
    }

    const pose: CharacterSpritePose = member.downed
      ? "downed"
      : actionActive
        ? "action"
        : moving
          ? "walk"
          : "idle";
    const actionKind = pose === "action" ? member.actionKind : null;
    const actionAsset = actionKind
      ? this.actionSprites.get(actionKind)
      : undefined;
    const sheet = actionAsset?.status === "ready" ? "action" : "base";
    const stateChanged =
      direction !== this.animation.direction ||
      pose !== this.animation.pose ||
      sheet !== this.animation.sheet ||
      actionSequenceChanged;
    this.animation.direction = direction;
    this.animation.pose = pose;
    this.animation.actionKind = actionKind;
    this.animation.sheet = sheet;
    this.animation.actionSequenceId = member.actionSequenceId;
    this.animation.elapsed = pose === "action"
      ? Math.max(0, member.actionDuration - member.actionTimer)
      : stateChanged
        ? 0
        : this.animation.elapsed + delta;
    this.animation.frame = sheet === "action" && actionAsset
      ? selectCharacterActionSpriteFrame(
          actionAsset.config,
          this.animation.direction,
          this.animation.elapsed,
        )
      : selectCharacterSpriteFrame(
          this.config,
          this.animation.direction,
          this.animation.pose,
          this.animation.elapsed,
        );
    this.animation.previousWorldTime = worldTime;
  }
}
