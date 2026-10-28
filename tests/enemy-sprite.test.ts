import { afterEach, describe, expect, it, vi } from "vitest";
import { ENEMY_TUNING } from "../src/config";
import { createArenaEnemies, createEnemy } from "../src/game/entities";
import type { EnemyState } from "../src/game/types";
import {
  enemySpritePhaseOffset,
  EnemySpriteRenderer,
  resolveEnemySpriteClip,
  selectEnemyActionSpriteFrame,
  selectEnemySpriteFrame,
} from "../src/render/EnemySpriteRenderer";
import {
  ENEMY_SPRITE_CONFIGS,
  GARACROW_DIVE_STRIKE_SPRITE,
  GARACROW_SPRITE,
  IWAUROKO_ROCK_ARMOR_CHARGE_SPRITE,
  IWAUROKO_SPRITE,
  LUMIBANE_LUMINOUS_DASH_SPRITE,
  LUMIBANE_SPRITE,
  MOSS_PLUN_JUMP_SLAM_SPRITE,
  MOSS_PLUN_SPRITE,
  UTSUROBOU_MASK_CURSE_WAVE_SPRITE,
  UTSUROBOU_SPRITE,
} from "../src/render/enemySpriteConfig";
import {
  resolveGaracrowShadow,
  resolveIwaUrokoRenderMode,
  resolveLumibaneShadow,
  resolveMossPlunShadow,
  resolveUtsurobouShadow,
  resolveUtsurobouTelegraph,
  shouldDrawEnemyTelegraph,
} from "../src/render/Renderer";
import { resolveSpriteDirection } from "../src/render/spriteDirection";

function createMossPlun(id = 1): EnemyState {
  const source = createEnemy(id, "mossPlun", 425, 132);
  return {
    ...source,
    id,
    pos: { ...source.pos },
    velocity: { ...source.velocity },
    facing: { ...source.facing },
    idleAnchor: { ...source.idleAnchor },
    idleTarget: { ...source.idleTarget },
    reservedPos: { ...source.reservedPos },
    attackDirection: { ...source.attackDirection },
    telegraphTarget: { ...source.telegraphTarget },
    knockback: { ...source.knockback },
  };
}

function createGaracrow(id = 1): EnemyState {
  const source = createEnemy(id, "garacrow", 425, 132);
  return {
    ...source,
    pos: { ...source.pos },
    velocity: { ...source.velocity },
    facing: { ...source.facing },
    idleAnchor: { ...source.idleAnchor },
    idleTarget: { ...source.idleTarget },
    reservedPos: { ...source.reservedPos },
    attackDirection: { ...source.attackDirection },
    telegraphTarget: { ...source.telegraphTarget },
    knockback: { ...source.knockback },
  };
}

function createLumibane(id = 2): EnemyState {
  const source = createEnemy(id, "lumibane", 485, 244);
  return {
    ...source,
    id,
    pos: { ...source.pos },
    velocity: { ...source.velocity },
    facing: { ...source.facing },
    idleAnchor: { ...source.idleAnchor },
    idleTarget: { ...source.idleTarget },
    reservedPos: { ...source.reservedPos },
    attackDirection: { ...source.attackDirection },
    telegraphTarget: { ...source.telegraphTarget },
    knockback: { ...source.knockback },
  };
}

function createIwaUroko(id = 2): EnemyState {
  const source = createEnemy(id, "iwaUroko", 485, 244);
  return {
    ...source,
    pos: { ...source.pos },
    velocity: { ...source.velocity },
    facing: { ...source.facing },
    idleAnchor: { ...source.idleAnchor },
    idleTarget: { ...source.idleTarget },
    reservedPos: { ...source.reservedPos },
    attackDirection: { ...source.attackDirection },
    telegraphTarget: { ...source.telegraphTarget },
    knockback: { ...source.knockback },
  };
}

function createUtsurobou(id = 3): EnemyState {
  const source = createArenaEnemies().find(
    (enemy) => enemy.kind === "utsurobou",
  );
  if (!source) throw new Error("Expected an Utsurobou.");
  return {
    ...source,
    id,
    pos: { ...source.pos },
    velocity: { ...source.velocity },
    facing: { ...source.facing },
    idleAnchor: { ...source.idleAnchor },
    idleTarget: { ...source.idleTarget },
    reservedPos: { ...source.reservedPos },
    attackDirection: { ...source.attackDirection },
    telegraphTarget: { ...source.telegraphTarget },
    knockback: { ...source.knockback },
  };
}

