import kyleSpriteUrl from "../../assets/sprites/characters/kyle/kyle-idle-walk-48px-v1.png?url";
import kyleFrameData from "../../assets/sprites/characters/kyle/kyle-idle-walk-48px-v1.json";
import kyleNormalAttackUrl from "../../assets/sprites/characters/kyle/attacks/kyle-normal-renjinken-48px-v1.png?url";
import kyleNormalAttackFrameData from "../../assets/sprites/characters/kyle/attacks/kyle-normal-renjinken-48px-v1.json";
import kyleSpecialAttackUrl from "../../assets/sprites/characters/kyle/attacks/kyle-special-hajin-thrust-48px-v1.png?url";
import kyleSpecialAttackFrameData from "../../assets/sprites/characters/kyle/attacks/kyle-special-hajin-thrust-48px-v1.json";
import kyleUltimateAttackUrl from "../../assets/sprites/characters/kyle/attacks/kyle-ultimate-rekku-dan-48px-v1.png?url";
import kyleUltimateAttackFrameData from "../../assets/sprites/characters/kyle/attacks/kyle-ultimate-rekku-dan-48px-v1.json";
import kyleSwitchAttackUrl from "../../assets/sprites/characters/kyle/attacks/kyle-switch-senjin-giri-48px-v1.png?url";
import kyleSwitchAttackFrameData from "../../assets/sprites/characters/kyle/attacks/kyle-switch-senjin-giri-48px-v1.json";
import nadiSpriteUrl from "../../assets/sprites/characters/nadi/nadi-idle-walk-48px-v1.png?url";
import nadiFrameData from "../../assets/sprites/characters/nadi/nadi-idle-walk-48px-v1.json";
import nadiNormalAttackUrl from "../../assets/sprites/characters/nadi/attacks/nadi-normal-moonblade-throw-48px-v1.png?url";
import nadiNormalAttackFrameData from "../../assets/sprites/characters/nadi/attacks/nadi-normal-moonblade-throw-48px-v1.json";
import nadiSpecialAttackUrl from "../../assets/sprites/characters/nadi/attacks/nadi-special-engetsu-spin-48px-v1.png?url";
import nadiSpecialAttackFrameData from "../../assets/sprites/characters/nadi/attacks/nadi-special-engetsu-spin-48px-v1.json";
import nadiUltimateAttackUrl from "../../assets/sprites/characters/nadi/attacks/nadi-ultimate-geshoku-ranbu-48px-v1.png?url";
import nadiUltimateAttackFrameData from "../../assets/sprites/characters/nadi/attacks/nadi-ultimate-geshoku-ranbu-48px-v1.json";
import nadiSwitchAttackUrl from "../../assets/sprites/characters/nadi/attacks/nadi-switch-rinko-so-48px-v1.png?url";
import nadiSwitchAttackFrameData from "../../assets/sprites/characters/nadi/attacks/nadi-switch-rinko-so-48px-v1.json";
import meruSpriteUrl from "../../assets/sprites/characters/mel/mel-idle-walk-48px-v1.png?url";
import meruFrameData from "../../assets/sprites/characters/mel/mel-idle-walk-48px-v1.json";
import meruNormalAttackUrl from "../../assets/sprites/characters/mel/attacks/mel-normal-phosphor-bolt-48px-v1.png?url";
import meruNormalAttackFrameData from "../../assets/sprites/characters/mel/attacks/mel-normal-phosphor-bolt-48px-v1.json";
import meruSpecialAttackUrl from "../../assets/sprites/characters/mel/attacks/mel-special-healing-ring-48px-v1.png?url";
import meruSpecialAttackFrameData from "../../assets/sprites/characters/mel/attacks/mel-special-healing-ring-48px-v1.json";
import meruUltimateAttackUrl from "../../assets/sprites/characters/mel/attacks/mel-ultimate-tensei-horaku-48px-v1.png?url";
import meruUltimateAttackFrameData from "../../assets/sprites/characters/mel/attacks/mel-ultimate-tensei-horaku-48px-v1.json";
import meruSwitchAttackUrl from "../../assets/sprites/characters/mel/attacks/mel-switch-shunko-shoheki-48px-v1.png?url";
import meruSwitchAttackFrameData from "../../assets/sprites/characters/mel/attacks/mel-switch-shunko-shoheki-48px-v1.json";
import type { CharacterActionKind, CharacterId } from "../game/types";
import type { SpriteDirection } from "./spriteDirection";

