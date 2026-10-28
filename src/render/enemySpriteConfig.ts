import mossPlunSpriteUrl from "../../assets/sprites/enemies/moss-plun/moss-plun-idle-hop-48px-v1.png?url";
import mossPlunFrameData from "../../assets/sprites/enemies/moss-plun/moss-plun-idle-hop-48px-v1.json";
import mossPlunJumpSlamSpriteUrl from "../../assets/sprites/enemies/moss-plun/attacks/moss-plun-jump-slam-48px-v1.png?url";
import mossPlunJumpSlamFrameData from "../../assets/sprites/enemies/moss-plun/attacks/moss-plun-jump-slam-48px-v1.json";
import garacrowSpriteUrl from "../../assets/sprites/enemies/garacrow/garacrow-idle-flight-48px-v1.png?url";
import garacrowFrameData from "../../assets/sprites/enemies/garacrow/garacrow-idle-flight-48px-v1.json";
import garacrowDiveStrikeSpriteUrl from "../../assets/sprites/enemies/garacrow/attacks/garacrow-dive-strike-48px-v2.png?url";
import garacrowDiveStrikeFrameData from "../../assets/sprites/enemies/garacrow/attacks/garacrow-dive-strike-48px-v2.json";
import lumibaneSpriteUrl from "../../assets/sprites/enemies/lumibane/lumibane-idle-flight-48px-v2.png?url";
import lumibaneFrameData from "../../assets/sprites/enemies/lumibane/lumibane-idle-flight-48px-v2.json";
import lumibaneLuminousDashSpriteUrl from "../../assets/sprites/enemies/lumibane/attacks/lumibane-luminous-dash-48px-v1.png?url";
import lumibaneLuminousDashFrameData from "../../assets/sprites/enemies/lumibane/attacks/lumibane-luminous-dash-48px-v1.json";
import utsurobouSpriteUrl from "../../assets/sprites/enemies/utsurobou/utsurobou-idle-drift-48px-v1.png?url";
import utsurobouFrameData from "../../assets/sprites/enemies/utsurobou/utsurobou-idle-drift-48px-v1.json";
import utsurobouMaskCurseWaveSpriteUrl from "../../assets/sprites/enemies/utsurobou/attacks/utsurobou-mask-curse-wave-48px-v1.png?url";
import utsurobouMaskCurseWaveFrameData from "../../assets/sprites/enemies/utsurobou/attacks/utsurobou-mask-curse-wave-48px-v1.json";
import iwaurokoSpriteUrl from "../../assets/sprites/enemies/iwauroko/iwauroko-idle-crawl-48px-v1.png?url";
import iwaurokoFrameData from "../../assets/sprites/enemies/iwauroko/iwauroko-idle-crawl-48px-v1.json";
import iwaUrokoRockArmorChargeSpriteUrl from "../../assets/sprites/enemies/iwauroko/attacks/iwauroko-rock-armor-charge-48px-v2.png?url";
import iwaUrokoRockArmorChargeFrameData from "../../assets/sprites/enemies/iwauroko/attacks/iwauroko-rock-armor-charge-48px-v2.json";
import type { EnemyKind } from "../game/types";
import type { SpriteDirection } from "./spriteDirection";

export type EnemySpriteClip = "idle" | "move";
export type EnemyActionSpritePhase = "windup" | "attack" | "recover";

export interface EnemyDirectionFrames {
  row: number;
  frames: number[];
}

interface EnemyClipFrameData {
  framesWithinDirection: number[];
  frameDurationsSeconds: number[];
  loop: boolean;
}

interface EnemySpriteFrameData {
  enemyKind: EnemyKind;
  sheetWidth: number;
  sheetHeight: number;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  drawScale: number;
  anchor: {
    x: number;
    y: number;
  };
  directions: Record<SpriteDirection, EnemyDirectionFrames>;
  clips: Record<EnemySpriteClip, EnemyClipFrameData>;
}

interface EnemyActionSpriteFrameData {
  enemyKind: EnemyKind;
  action: string;
  sheetWidth: number;
  sheetHeight: number;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  drawScale: number;
  anchor: {
    x: number;
    y: number;
  };
  directions: Record<SpriteDirection, EnemyDirectionFrames>;
  phases: Record<EnemyActionSpritePhase, EnemyClipFrameData>;
  hitEvent?: {
    phase: EnemyActionSpritePhase;
    frameWithinDirection: number;
    timeSeconds: number;
    maxHitsPerTarget?: number;
  };
}

export interface EnemySpriteClipConfig {
  framesWithinDirection: readonly number[];
  frameDurationsSeconds: readonly number[];
  loop: boolean;
}

export interface EnemyActionSpriteConfig {
  action: string;
  imageUrl: string;
  sheetWidth: number;
  sheetHeight: number;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  directions: Record<SpriteDirection, EnemyDirectionFrames>;
  phases: Record<EnemyActionSpritePhase, EnemySpriteClipConfig>;
  drawScale: number;
  anchor: {
    x: number;
    y: number;
  };
  directionDrawOffsetX: Record<SpriteDirection, number>;
  directionDrawOffsetY: Record<SpriteDirection, number>;
  hitEvent?: {
    phase: EnemyActionSpritePhase;
    frameWithinDirection: number;
    timeSeconds: number;
    maxHitsPerTarget?: number;
  };
}