describe("Moss Plun sprite animation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers the 288x192 Moss Plun sheet without affecting Iwa Uroko", () => {
    expect(MOSS_PLUN_SPRITE).toEqual(expect.objectContaining({
      enemyKind: "mossPlun",
      sheetWidth: 288,
      sheetHeight: 192,
      frameWidth: 48,
      frameHeight: 48,
      columns: 6,
      rows: 4,
      drawScale: 0.8,
      anchor: { x: 0.5, y: 0.92 },
    }));
    expect(MOSS_PLUN_SPRITE.clips.idle).toEqual({
      framesWithinDirection: [0, 1],
      frameDurationsSeconds: [0.42, 0.42],
      loop: true,
    });
    expect(MOSS_PLUN_SPRITE.clips.move).toEqual({
      framesWithinDirection: [2, 3, 4, 5],
      frameDurationsSeconds: [0.08, 0.18, 0.12, 0.16],
      loop: true,
    });
    expect(ENEMY_SPRITE_CONFIGS.mossPlun).toBe(MOSS_PLUN_SPRITE);
  });

  it("selects all four authored rows without mirroring", () => {
    expect(selectEnemySpriteFrame(
      MOSS_PLUN_SPRITE,
      "down",
      "idle",
      0,
    )).toBe(0);
    expect(selectEnemySpriteFrame(
      MOSS_PLUN_SPRITE,
      "up",
      "idle",
      0,
    )).toBe(6);
    expect(selectEnemySpriteFrame(
      MOSS_PLUN_SPRITE,
      "left",
      "idle",
      0,
    )).toBe(12);
    expect(selectEnemySpriteFrame(
      MOSS_PLUN_SPRITE,
      "right",
      "idle",
      0,
    )).toBe(18);
  });

  it("registers the shared jump-slam action with authored phase timing", () => {
    expect(MOSS_PLUN_SPRITE.actions.jumpSlam).toBe(
      MOSS_PLUN_JUMP_SLAM_SPRITE,
    );
    expect(MOSS_PLUN_JUMP_SLAM_SPRITE).toEqual(expect.objectContaining({
      action: "jumpSlam",
      sheetWidth: 288,
      sheetHeight: 192,
      frameWidth: 48,
      frameHeight: 48,
      columns: 6,
      rows: 4,
      drawScale: 0.8,
      anchor: { x: 0.5, y: 0.92 },
      hitEvent: {
        phase: "attack",
        frameWithinDirection: 4,
        timeSeconds: 0.18,
        maxHitsPerTarget: 1,
      },
    }));
    expect(MOSS_PLUN_JUMP_SLAM_SPRITE.phases).toEqual({
      windup: {
        framesWithinDirection: [0, 1],
        frameDurationsSeconds: [0.3, 0.42],
        loop: false,
      },
      attack: {
        framesWithinDirection: [2, 3, 4],
        frameDurationsSeconds: [0.08, 0.1, 0.18],
        loop: false,
      },
      recover: {
        framesWithinDirection: [4, 5],
        frameDurationsSeconds: [0.16, 0.56],
        loop: false,
      },
    });
  });

  it("selects the jump, apex, landing, and recovery frames from state age", () => {
    const action = MOSS_PLUN_JUMP_SLAM_SPRITE;
    expect(selectEnemyActionSpriteFrame(
      action,
      "down",
      "windup",
      0,
    )).toBe(0);
    expect(selectEnemyActionSpriteFrame(
      action,
      "up",
      "windup",
      0.301,
    )).toBe(7);
    expect(selectEnemyActionSpriteFrame(
      action,
      "left",
      "attack",
      0,
    )).toBe(14);
    expect(selectEnemyActionSpriteFrame(
      action,
      "left",
      "attack",
      0.081,
    )).toBe(15);
    expect(selectEnemyActionSpriteFrame(
      action,
      "right",
      "attack",
      0.181,
    )).toBe(22);
    expect(selectEnemyActionSpriteFrame(
      action,
      "right",
      "recover",
      0.161,
    )).toBe(23);
  });

  it("keeps the jump-slam direction captured at windup", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 288,
        naturalHeight: 192,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });
    const renderer = new EnemySpriteRenderer(MOSS_PLUN_SPRITE);
    fakeImages[0]?.onload?.();
    fakeImages[1]?.onload?.();
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      imageSmoothingEnabled: true,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;
    const enemy = createMossPlun();
    enemy.aiState = "windup";
    enemy.attackDirection = { x: 0, y: 1 };
    enemy.facing = { x: 1, y: 0 };
    enemy.stateAge = 0;

    expect(renderer.draw(context, enemy, 1, 1.1)).toBe(true);
    expect(renderer.getDebugState(enemy.id)).toEqual({
      status: "ready",
      direction: "down",
      clip: "windup",
      frame: 0,
      action: "jumpSlam",
      sheet: "action",
      actionStatus: "ready",
    });

    enemy.aiState = "attack";
    enemy.attackDirection = { x: -1, y: 0 };
    enemy.facing = { x: -1, y: 0 };
    enemy.stateAge = 0.09;
    expect(renderer.draw(context, enemy, 1.1, 1.2)).toBe(true);
    expect(renderer.getDebugState(enemy.id)).toEqual(expect.objectContaining({
      direction: "down",
      clip: "attack",
      frame: 3,
      action: "jumpSlam",
      sheet: "action",
    }));
    expect(context.scale).toHaveBeenLastCalledWith(1, 1);
    renderer.destroy();
  });

  it("uses the base Moss sprite when the action image fails", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 288,
        naturalHeight: 192,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });
    const renderer = new EnemySpriteRenderer(MOSS_PLUN_SPRITE);
    fakeImages[0]?.onload?.();
    fakeImages[1]?.onerror?.();
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      imageSmoothingEnabled: true,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;
    const enemy = createMossPlun();
    enemy.aiState = "windup";
    enemy.attackDirection = { x: 0, y: 1 };

    expect(renderer.draw(context, enemy, 0, 1.15)).toBe(true);
    expect(renderer.getActionStatus("jumpSlam")).toBe("failed");
    expect(renderer.getDebugState(enemy.id)).toEqual(expect.objectContaining({
      clip: "idle",
      action: "jumpSlam",
      sheet: "base",
      actionStatus: "failed",
    }));
    expect(context.scale).toHaveBeenLastCalledWith(1 / 1.15, 1.15);
    renderer.destroy();
  });

  it("keeps the Moss shadow grounded through all jump-slam phases", () => {
    const enemy = createMossPlun();
    enemy.aiState = "windup";
    enemy.stateAge = 0.4;
    expect(resolveMossPlunShadow(enemy)).toEqual({
      radiusX: 15,
      radiusY: 4,
      alpha: 0.48,
    });
    enemy.aiState = "attack";
    enemy.stateAge = 0.09;
    expect(resolveMossPlunShadow(enemy)).toEqual({
      radiusX: 8,
      radiusY: 2,
      alpha: 0.28,
    });
    enemy.stateAge = 0.18;
    expect(resolveMossPlunShadow(enemy)).toEqual({
      radiusX: 17,
      radiusY: 4,
      alpha: 0.5,
    });
    enemy.aiState = "recover";
    enemy.stateAge = 0.2;
    expect(resolveMossPlunShadow(enemy)).toEqual({
      radiusX: 13,
      radiusY: 4,
      alpha: 0.48,
    });
  });

  it("loops idle frames 0-1 using the authored 0.42 second timing", () => {
    expect(selectEnemySpriteFrame(
      MOSS_PLUN_SPRITE,
      "down",
      "idle",
      0.419,
    )).toBe(0);
    expect(selectEnemySpriteFrame(
      MOSS_PLUN_SPRITE,
      "down",
      "idle",
      0.421,
    )).toBe(1);
    expect(selectEnemySpriteFrame(
      MOSS_PLUN_SPRITE,
      "down",
      "idle",
      0.841,
    )).toBe(0);
  });

  it("loops move frames 2-5 using the authored hop timing", () => {
    expect(selectEnemySpriteFrame(
      MOSS_PLUN_SPRITE,
      "down",
      "move",
      0,
    )).toBe(2);
    expect(selectEnemySpriteFrame(
      MOSS_PLUN_SPRITE,
      "down",
      "move",
      0.081,
    )).toBe(3);
    expect(selectEnemySpriteFrame(
      MOSS_PLUN_SPRITE,
      "down",
      "move",
      0.261,
    )).toBe(4);
    expect(selectEnemySpriteFrame(
      MOSS_PLUN_SPRITE,
      "down",
      "move",
      0.381,
    )).toBe(5);
    expect(selectEnemySpriteFrame(
      MOSS_PLUN_SPRITE,
      "down",
      "move",
      0.541,
    )).toBe(2);
  });

  it("keeps the previous direction near zero and uses the dominant axis", () => {
    expect(resolveSpriteDirection({ x: 0, y: 0 }, "left")).toBe("left");
    expect(resolveSpriteDirection({ x: -0.8, y: 0.2 }, "down")).toBe("left");
    expect(resolveSpriteDirection({ x: 0.8, y: 0.2 }, "down")).toBe("right");
    expect(resolveSpriteDirection({ x: 0.2, y: -0.8 }, "down")).toBe("up");
    expect(resolveSpriteDirection({ x: 0.2, y: 0.8 }, "up")).toBe("down");
  });

  it("chooses clips from AI state and actual idle movement, not velocity", () => {
    const enemy = createMossPlun();
    enemy.velocity = { x: 999, y: 999 };
    enemy.aiState = "notice";
    expect(resolveEnemySpriteClip(enemy, enemy.pos)).toBe("idle");
    enemy.aiState = "windup";
    expect(resolveEnemySpriteClip(enemy, enemy.pos)).toBe("idle");
    enemy.aiState = "attack";
    expect(resolveEnemySpriteClip(enemy, enemy.pos)).toBe("idle");

    enemy.aiState = "approach";
    expect(resolveEnemySpriteClip(enemy, enemy.pos)).toBe("move");
    enemy.aiState = "reposition";
    expect(resolveEnemySpriteClip(enemy, enemy.pos)).toBe("move");
    enemy.aiState = "recover";
    expect(resolveEnemySpriteClip(enemy, enemy.pos)).toBe("move");

    enemy.aiState = "idle";
    enemy.idleTarget = { ...enemy.pos };
    expect(resolveEnemySpriteClip(enemy, enemy.pos)).toBe("idle");
    enemy.idleTarget.x += 8;
    expect(resolveEnemySpriteClip(enemy, enemy.pos)).toBe("move");
    enemy.idleTarget = { ...enemy.pos };
    expect(resolveEnemySpriteClip(enemy, {
      x: enemy.pos.x - 1,
      y: enemy.pos.y,
    })).toBe("move");

    enemy.aiState = "approach";
    enemy.knockback = { x: 3, y: 0 };
    expect(resolveEnemySpriteClip(enemy, enemy.pos)).toBe("idle");
  });

  it("offsets animation phase deterministically for different enemy ids", () => {
    const idleOne = enemySpritePhaseOffset(MOSS_PLUN_SPRITE, 1, "idle");
    const idleTwo = enemySpritePhaseOffset(MOSS_PLUN_SPRITE, 2, "idle");
    const moveOne = enemySpritePhaseOffset(MOSS_PLUN_SPRITE, 1, "move");
    const moveTwo = enemySpritePhaseOffset(MOSS_PLUN_SPRITE, 2, "move");

    expect(idleOne).not.toBe(idleTwo);
    expect(moveOne).not.toBe(moveTwo);
    expect(selectEnemySpriteFrame(
      MOSS_PLUN_SPRITE,
      "down",
      "idle",
      idleOne,
    )).not.toBe(selectEnemySpriteFrame(
      MOSS_PLUN_SPRITE,
      "down",
      "idle",
      idleTwo,
    ));
    expect(selectEnemySpriteFrame(
      MOSS_PLUN_SPRITE,
      "down",
      "move",
      moveOne,
    )).not.toBe(selectEnemySpriteFrame(
      MOSS_PLUN_SPRITE,
      "down",
      "move",
      moveTwo,
    ));
  });

  it("loads one shared image and draws each enemy with its own state", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 288,
        naturalHeight: 192,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });

    const renderer = new EnemySpriteRenderer(MOSS_PLUN_SPRITE);
    expect(fakeImages).toHaveLength(2);
    fakeImages[0]?.onload?.();
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      imageSmoothingEnabled: true,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;
    const enemyOne = createMossPlun(1);
    enemyOne.aiState = "notice";
    enemyOne.facing = { x: 1, y: 0 };
    const enemyTwo = createMossPlun(2);
    enemyTwo.aiState = "notice";
    enemyTwo.facing = { x: 1, y: 0 };

    expect(renderer.draw(context, enemyOne, 1, 1.15)).toBe(true);
    expect(renderer.draw(context, enemyTwo, 1)).toBe(true);
    expect(renderer.getDebugState(1)).toEqual({
      status: "ready",
      direction: "right",
      clip: "idle",
      frame: 18,
    });
    expect(renderer.getDebugState(2)).toEqual({
      status: "ready",
      direction: "right",
      clip: "idle",
      frame: 19,
    });
    expect(context.drawImage).toHaveBeenCalledTimes(2);
    expect(context.scale).toHaveBeenCalledWith(1 / 1.15, 1.15);

    enemyOne.hurtFlash = 0.1;
    expect(renderer.draw(context, enemyOne, 1.01)).toBe(true);
    expect(context.drawImage).toHaveBeenCalledTimes(4);
    expect(context.imageSmoothingEnabled).toBe(false);
    renderer.destroy();
  });

  it("returns control to the fallback when image validation fails", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 1,
        naturalHeight: 1,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });

    const renderer = new EnemySpriteRenderer(MOSS_PLUN_SPRITE);
    fakeImages[0]?.onerror?.();
    const context = {
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    expect(renderer.status).toBe("failed");
    expect(renderer.draw(context, createMossPlun(), 0)).toBe(false);
    expect(context.drawImage).not.toHaveBeenCalled();
    renderer.destroy();
  });

  it("preserves Moss Plun combat tuning", () => {
    expect(ENEMY_TUNING.mossPlun).toEqual({
      name: "モスプルン",
      hp: 58,
      armor: 0,
      archetype: "basicMelee",
      radius: 12,
      damage: 18,
      attackCooldown: 1.8,
      exp: 12,
    });
  });
});