export type CharacterSpriteDirection = SpriteDirection;

interface DirectionFrames {
  row: number;
  idle: number[];
  walk: number[];
}

interface ActionDirectionFrames {
  row: number;
  frames: number[];
}

interface CharacterFrameData {
  sheetWidth: number;
  sheetHeight: number;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  anchor: {
    x: number;
    y: number;
  };
  directions: Record<CharacterSpriteDirection, DirectionFrames>;
  timing: {
    idleFps: number;
    walkFps: number;
  };
}

interface CharacterActionFrameData {
  sheetWidth: number;
  sheetHeight: number;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  directions: Record<CharacterSpriteDirection, ActionDirectionFrames>;
  animation: {
    loop: boolean;
    durationSeconds: number;
    frameDurationsSeconds: number[];
  };
}

interface ShadowPresentation {
  radiusX: number;
  radiusY: number;
  offsetY: number;
}

export interface CharacterSpriteConfig {
  characterId: CharacterId;
  imageUrl: string;
  sheetWidth: number;
  sheetHeight: number;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  directions: Record<CharacterSpriteDirection, DirectionFrames>;
  drawScale: number;
  anchor: {
    x: number;
    y: number;
  };
  idleFps: number;
  walkFps: number;
  drawOffsetX: number;
  drawOffsetY: number;
  directionDrawOffsetY: Record<CharacterSpriteDirection, number>;
  shadow: ShadowPresentation;
  actions: Readonly<
    Partial<Record<CharacterActionKind, CharacterActionSpriteConfig>>
  >;
}

export interface CharacterActionSpriteConfig {
  kind: CharacterActionKind;
  imageUrl: string;
  sheetWidth: number;
  sheetHeight: number;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  directions: Record<CharacterSpriteDirection, ActionDirectionFrames>;
  loop: boolean;
  durationSeconds: number;
  frameDurationsSeconds: readonly number[];
}

interface PresentationTuning {
  drawScale: number;
  drawOffsetX: number;
  drawOffsetY: number;
  directionDrawOffsetY: Record<CharacterSpriteDirection, number>;
  shadow: ShadowPresentation;
}

function createCharacterSpriteConfig(
  characterId: CharacterId,
  imageUrl: string,
  rawMetadata: unknown,
  presentation: PresentationTuning,
  actions: CharacterSpriteConfig["actions"] = {},
): CharacterSpriteConfig {
  const metadata = rawMetadata as CharacterFrameData;
  return {
    characterId,
    imageUrl,
    sheetWidth: metadata.sheetWidth,
    sheetHeight: metadata.sheetHeight,
    frameWidth: metadata.frameWidth,
    frameHeight: metadata.frameHeight,
    columns: metadata.columns,
    rows: metadata.rows,
    directions: metadata.directions,
    drawScale: presentation.drawScale,
    anchor: {
      x: metadata.anchor.x,
      y: metadata.anchor.y,
    },
    idleFps: metadata.timing.idleFps,
    walkFps: metadata.timing.walkFps,
    drawOffsetX: presentation.drawOffsetX,
    drawOffsetY: presentation.drawOffsetY,
    directionDrawOffsetY: presentation.directionDrawOffsetY,
    shadow: presentation.shadow,
    actions,
  };
}

function createCharacterActionSpriteConfig(
  kind: CharacterActionKind,
  imageUrl: string,
  rawMetadata: unknown,
): CharacterActionSpriteConfig {
  const metadata = rawMetadata as CharacterActionFrameData;
  return {
    kind,
    imageUrl,
    sheetWidth: metadata.sheetWidth,
    sheetHeight: metadata.sheetHeight,
    frameWidth: metadata.frameWidth,
    frameHeight: metadata.frameHeight,
    columns: metadata.columns,
    rows: metadata.rows,
    directions: metadata.directions,
    loop: metadata.animation.loop,
    durationSeconds: metadata.animation.durationSeconds,
    frameDurationsSeconds: metadata.animation.frameDurationsSeconds,
  };
}