export interface EnemySpriteConfig {
  enemyKind: EnemyKind;
  imageUrl: string;
  sheetWidth: number;
  sheetHeight: number;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  directions: Record<SpriteDirection, EnemyDirectionFrames>;
  clips: Record<EnemySpriteClip, EnemySpriteClipConfig>;
  drawScale: number;
  anchor: {
    x: number;
    y: number;
  };
  directionDrawOffsetX: Record<SpriteDirection, number>;
  directionDrawOffsetY: Record<SpriteDirection, number>;
  actions: Readonly<Record<string, EnemyActionSpriteConfig>>;
}

function createZeroOffsets(): Record<SpriteDirection, number> {
  return {
    down: 0,
    up: 0,
    left: 0,
    right: 0,
  };
}

export function createEnemySpriteConfig(
  imageUrl: string,
  rawMetadata: unknown,
): EnemySpriteConfig {
  const metadata = rawMetadata as EnemySpriteFrameData;
  const zeroOffsets = createZeroOffsets();
  return {
    enemyKind: metadata.enemyKind,
    imageUrl,
    sheetWidth: metadata.sheetWidth,
    sheetHeight: metadata.sheetHeight,
    frameWidth: metadata.frameWidth,
    frameHeight: metadata.frameHeight,
    columns: metadata.columns,
    rows: metadata.rows,
    directions: metadata.directions,
    clips: metadata.clips,
    drawScale: metadata.drawScale,
    anchor: metadata.anchor,
    directionDrawOffsetX: { ...zeroOffsets },
    directionDrawOffsetY: { ...zeroOffsets },
    actions: {},
  };
}

export function createEnemyActionSpriteConfig(
  imageUrl: string,
  rawMetadata: unknown,
): EnemyActionSpriteConfig {
  const metadata = rawMetadata as EnemyActionSpriteFrameData;
  const zeroOffsets = createZeroOffsets();
  return {
    action: metadata.action,
    imageUrl,
    sheetWidth: metadata.sheetWidth,
    sheetHeight: metadata.sheetHeight,
    frameWidth: metadata.frameWidth,
    frameHeight: metadata.frameHeight,
    columns: metadata.columns,
    rows: metadata.rows,
    directions: metadata.directions,
    phases: metadata.phases,
    drawScale: metadata.drawScale,
    anchor: metadata.anchor,
    directionDrawOffsetX: { ...zeroOffsets },
    directionDrawOffsetY: { ...zeroOffsets },
    ...(metadata.hitEvent ? { hitEvent: metadata.hitEvent } : {}),
  };
}

export const MOSS_PLUN_JUMP_SLAM_SPRITE =
  createEnemyActionSpriteConfig(
    mossPlunJumpSlamSpriteUrl,
    mossPlunJumpSlamFrameData,
  );

export const MOSS_PLUN_SPRITE: EnemySpriteConfig = {
  ...createEnemySpriteConfig(mossPlunSpriteUrl, mossPlunFrameData),
  actions: {
    jumpSlam: MOSS_PLUN_JUMP_SLAM_SPRITE,
  },
};

export const GARACROW_DIVE_STRIKE_SPRITE =
  createEnemyActionSpriteConfig(
    garacrowDiveStrikeSpriteUrl,
    garacrowDiveStrikeFrameData,
  );

export const GARACROW_SPRITE: EnemySpriteConfig = {
  ...createEnemySpriteConfig(garacrowSpriteUrl, garacrowFrameData),
  actions: {
    diveStrike: GARACROW_DIVE_STRIKE_SPRITE,
  },
};

export const LUMIBANE_LUMINOUS_DASH_SPRITE =
  createEnemyActionSpriteConfig(
    lumibaneLuminousDashSpriteUrl,
    lumibaneLuminousDashFrameData,
  );

export const LUMIBANE_SPRITE: EnemySpriteConfig = {
  ...createEnemySpriteConfig(lumibaneSpriteUrl, lumibaneFrameData),
  actions: {
    luminousDash: LUMIBANE_LUMINOUS_DASH_SPRITE,
  },
};

export const UTSUROBOU_MASK_CURSE_WAVE_SPRITE =
  createEnemyActionSpriteConfig(
    utsurobouMaskCurseWaveSpriteUrl,
    utsurobouMaskCurseWaveFrameData,
  );

export const UTSUROBOU_SPRITE: EnemySpriteConfig = {
  ...createEnemySpriteConfig(utsurobouSpriteUrl, utsurobouFrameData),
  actions: {
    maskCurseWave: UTSUROBOU_MASK_CURSE_WAVE_SPRITE,
  },
};

export const IWAUROKO_ROCK_ARMOR_CHARGE_SPRITE =
  createEnemyActionSpriteConfig(
    iwaUrokoRockArmorChargeSpriteUrl,
    iwaUrokoRockArmorChargeFrameData,
  );

export const IWAUROKO_SPRITE: EnemySpriteConfig = {
  ...createEnemySpriteConfig(
    iwaurokoSpriteUrl,
    iwaurokoFrameData,
  ),
  actions: {
    rockArmorCharge: IWAUROKO_ROCK_ARMOR_CHARGE_SPRITE,
  },
};

export const ENEMY_SPRITE_CONFIGS: Readonly<
  Partial<Record<EnemyKind, EnemySpriteConfig>>
> = {
  mossPlun: MOSS_PLUN_SPRITE,
  garacrow: GARACROW_SPRITE,
  lumibane: LUMIBANE_SPRITE,
  utsurobou: UTSUROBOU_SPRITE,
  iwaUroko: IWAUROKO_SPRITE,
};