describe("Garacrow sprite animation and arena registration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers the authored large-flight sheet through the shared config", () => {
    expect(GARACROW_SPRITE).toEqual(expect.objectContaining({
      enemyKind: "garacrow",
      sheetWidth: 288,
      sheetHeight: 192,
      frameWidth: 48,
      frameHeight: 48,
      columns: 6,
      rows: 4,
      drawScale: 0.92,
      anchor: { x: 0.5, y: 0.88 },
    }));
    expect(GARACROW_SPRITE.clips.idle).toEqual({
      framesWithinDirection: [0, 1, 2, 1],
      frameDurationsSeconds: [0.22, 0.18, 0.22, 0.18],
      loop: true,
    });
    expect(GARACROW_SPRITE.clips.move).toEqual({
      framesWithinDirection: [2, 3, 4, 5],
      frameDurationsSeconds: [0.1, 0.1, 0.1, 0.1],
      loop: true,
    });
    expect(ENEMY_SPRITE_CONFIGS.garacrow).toBe(GARACROW_SPRITE);
  });

  it("registers dive strike through the shared enemy action config", () => {
    expect(GARACROW_SPRITE.actions.diveStrike).toBe(
      GARACROW_DIVE_STRIKE_SPRITE,
    );
    expect(GARACROW_DIVE_STRIKE_SPRITE).toEqual(
      expect.objectContaining({
        action: "diveStrike",
        sheetWidth: 288,
        sheetHeight: 192,
        frameWidth: 48,
        frameHeight: 48,
        columns: 6,
        rows: 4,
        drawScale: 0.92,
        anchor: { x: 0.5, y: 0.88 },
        hitEvent: {
          phase: "attack",
          frameWithinDirection: 3,
          timeSeconds: 0.08,
          maxHitsPerTarget: 1,
        },
      }),
    );
    expect(GARACROW_DIVE_STRIKE_SPRITE.phases).toEqual({
      windup: {
        framesWithinDirection: [0, 1],
        frameDurationsSeconds: [0.34, 0.38],
        loop: false,
      },
      attack: {
        framesWithinDirection: [2, 3, 4],
        frameDurationsSeconds: [0.08, 0.1, 0.16],
        loop: false,
      },
      recover: {
        framesWithinDirection: [4, 5],
        frameDurationsSeconds: [0.18, 0.54],
        loop: false,
      },
    });
  });

  it("selects all dive-strike rows and authored phase boundaries", () => {
    const action = GARACROW_DIVE_STRIKE_SPRITE;
    expect(selectEnemyActionSpriteFrame(
      action,
      "down",
      "windup",
      0,
    )).toBe(0);
    expect(selectEnemyActionSpriteFrame(
      action,
      "up",
      "windup",
      0.341,
    )).toBe(7);
    expect(selectEnemyActionSpriteFrame(
      action,
      "left",
      "attack",
      0,
    )).toBe(14);
    expect(selectEnemyActionSpriteFrame(
      action,
      "left",
      "attack",
      0.081,
    )).toBe(15);
    expect(selectEnemyActionSpriteFrame(
      action,
      "right",
      "attack",
      0.181,
    )).toBe(22);
    expect(selectEnemyActionSpriteFrame(
      action,
      "right",
      "recover",
      0.181,
    )).toBe(23);
  });

  it("locks dive strike to the direction captured at windup", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 288,
        naturalHeight: 192,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });
    const renderer = new EnemySpriteRenderer(GARACROW_SPRITE);
    fakeImages[0]?.onload?.();
    fakeImages[1]?.onload?.();
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      imageSmoothingEnabled: true,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;
    const enemy = createGaracrow();
    enemy.aiState = "windup";
    enemy.attackDirection = { x: 0, y: -1 };
    enemy.facing = { x: 1, y: 0 };
    enemy.stateAge = 0;

    expect(renderer.draw(context, enemy, 1, 1.05)).toBe(true);
    expect(renderer.getDebugState(enemy.id)).toEqual({
      status: "ready",
      direction: "up",
      clip: "windup",
      frame: 6,
      action: "diveStrike",
      sheet: "action",
      actionStatus: "ready",
    });

    enemy.aiState = "attack";
    enemy.attackDirection = { x: -1, y: 0 };
    enemy.facing = { x: -1, y: 0 };
    enemy.stateAge = 0.081;
    expect(renderer.draw(context, enemy, 1.1, 1.1)).toBe(true);
    expect(renderer.getDebugState(enemy.id)).toEqual(expect.objectContaining({
      direction: "up",
      clip: "attack",
      frame: 9,
      action: "diveStrike",
      sheet: "action",
    }));
    renderer.destroy();
  });

  it("falls back to the base sheet without losing dive direction", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 288,
        naturalHeight: 192,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });
    const renderer = new EnemySpriteRenderer(GARACROW_SPRITE);
    fakeImages[0]?.onload?.();
    fakeImages[1]?.onerror?.();
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      imageSmoothingEnabled: true,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;
    const enemy = createGaracrow();
    enemy.aiState = "windup";
    enemy.attackDirection = { x: 1, y: 0 };
    enemy.facing = { x: 0, y: -1 };

    expect(renderer.draw(context, enemy, 0, 1.05)).toBe(true);
    expect(renderer.getActionStatus("diveStrike")).toBe("failed");
    expect(renderer.getDebugState(enemy.id)).toEqual(expect.objectContaining({
      direction: "right",
      action: "diveStrike",
      sheet: "base",
      actionStatus: "failed",
    }));
    renderer.destroy();
  });

  it("keeps Garacrow's flying shadow separate through the dive phases", () => {
    const enemy = createGaracrow();
    enemy.aiState = "windup";
    expect(resolveGaracrowShadow(enemy)).toEqual({
      radiusX: 12,
      radiusY: 3,
      alpha: 0.24,
      rotation: 0,
    });

    enemy.aiState = "attack";
    enemy.stateAge = 0.08;
    enemy.attackDirection = { x: 0, y: 1 };
    expect(resolveGaracrowShadow(enemy)).toEqual({
      radiusX: 14,
      radiusY: 2.6,
      alpha: 0.24,
      rotation: Math.PI / 2,
    });

    enemy.stateAge = 0.18;
    expect(resolveGaracrowShadow(enemy)).toEqual({
      radiusX: 16,
      radiusY: 3,
      alpha: 0.24,
      rotation: 0,
    });
  });

  it("selects all four authored rows without mirroring", () => {
    expect(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "down",
      "idle",
      0,
    )).toBe(0);
    expect(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "up",
      "idle",
      0,
    )).toBe(6);
    expect(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "left",
      "idle",
      0,
    )).toBe(12);
    expect(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "right",
      "idle",
      0,
    )).toBe(18);
  });

  it("loops the authored heavy idle flap and move flight timings", () => {
    expect(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "down",
      "idle",
      0.219,
    )).toBe(0);
    expect(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "down",
      "idle",
      0.221,
    )).toBe(1);
    expect(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "down",
      "idle",
      0.401,
    )).toBe(2);
    expect(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "down",
      "idle",
      0.621,
    )).toBe(1);
    expect(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "down",
      "idle",
      0.801,
    )).toBe(0);

    expect(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "down",
      "move",
      0,
    )).toBe(2);
    expect(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "down",
      "move",
      0.101,
    )).toBe(3);
    expect(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "down",
      "move",
      0.201,
    )).toBe(4);
    expect(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "down",
      "move",
      0.301,
    )).toBe(5);
    expect(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "down",
      "move",
      0.401,
    )).toBe(2);
  });

  it("keeps deterministic per-id phase offsets for future groups", () => {
    const idleOne = enemySpritePhaseOffset(
      GARACROW_SPRITE,
      1,
      "idle",
    );
    const idleTwo = enemySpritePhaseOffset(
      GARACROW_SPRITE,
      2,
      "idle",
    );
    const moveOne = enemySpritePhaseOffset(
      GARACROW_SPRITE,
      1,
      "move",
    );
    const moveTwo = enemySpritePhaseOffset(
      GARACROW_SPRITE,
      2,
      "move",
    );

    expect(idleOne).not.toBe(idleTwo);
    expect(moveOne).not.toBe(moveTwo);
    expect(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "down",
      "idle",
      idleOne,
    )).not.toBe(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "down",
      "idle",
      idleTwo,
    ));
    expect(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "down",
      "move",
      moveOne,
    )).not.toBe(selectEnemySpriteFrame(
      GARACROW_SPRITE,
      "down",
      "move",
      moveTwo,
    ));
  });

  it("uses the shared validated loader and keeps the authored back row", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 288,
        naturalHeight: 192,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });

    const renderer = new EnemySpriteRenderer(GARACROW_SPRITE);
    fakeImages[0]?.onload?.();
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      imageSmoothingEnabled: true,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;
    const enemy = createGaracrow();
    enemy.aiState = "notice";
    enemy.facing = { x: 0, y: -1 };

    expect(renderer.draw(context, enemy, 0)).toBe(true);
    expect(renderer.getDebugState(enemy.id)).toEqual({
      status: "ready",
      direction: "up",
      clip: "idle",
      frame: 7,
    });
    expect(context.drawImage).toHaveBeenCalledTimes(1);
    expect(context.imageSmoothingEnabled).toBe(false);
    renderer.destroy();
  });

  it("returns safely to the Garacrow fallback when loading fails", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 0,
        naturalHeight: 0,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });

    const renderer = new EnemySpriteRenderer(GARACROW_SPRITE);
    fakeImages[0]?.onerror?.();
    expect(renderer.status).toBe("failed");
    expect(renderer.draw(
      { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D,
      createGaracrow(),
      0,
    )).toBe(false);
    renderer.destroy();
  });

  it("keeps Garacrow registered while the arena uses Iwa Uroko", () => {
    const enemies = createArenaEnemies();
    expect(enemies).toHaveLength(3);
    expect(enemies.map((enemy) => ({
      id: enemy.id,
      kind: enemy.kind,
      pos: enemy.pos,
    }))).toEqual([
      { id: 1, kind: "mossPlun", pos: { x: 425, y: 132 } },
      { id: 2, kind: "iwaUroko", pos: { x: 485, y: 244 } },
      { id: 3, kind: "utsurobou", pos: { x: 505, y: 178 } },
    ]);
    expect(ENEMY_TUNING.garacrow).toEqual({
      name: "ガラクロウ",
      hp: 88,
      armor: 0,
      archetype: "basicMelee",
      radius: 15,
      damage: 22,
      attackCooldown: 2.1,
      exp: 20,
    });
  });
});