const STANDARD_SHADOW: ShadowPresentation = {
  radiusX: 9,
  radiusY: 2.5,
  offsetY: 0,
};

/**
 * Presentation-only tuning. These values never affect world coordinates,
 * movement, formation slots, attack reach, or collision shapes.
 */
export const KYLE_SPRITE = createCharacterSpriteConfig(
  "kyle",
  kyleSpriteUrl,
  kyleFrameData,
  {
    drawScale: 0.75,
    drawOffsetX: 0,
    drawOffsetY: 0,
    directionDrawOffsetY: {
      down: 0,
      up: 1.5,
      left: 4.5,
      right: 6,
    },
    shadow: STANDARD_SHADOW,
  },
  {
    normal: createCharacterActionSpriteConfig(
      "normal",
      kyleNormalAttackUrl,
      kyleNormalAttackFrameData,
    ),
    special: createCharacterActionSpriteConfig(
      "special",
      kyleSpecialAttackUrl,
      kyleSpecialAttackFrameData,
    ),
    ultimate: createCharacterActionSpriteConfig(
      "ultimate",
      kyleUltimateAttackUrl,
      kyleUltimateAttackFrameData,
    ),
    switch: createCharacterActionSpriteConfig(
      "switch",
      kyleSwitchAttackUrl,
      kyleSwitchAttackFrameData,
    ),
  },
);

export const NADI_SPRITE = createCharacterSpriteConfig(
  "nadi",
  nadiSpriteUrl,
  nadiFrameData,
  {
    drawScale: 0.75,
    drawOffsetX: 0,
    drawOffsetY: 0,
    // Align the boots, not the low-hanging moon-ring blade, to the ground line.
    directionDrawOffsetY: {
      down: 0,
      up: 3,
      left: 5.25,
      right: 9,
    },
    shadow: STANDARD_SHADOW,
  },
  {
    normal: createCharacterActionSpriteConfig(
      "normal",
      nadiNormalAttackUrl,
      nadiNormalAttackFrameData,
    ),
    special: createCharacterActionSpriteConfig(
      "special",
      nadiSpecialAttackUrl,
      nadiSpecialAttackFrameData,
    ),
    ultimate: createCharacterActionSpriteConfig(
      "ultimate",
      nadiUltimateAttackUrl,
      nadiUltimateAttackFrameData,
    ),
    switch: createCharacterActionSpriteConfig(
      "switch",
      nadiSwitchAttackUrl,
      nadiSwitchAttackFrameData,
    ),
  },
);

export const MERU_SPRITE = createCharacterSpriteConfig(
  "meru",
  meruSpriteUrl,
  meruFrameData,
  {
    drawScale: 0.75,
    drawOffsetX: 0,
    drawOffsetY: 0,
    // Align the boots while allowing the authored staff tip to hang naturally.
    directionDrawOffsetY: {
      down: 0,
      up: 0.75,
      left: 3.75,
      right: 6.75,
    },
    shadow: STANDARD_SHADOW,
  },
  {
    normal: createCharacterActionSpriteConfig(
      "normal",
      meruNormalAttackUrl,
      meruNormalAttackFrameData,
    ),
    special: createCharacterActionSpriteConfig(
      "special",
      meruSpecialAttackUrl,
      meruSpecialAttackFrameData,
    ),
    ultimate: createCharacterActionSpriteConfig(
      "ultimate",
      meruUltimateAttackUrl,
      meruUltimateAttackFrameData,
    ),
    switch: createCharacterActionSpriteConfig(
      "switch",
      meruSwitchAttackUrl,
      meruSwitchAttackFrameData,
    ),
  },
);

export const CHARACTER_SPRITE_CONFIGS: Readonly<
  Partial<Record<CharacterId, CharacterSpriteConfig>>
> = {
  kyle: KYLE_SPRITE,
  nadi: NADI_SPRITE,
  meru: MERU_SPRITE,
};