describe("Lumibane sprite animation and arena registration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers the authored 288x192 flight sheet", () => {
    expect(LUMIBANE_SPRITE).toEqual(expect.objectContaining({
      enemyKind: "lumibane",
      sheetWidth: 288,
      sheetHeight: 192,
      frameWidth: 48,
      frameHeight: 48,
      columns: 6,
      rows: 4,
      drawScale: 0.72,
      anchor: { x: 0.5, y: 0.86 },
    }));
    expect(LUMIBANE_SPRITE.clips.idle).toEqual({
      framesWithinDirection: [0, 1, 2, 1],
      frameDurationsSeconds: [0.15, 0.12, 0.15, 0.12],
      loop: true,
    });
    expect(LUMIBANE_SPRITE.clips.move).toEqual({
      framesWithinDirection: [2, 3, 4, 5],
      frameDurationsSeconds: [0.08, 0.08, 0.08, 0.08],
      loop: true,
    });
    expect(ENEMY_SPRITE_CONFIGS.lumibane).toBe(LUMIBANE_SPRITE);
  });

  it("registers luminous dash through the shared enemy action config", () => {
    expect(LUMIBANE_SPRITE.actions.luminousDash).toBe(
      LUMIBANE_LUMINOUS_DASH_SPRITE,
    );
    expect(LUMIBANE_LUMINOUS_DASH_SPRITE).toEqual(
      expect.objectContaining({
        action: "luminousDash",
        sheetWidth: 288,
        sheetHeight: 192,
        frameWidth: 48,
        frameHeight: 48,
        columns: 6,
        rows: 4,
        drawScale: 0.72,
        anchor: { x: 0.5, y: 0.86 },
        hitEvent: {
          phase: "attack",
          frameWithinDirection: 3,
          timeSeconds: 0.05,
          maxHitsPerTarget: 1,
        },
      }),
    );
    expect(LUMIBANE_LUMINOUS_DASH_SPRITE.phases).toEqual({
      windup: {
        framesWithinDirection: [0, 1],
        frameDurationsSeconds: [0.2, 0.25],
        loop: false,
      },
      attack: {
        framesWithinDirection: [2, 3, 4],
        frameDurationsSeconds: [0.05, 0.07, 0.12],
        loop: false,
      },
      recover: {
        framesWithinDirection: [4, 5],
        frameDurationsSeconds: [0.12, 0.3],
        loop: false,
      },
    });
  });

  it("selects all luminous-dash rows and authored phase boundaries", () => {
    const action = LUMIBANE_LUMINOUS_DASH_SPRITE;
    expect(selectEnemyActionSpriteFrame(
      action,
      "down",
      "windup",
      0,
    )).toBe(0);
    expect(selectEnemyActionSpriteFrame(
      action,
      "up",
      "windup",
      0.201,
    )).toBe(7);
    expect(selectEnemyActionSpriteFrame(
      action,
      "left",
      "attack",
      0,
    )).toBe(14);
    expect(selectEnemyActionSpriteFrame(
      action,
      "left",
      "attack",
      0.051,
    )).toBe(15);
    expect(selectEnemyActionSpriteFrame(
      action,
      "right",
      "attack",
      0.121,
    )).toBe(22);
    expect(selectEnemyActionSpriteFrame(
      action,
      "right",
      "recover",
      0.121,
    )).toBe(23);
  });

  it("locks luminous dash to the direction captured at windup", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 288,
        naturalHeight: 192,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });
    const renderer = new EnemySpriteRenderer(LUMIBANE_SPRITE);
    fakeImages[0]?.onload?.();
    fakeImages[1]?.onload?.();
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      imageSmoothingEnabled: true,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;
    const enemy = createLumibane();
    enemy.aiState = "windup";
    enemy.attackDirection = { x: 0, y: -1 };
    enemy.facing = { x: 1, y: 0 };
    enemy.stateAge = 0;

    expect(renderer.draw(context, enemy, 1, 1.05)).toBe(true);
    expect(renderer.getDebugState(enemy.id)).toEqual({
      status: "ready",
      direction: "up",
      clip: "windup",
      frame: 6,
      action: "luminousDash",
      sheet: "action",
      actionStatus: "ready",
    });

    enemy.aiState = "attack";
    enemy.attackDirection = { x: -1, y: 0 };
    enemy.facing = { x: -1, y: 0 };
    enemy.stateAge = 0.051;
    expect(renderer.draw(context, enemy, 1.1, 1.1)).toBe(true);
    expect(renderer.getDebugState(enemy.id)).toEqual(expect.objectContaining({
      direction: "up",
      clip: "attack",
      frame: 9,
      action: "luminousDash",
      sheet: "action",
    }));
    expect(context.scale).toHaveBeenLastCalledWith(1, 1);
    renderer.destroy();
  });

  it("falls back to the base sheet without losing dash direction", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 288,
        naturalHeight: 192,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });
    const renderer = new EnemySpriteRenderer(LUMIBANE_SPRITE);
    fakeImages[0]?.onload?.();
    fakeImages[1]?.onerror?.();
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      imageSmoothingEnabled: true,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;
    const enemy = createLumibane();
    enemy.aiState = "windup";
    enemy.attackDirection = { x: 1, y: 0 };
    enemy.facing = { x: 0, y: -1 };

    expect(renderer.draw(context, enemy, 0, 1.05)).toBe(true);
    expect(renderer.getActionStatus("luminousDash")).toBe("failed");
    expect(renderer.getDebugState(enemy.id)).toEqual(expect.objectContaining({
      direction: "right",
      action: "luminousDash",
      sheet: "base",
      actionStatus: "failed",
    }));
    expect(context.scale).toHaveBeenLastCalledWith(1 / 1.05, 1.05);
    renderer.destroy();
  });

  it("keeps a detached flying shadow through dash and braking", () => {
    const enemy = createLumibane();
    enemy.aiState = "windup";
    enemy.stateAge = 0.3;
    expect(resolveLumibaneShadow(enemy)).toEqual({
      radiusX: 8,
      radiusY: 2,
      alpha: 0.22,
      rotation: 0,
    });
    enemy.aiState = "attack";
    enemy.attackDirection = { x: 0, y: -1 };
    enemy.stateAge = 0.051;
    expect(resolveLumibaneShadow(enemy)).toEqual({
      radiusX: 10,
      radiusY: 1.6,
      alpha: 0.22,
      rotation: -Math.PI / 2,
    });
    enemy.stateAge = 0.121;
    expect(resolveLumibaneShadow(enemy)).toEqual({
      radiusX: 10,
      radiusY: 2,
      alpha: 0.22,
      rotation: 0,
    });
  });

  it("selects the four authored rows without mirroring", () => {
    expect(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "down",
      "idle",
      0,
    )).toBe(0);
    expect(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "up",
      "idle",
      0,
    )).toBe(6);
    expect(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "left",
      "idle",
      0,
    )).toBe(12);
    expect(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "right",
      "idle",
      0,
    )).toBe(18);
  });

  it("loops the authored idle wing cycle and faster move cycle", () => {
    expect(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "down",
      "idle",
      0.149,
    )).toBe(0);
    expect(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "down",
      "idle",
      0.151,
    )).toBe(1);
    expect(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "down",
      "idle",
      0.271,
    )).toBe(2);
    expect(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "down",
      "idle",
      0.421,
    )).toBe(1);
    expect(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "down",
      "idle",
      0.541,
    )).toBe(0);

    expect(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "down",
      "move",
      0,
    )).toBe(2);
    expect(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "down",
      "move",
      0.081,
    )).toBe(3);
    expect(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "down",
      "move",
      0.161,
    )).toBe(4);
    expect(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "down",
      "move",
      0.241,
    )).toBe(5);
    expect(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "down",
      "move",
      0.321,
    )).toBe(2);
  });

  it("offsets wing animation phases by enemy id", () => {
    const idleOne = enemySpritePhaseOffset(
      LUMIBANE_SPRITE,
      1,
      "idle",
    );
    const idleTwo = enemySpritePhaseOffset(
      LUMIBANE_SPRITE,
      2,
      "idle",
    );
    const moveOne = enemySpritePhaseOffset(
      LUMIBANE_SPRITE,
      1,
      "move",
    );
    const moveTwo = enemySpritePhaseOffset(
      LUMIBANE_SPRITE,
      2,
      "move",
    );

    expect(idleOne).not.toBe(idleTwo);
    expect(moveOne).not.toBe(moveTwo);
    expect(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "down",
      "idle",
      idleOne,
    )).not.toBe(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "down",
      "idle",
      idleTwo,
    ));
    expect(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "down",
      "move",
      moveOne,
    )).not.toBe(selectEnemySpriteFrame(
      LUMIBANE_SPRITE,
      "down",
      "move",
      moveTwo,
    ));
  });

  it("uses the shared validated image loader and authored back row", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 288,
        naturalHeight: 192,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });

    const renderer = new EnemySpriteRenderer(LUMIBANE_SPRITE);
    fakeImages[0]?.onload?.();
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      imageSmoothingEnabled: true,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;
    const enemy = createLumibane();
    enemy.aiState = "notice";
    enemy.facing = { x: 0, y: -1 };

    expect(renderer.draw(context, enemy, 0)).toBe(true);
    expect(renderer.getDebugState(enemy.id)).toEqual({
      status: "ready",
      direction: "up",
      clip: "idle",
      frame: 8,
    });
    expect(context.drawImage).toHaveBeenCalledTimes(1);
    expect(context.imageSmoothingEnabled).toBe(false);
    renderer.destroy();
  });

  it("returns to the Lumibane fallback when image loading fails", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 0,
        naturalHeight: 0,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });

    const renderer = new EnemySpriteRenderer(LUMIBANE_SPRITE);
    fakeImages[0]?.onerror?.();
    expect(renderer.status).toBe("failed");
    expect(renderer.draw(
      { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D,
      createLumibane(),
      0,
    )).toBe(false);
    renderer.destroy();
  });

  it("keeps Lumibane registered while the arena uses Iwa Uroko", () => {
    const enemies = createArenaEnemies();
    expect(enemies).toHaveLength(3);
    expect(enemies.map((enemy) => ({
      id: enemy.id,
      kind: enemy.kind,
      pos: enemy.pos,
    }))).toEqual([
      { id: 1, kind: "mossPlun", pos: { x: 425, y: 132 } },
      { id: 2, kind: "iwaUroko", pos: { x: 485, y: 244 } },
      { id: 3, kind: "utsurobou", pos: { x: 505, y: 178 } },
    ]);
    expect(ENEMY_TUNING.lumibane).toEqual({
      name: "ルミバネ",
      hp: 42,
      armor: 0,
      archetype: "swarm",
      radius: 10,
      damage: 12,
      attackCooldown: 1.5,
      exp: 10,
    });
  });
});

describe("Iwa Uroko armored sprite animation and arena registration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers the authored armored crawl sheet through the shared config", () => {
    expect(IWAUROKO_SPRITE).toEqual(expect.objectContaining({
      enemyKind: "iwaUroko",
      sheetWidth: 288,
      sheetHeight: 192,
      frameWidth: 48,
      frameHeight: 48,
      columns: 6,
      rows: 4,
      drawScale: 0.94,
      anchor: { x: 0.5, y: 0.82 },
    }));
    expect(IWAUROKO_SPRITE.clips.idle).toEqual({
      framesWithinDirection: [0, 1],
      frameDurationsSeconds: [0.48, 0.48],
      loop: true,
    });
    expect(IWAUROKO_SPRITE.clips.move).toEqual({
      framesWithinDirection: [2, 3, 4, 5],
      frameDurationsSeconds: [0.16, 0.16, 0.16, 0.16],
      loop: true,
    });
    expect(ENEMY_SPRITE_CONFIGS.iwaUroko).toBe(IWAUROKO_SPRITE);
    expect(IWAUROKO_SPRITE.actions.rockArmorCharge).toBe(
      IWAUROKO_ROCK_ARMOR_CHARGE_SPRITE,
    );
    expect(IWAUROKO_ROCK_ARMOR_CHARGE_SPRITE).toEqual(
      expect.objectContaining({
        action: "rockArmorCharge",
        sheetWidth: 288,
        sheetHeight: 192,
        frameWidth: 48,
        frameHeight: 48,
        columns: 6,
        rows: 4,
        drawScale: 0.94,
        anchor: { x: 0.5, y: 0.82 },
      }),
    );
    expect(IWAUROKO_ROCK_ARMOR_CHARGE_SPRITE.phases).toEqual({
      windup: {
        framesWithinDirection: [0, 1],
        frameDurationsSeconds: [0.09, 0.11],
        loop: false,
      },
      attack: {
        framesWithinDirection: [2, 3],
        frameDurationsSeconds: [0.25, 0.3],
        loop: false,
      },
      recover: {
        framesWithinDirection: [4, 5],
        frameDurationsSeconds: [0.25, 0.65],
        loop: false,
      },
    });
    expect(IWAUROKO_ROCK_ARMOR_CHARGE_SPRITE.hitEvent).toBeUndefined();
  });

  it("selects the rock armor charge phases on all four fixed rows", () => {
    const action = IWAUROKO_ROCK_ARMOR_CHARGE_SPRITE;
    expect(selectEnemyActionSpriteFrame(
      action,
      "down",
      "windup",
      0,
    )).toBe(0);
    expect(selectEnemyActionSpriteFrame(
      action,
      "up",
      "attack",
      0,
    )).toBe(8);
    expect(selectEnemyActionSpriteFrame(
      action,
      "left",
      "recover",
      0,
    )).toBe(16);
    expect(selectEnemyActionSpriteFrame(
      action,
      "right",
      "recover",
      0.301,
    )).toBe(23);
  });

  it("selects all four authored rows without mirroring", () => {
    expect(selectEnemySpriteFrame(
      IWAUROKO_SPRITE,
      "down",
      "idle",
      0,
    )).toBe(0);
    expect(selectEnemySpriteFrame(
      IWAUROKO_SPRITE,
      "up",
      "idle",
      0,
    )).toBe(6);
    expect(selectEnemySpriteFrame(
      IWAUROKO_SPRITE,
      "left",
      "idle",
      0,
    )).toBe(12);
    expect(selectEnemySpriteFrame(
      IWAUROKO_SPRITE,
      "right",
      "idle",
      0,
    )).toBe(18);
  });

  it("loops the slow idle weight shift and heavy crawl timings", () => {
    expect(selectEnemySpriteFrame(
      IWAUROKO_SPRITE,
      "down",
      "idle",
      0.479,
    )).toBe(0);
    expect(selectEnemySpriteFrame(
      IWAUROKO_SPRITE,
      "down",
      "idle",
      0.481,
    )).toBe(1);
    expect(selectEnemySpriteFrame(
      IWAUROKO_SPRITE,
      "down",
      "idle",
      0.961,
    )).toBe(0);

    expect(selectEnemySpriteFrame(
      IWAUROKO_SPRITE,
      "down",
      "move",
      0,
    )).toBe(2);
    expect(selectEnemySpriteFrame(
      IWAUROKO_SPRITE,
      "down",
      "move",
      0.161,
    )).toBe(3);
    expect(selectEnemySpriteFrame(
      IWAUROKO_SPRITE,
      "down",
      "move",
      0.321,
    )).toBe(4);
    expect(selectEnemySpriteFrame(
      IWAUROKO_SPRITE,
      "down",
      "move",
      0.481,
    )).toBe(5);
    expect(selectEnemySpriteFrame(
      IWAUROKO_SPRITE,
      "down",
      "move",
      0.641,
    )).toBe(2);
  });

  it("uses move during heavy charge and recover but idle during windup", () => {
    const enemy = createIwaUroko();
    const previousPos = { ...enemy.pos };

    enemy.aiState = "windup";
    expect(resolveEnemySpriteClip(enemy, previousPos)).toBe("idle");
    enemy.aiState = "attack";
    expect(resolveEnemySpriteClip(enemy, previousPos)).toBe("move");
    enemy.aiState = "recover";
    expect(resolveEnemySpriteClip(enemy, previousPos)).toBe("move");
    enemy.aiState = "attack";
    enemy.knockback = { x: 1, y: 0 };
    expect(resolveEnemySpriteClip(enemy, previousPos)).toBe("idle");
  });

  it("hides only the heavy-charge floor telegraph", () => {
    const iwa = createIwaUroko();
    iwa.telegraph = 0.1;
    iwa.aiState = "windup";
    expect(shouldDrawEnemyTelegraph(iwa)).toBe(false);

    const mossPlun = createMossPlun();
    mossPlun.telegraph = 0.1;
    mossPlun.aiState = "windup";
    expect(shouldDrawEnemyTelegraph(mossPlun)).toBe(true);

    mossPlun.alive = false;
    expect(shouldDrawEnemyTelegraph(mossPlun)).toBe(false);
  });

  it("uses the shared validated loader and authored back row", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 288,
        naturalHeight: 192,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });

    const renderer = new EnemySpriteRenderer(IWAUROKO_SPRITE);
    fakeImages[0]?.onload?.();
    fakeImages[1]?.onload?.();
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      imageSmoothingEnabled: true,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;
    const enemy = createIwaUroko();
    enemy.aiState = "windup";
    enemy.facing = { x: 1, y: 0 };
    enemy.attackDirection = { x: 0, y: -1 };

    expect(renderer.draw(context, enemy, 0)).toBe(true);
    expect(renderer.getDebugState(enemy.id)).toEqual({
      status: "ready",
      direction: "up",
      clip: "windup",
      frame: 6,
      action: "rockArmorCharge",
      sheet: "action",
      actionStatus: "ready",
    });
    expect(context.drawImage).toHaveBeenCalledTimes(1);
    expect(context.imageSmoothingEnabled).toBe(false);

    enemy.aiState = "attack";
    enemy.stateAge = 0.26;
    enemy.attackDirection = { x: 1, y: 0 };
    expect(renderer.draw(context, enemy, 0.26)).toBe(true);
    expect(renderer.getDebugState(enemy.id)).toEqual(expect.objectContaining({
      direction: "up",
      clip: "attack",
      frame: 9,
      action: "rockArmorCharge",
      sheet: "action",
    }));

    enemy.aiState = "recover";
    enemy.stateAge = 0;
    enemy.attackDirection = { x: 0, y: 1 };
    expect(renderer.draw(context, enemy, 0.22)).toBe(true);
    expect(renderer.getDebugState(enemy.id)).toEqual(expect.objectContaining({
      direction: "up",
      clip: "recover",
      frame: 10,
      action: "rockArmorCharge",
      sheet: "action",
    }));
    renderer.destroy();
  });

  it("falls back to the intact base sheet when the charge image fails", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 288,
        naturalHeight: 192,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });

    const renderer = new EnemySpriteRenderer(IWAUROKO_SPRITE);
    fakeImages[0]?.onload?.();
    fakeImages[1]?.onerror?.();
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      imageSmoothingEnabled: true,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;
    const enemy = createIwaUroko();
    enemy.aiState = "attack";
    enemy.attackDirection = { x: 1, y: 0 };
    enemy.facing = { x: 0, y: -1 };

    expect(renderer.draw(context, enemy, 0, 1.05)).toBe(true);
    expect(renderer.getActionStatus("rockArmorCharge")).toBe("failed");
    expect(renderer.getDebugState(enemy.id)).toEqual(expect.objectContaining({
      direction: "right",
      action: "rockArmorCharge",
      sheet: "base",
      actionStatus: "failed",
    }));
    renderer.destroy();
  });

  it("selects the formal sprite only for intact loaded armor", () => {
    expect(resolveIwaUrokoRenderMode(42, "ready")).toBe("sprite");
    expect(resolveIwaUrokoRenderMode(0, "ready")).toBe("sprite");
    expect(resolveIwaUrokoRenderMode(42, "loading")).toBe("fallback");
    expect(resolveIwaUrokoRenderMode(42, "failed")).toBe("fallback");
  });

  it("falls back safely when the armored image cannot load", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 0,
        naturalHeight: 0,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });

    const renderer = new EnemySpriteRenderer(IWAUROKO_SPRITE);
    fakeImages[0]?.onerror?.();
    expect(renderer.status).toBe("failed");
    expect(renderer.draw(
      { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D,
      createIwaUroko(),
      0,
    )).toBe(false);
    renderer.destroy();
  });

  it("uses Iwa Uroko in the arena while preserving the other registrations", () => {
    const enemies = createArenaEnemies();
    expect(enemies).toHaveLength(3);
    expect(enemies.map((enemy) => ({
      id: enemy.id,
      kind: enemy.kind,
      pos: enemy.pos,
    }))).toEqual([
      { id: 1, kind: "mossPlun", pos: { x: 425, y: 132 } },
      { id: 2, kind: "iwaUroko", pos: { x: 485, y: 244 } },
      { id: 3, kind: "utsurobou", pos: { x: 505, y: 178 } },
    ]);
    expect(ENEMY_TUNING.iwaUroko).toEqual({
      name: "イワウロコ",
      hp: 115,
      armor: 32,
      archetype: "heavyCharge",
      radius: 16,
      damage: 30,
      attackCooldown: 1.45,
      exp: 28,
    });
    expect(ENEMY_TUNING.mossPlun).toEqual({
      name: "モスプルン",
      hp: 58,
      armor: 0,
      archetype: "basicMelee",
      radius: 12,
      damage: 18,
      attackCooldown: 1.8,
      exp: 12,
    });
    expect(ENEMY_SPRITE_CONFIGS.garacrow).toBe(GARACROW_SPRITE);
    expect(ENEMY_SPRITE_CONFIGS.lumibane).toBe(LUMIBANE_SPRITE);
  });
});

describe("Utsurobou sprite animation and arena registration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers the shared 288x192 enemy sheet configuration", () => {
    expect(UTSUROBOU_SPRITE).toEqual(expect.objectContaining({
      enemyKind: "utsurobou",
      sheetWidth: 288,
      sheetHeight: 192,
      frameWidth: 48,
      frameHeight: 48,
      columns: 6,
      rows: 4,
      drawScale: 0.8,
      anchor: { x: 0.5, y: 0.92 },
    }));
    expect(UTSUROBOU_SPRITE.clips.idle).toEqual({
      framesWithinDirection: [0, 1],
      frameDurationsSeconds: [0.5, 0.5],
      loop: true,
    });
    expect(UTSUROBOU_SPRITE.clips.move).toEqual({
      framesWithinDirection: [2, 3, 4, 5],
      frameDurationsSeconds: [0.12, 0.18, 0.14, 0.18],
      loop: true,
    });
    expect(ENEMY_SPRITE_CONFIGS.utsurobou).toBe(UTSUROBOU_SPRITE);
  });

  it("registers Mask Curse Wave through the shared action config", () => {
    expect(UTSUROBOU_SPRITE.actions.maskCurseWave).toBe(
      UTSUROBOU_MASK_CURSE_WAVE_SPRITE,
    );
    expect(UTSUROBOU_MASK_CURSE_WAVE_SPRITE).toEqual(
      expect.objectContaining({
        action: "maskCurseWave",
        sheetWidth: 288,
        sheetHeight: 192,
        frameWidth: 48,
        frameHeight: 48,
        columns: 6,
        rows: 4,
        drawScale: 0.8,
        anchor: { x: 0.5, y: 0.92 },
        hitEvent: {
          phase: "attack",
          frameWithinDirection: 3,
          timeSeconds: 0.08,
          maxHitsPerTarget: 1,
        },
      }),
    );
    expect(UTSUROBOU_MASK_CURSE_WAVE_SPRITE.phases).toEqual({
      windup: {
        framesWithinDirection: [0, 1],
        frameDurationsSeconds: [0.32, 0.4],
        loop: false,
      },
      attack: {
        framesWithinDirection: [2, 3, 4],
        frameDurationsSeconds: [0.08, 0.1, 0.16],
        loop: false,
      },
      recover: {
        framesWithinDirection: [4, 5],
        frameDurationsSeconds: [0.18, 0.54],
        loop: false,
      },
    });
  });

  it("selects all curse-wave rows and authored phase boundaries", () => {
    const action = UTSUROBOU_MASK_CURSE_WAVE_SPRITE;
    expect(selectEnemyActionSpriteFrame(
      action,
      "down",
      "windup",
      0,
    )).toBe(0);
    expect(selectEnemyActionSpriteFrame(
      action,
      "up",
      "windup",
      0.321,
    )).toBe(7);
    expect(selectEnemyActionSpriteFrame(
      action,
      "left",
      "attack",
      0,
    )).toBe(14);
    expect(selectEnemyActionSpriteFrame(
      action,
      "left",
      "attack",
      0.081,
    )).toBe(15);
    expect(selectEnemyActionSpriteFrame(
      action,
      "right",
      "attack",
      0.181,
    )).toBe(22);
    expect(selectEnemyActionSpriteFrame(
      action,
      "right",
      "recover",
      0.181,
    )).toBe(23);
  });

  it("locks Mask Curse Wave to the direction captured at windup", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 288,
        naturalHeight: 192,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });
    const renderer = new EnemySpriteRenderer(UTSUROBOU_SPRITE);
    fakeImages[0]?.onload?.();
    fakeImages[1]?.onload?.();
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      imageSmoothingEnabled: true,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;
    const enemy = createUtsurobou();
    enemy.aiState = "windup";
    enemy.attackDirection = { x: 0, y: -1 };
    enemy.facing = { x: 1, y: 0 };
    enemy.stateAge = 0;

    expect(renderer.draw(context, enemy, 1, 1.05)).toBe(true);
    expect(renderer.getDebugState(enemy.id)).toEqual({
      status: "ready",
      direction: "up",
      clip: "windup",
      frame: 6,
      action: "maskCurseWave",
      sheet: "action",
      actionStatus: "ready",
    });

    enemy.aiState = "attack";
    enemy.attackDirection = { x: -1, y: 0 };
    enemy.facing = { x: -1, y: 0 };
    enemy.stateAge = 0.081;
    expect(renderer.draw(context, enemy, 1.1, 1.1)).toBe(true);
    expect(renderer.getDebugState(enemy.id)).toEqual(expect.objectContaining({
      direction: "up",
      clip: "attack",
      frame: 9,
      action: "maskCurseWave",
      sheet: "action",
    }));
    renderer.destroy();
  });

  it("falls back to the base sheet without losing the curse direction", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 288,
        naturalHeight: 192,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });
    const renderer = new EnemySpriteRenderer(UTSUROBOU_SPRITE);
    fakeImages[0]?.onload?.();
    fakeImages[1]?.onerror?.();
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      imageSmoothingEnabled: true,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;
    const enemy = createUtsurobou();
    enemy.aiState = "windup";
    enemy.attackDirection = { x: 1, y: 0 };
    enemy.facing = { x: 0, y: -1 };

    expect(renderer.draw(context, enemy, 0, 1.05)).toBe(true);
    expect(renderer.getActionStatus("maskCurseWave")).toBe("failed");
    expect(renderer.getDebugState(enemy.id)).toEqual(expect.objectContaining({
      direction: "right",
      action: "maskCurseWave",
      sheet: "base",
      actionStatus: "failed",
    }));
    renderer.destroy();
  });

  it("grows a steady curse telegraph and keeps a floating shadow", () => {
    const enemy = createUtsurobou();
    enemy.aiState = "windup";
    enemy.telegraphDuration = 0.72;
    enemy.telegraph = 0.72;
    expect(resolveUtsurobouTelegraph(enemy)).toEqual({
      radius: 30,
      alpha: 0.18,
      lineWidth: 1,
    });
    expect(resolveUtsurobouShadow(enemy)).toEqual({
      radiusX: 9,
      radiusY: 2.7,
      alpha: 0.24,
    });

    enemy.telegraph = 0.36;
    expect(resolveUtsurobouTelegraph(enemy)).toEqual({
      radius: 38,
      alpha: 0.3,
      lineWidth: 1.5,
    });

    enemy.telegraph = 0;
    expect(resolveUtsurobouTelegraph(enemy)).toEqual({
      radius: 46,
      alpha: 0.42,
      lineWidth: 2,
    });
    enemy.aiState = "attack";
    enemy.stateAge = 0.08;
    expect(resolveUtsurobouTelegraph(enemy)).toBeNull();
    expect(resolveUtsurobouShadow(enemy)).toEqual({
      radiusX: 10,
      radiusY: 3,
      alpha: 0.26,
    });
  });

  it("uses all four authored direction rows without mirroring or mask overlays", () => {
    expect(selectEnemySpriteFrame(
      UTSUROBOU_SPRITE,
      "down",
      "idle",
      0,
    )).toBe(0);
    expect(selectEnemySpriteFrame(
      UTSUROBOU_SPRITE,
      "up",
      "idle",
      0,
    )).toBe(6);
    expect(selectEnemySpriteFrame(
      UTSUROBOU_SPRITE,
      "left",
      "idle",
      0,
    )).toBe(12);
    expect(selectEnemySpriteFrame(
      UTSUROBOU_SPRITE,
      "right",
      "idle",
      0,
    )).toBe(18);
  });

  it("loops the authored idle and drift clips at their configured timing", () => {
    expect(selectEnemySpriteFrame(
      UTSUROBOU_SPRITE,
      "down",
      "idle",
      0.499,
    )).toBe(0);
    expect(selectEnemySpriteFrame(
      UTSUROBOU_SPRITE,
      "down",
      "idle",
      0.501,
    )).toBe(1);
    expect(selectEnemySpriteFrame(
      UTSUROBOU_SPRITE,
      "down",
      "idle",
      1.001,
    )).toBe(0);

    expect(selectEnemySpriteFrame(
      UTSUROBOU_SPRITE,
      "down",
      "move",
      0,
    )).toBe(2);
    expect(selectEnemySpriteFrame(
      UTSUROBOU_SPRITE,
      "down",
      "move",
      0.121,
    )).toBe(3);
    expect(selectEnemySpriteFrame(
      UTSUROBOU_SPRITE,
      "down",
      "move",
      0.301,
    )).toBe(4);
    expect(selectEnemySpriteFrame(
      UTSUROBOU_SPRITE,
      "down",
      "move",
      0.441,
    )).toBe(5);
    expect(selectEnemySpriteFrame(
      UTSUROBOU_SPRITE,
      "down",
      "move",
      0.621,
    )).toBe(2);
  });

  it("keeps deterministic per-id phase offsets for future groups", () => {
    expect(enemySpritePhaseOffset(
      UTSUROBOU_SPRITE,
      3,
      "idle",
    )).not.toBe(enemySpritePhaseOffset(
      UTSUROBOU_SPRITE,
      4,
      "idle",
    ));
    expect(enemySpritePhaseOffset(
      UTSUROBOU_SPRITE,
      3,
      "move",
    )).not.toBe(enemySpritePhaseOffset(
      UTSUROBOU_SPRITE,
      4,
      "move",
    ));
  });

  it("uses the shared loader and keeps the authored back row intact", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 288,
        naturalHeight: 192,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });

    const renderer = new EnemySpriteRenderer(UTSUROBOU_SPRITE);
    fakeImages[0]?.onload?.();
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      imageSmoothingEnabled: true,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;
    const enemy = createUtsurobou();
    enemy.aiState = "notice";
    enemy.facing = { x: 0, y: -1 };

    expect(renderer.draw(context, enemy, 0)).toBe(true);
    expect(renderer.getDebugState(enemy.id)).toEqual({
      status: "ready",
      direction: "up",
      clip: "idle",
      frame: 6,
    });
    expect(context.drawImage).toHaveBeenCalledTimes(1);
    expect(context.imageSmoothingEnabled).toBe(false);
    renderer.destroy();
  });

  it("falls back safely when the Utsurobou image cannot load", () => {
    const fakeImages: Array<{
      decoding: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        naturalWidth: 0,
        naturalHeight: 0,
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });

    const renderer = new EnemySpriteRenderer(UTSUROBOU_SPRITE);
    fakeImages[0]?.onerror?.();
    expect(renderer.status).toBe("failed");
    expect(renderer.draw(
      { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D,
      createUtsurobou(),
      0,
    )).toBe(false);
    renderer.destroy();
  });

  it("preserves the three-enemy arena and both existing enemy tunings", () => {
    const enemies = createArenaEnemies();
    expect(enemies.map((enemy) => ({
      id: enemy.id,
      kind: enemy.kind,
      pos: enemy.pos,
    }))).toEqual([
      { id: 1, kind: "mossPlun", pos: { x: 425, y: 132 } },
      { id: 2, kind: "iwaUroko", pos: { x: 485, y: 244 } },
      { id: 3, kind: "utsurobou", pos: { x: 505, y: 178 } },
    ]);
    expect(ENEMY_TUNING.utsurobou).toEqual({
      name: "ウツロボウ",
      hp: 70,
      armor: 0,
      archetype: "basicMelee",
      radius: 13,
      damage: 16,
      attackCooldown: 2.2,
      exp: 18,
    });
    expect(ENEMY_TUNING.iwaUroko).toEqual({
      name: "イワウロコ",
      hp: 115,
      armor: 32,
      archetype: "heavyCharge",
      radius: 16,
      damage: 30,
      attackCooldown: 1.45,
      exp: 28,
    });
  });
});
