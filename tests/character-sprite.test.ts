import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CharacterSpriteRenderer,
  resolveCharacterSpriteDirection,
  selectCharacterActionSpriteFrame,
  selectCharacterSpriteFrame,
} from "../src/render/CharacterSpriteRenderer";
import { CHARACTER_GROUNDING } from "../src/render/characterGroundingConfig";
import {
  CHARACTER_SPRITE_CONFIGS,
  KYLE_SPRITE,
  MERU_SPRITE,
  NADI_SPRITE,
} from "../src/render/characterSpriteConfig";

describe("shared character sprite animation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("omits only the detached bottom two rows of Nadi's left-facing base frames", () => {
    const images: Array<{ onload: (() => void) | null }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = { decoding: "", naturalWidth: 288, naturalHeight: 192, onload: null, onerror: null, src: "" };
      images.push(image);
      return image;
    });
    const renderer = new CharacterSpriteRenderer(NADI_SPRITE);
    images[0]?.onload?.();
    const member = {
      id: "nadi", downed: false, actionTimer: 0, actionDuration: 0,
      actionKind: null, actionSequenceId: 0, actionFacing: { x: -1, y: 0 },
      facing: { x: -1, y: 0 }, moveIntent: { x: -1, y: 0 }, hurtFlash: 0,
    } as Parameters<CharacterSpriteRenderer["draw"]>[1];
    const drawImage = vi.fn();
    const context = { drawImage, save: vi.fn(), restore: vi.fn(), globalAlpha: 1 } as unknown as CanvasRenderingContext2D;
    renderer.draw(context, member, 0, "playing");
    expect(renderer.debugState.frame).toBe(14);
    expect(drawImage.mock.lastCall?.[4]).toBe(46);
    member.moveIntent = { x: 0, y: 0 };
    renderer.draw(context, member, 0.05, "playing");
    expect(renderer.debugState.frame).toBe(12);
    expect(drawImage.mock.lastCall?.[4]).toBe(46);
    expect(drawImage.mock.lastCall?.[8]).toBe(34.5);
    member.facing = { x: 1, y: 0 };
    member.moveIntent = { x: 1, y: 0 };
    renderer.draw(context, member, 0.1, "playing");
    expect(drawImage.mock.lastCall?.[4]).toBe(48);
    renderer.destroy();
  });

  it.each([KYLE_SPRITE, NADI_SPRITE, MERU_SPRITE])(
    "selects all authored rows for $characterId without mirroring",
    (config) => {
      expect(selectCharacterSpriteFrame(config, "down", "idle", 0)).toBe(0);
      expect(selectCharacterSpriteFrame(config, "up", "idle", 0)).toBe(6);
      expect(selectCharacterSpriteFrame(config, "left", "idle", 0)).toBe(12);
      expect(selectCharacterSpriteFrame(config, "right", "idle", 0)).toBe(18);
    },
  );

  it("plays Kyle's six-frame normal attack once using authored timings", () => {
    const attack = KYLE_SPRITE.actions.normal;
    if (!attack) throw new Error("Expected Kyle's normal attack sprite.");

    expect(attack.loop).toBe(false);
    expect(attack.frameDurationsSeconds.reduce(
      (sum, duration) => sum + duration,
      0,
    )).toBeCloseTo(0.18);
    expect(selectCharacterActionSpriteFrame(attack, "down", 0)).toBe(0);
    expect(selectCharacterActionSpriteFrame(attack, "down", 0.025)).toBe(1);
    expect(selectCharacterActionSpriteFrame(attack, "down", 0.055)).toBe(2);
    expect(selectCharacterActionSpriteFrame(attack, "up", 0.09)).toBe(9);
    expect(selectCharacterActionSpriteFrame(attack, "left", 0.125)).toBe(16);
    expect(selectCharacterActionSpriteFrame(attack, "right", 0.15)).toBe(23);
    expect(selectCharacterActionSpriteFrame(attack, "right", 10)).toBe(23);
  });

  it("plays Kyle's six-frame special attack once using authored timings", () => {
    const attack = KYLE_SPRITE.actions.special;
    if (!attack) throw new Error("Expected Kyle's special attack sprite.");

    expect(attack).toEqual(expect.objectContaining({
      kind: "special",
      sheetWidth: 288,
      sheetHeight: 192,
      frameWidth: 48,
      frameHeight: 48,
      columns: 6,
      rows: 4,
      loop: false,
      durationSeconds: 0.28,
    }));
    expect(attack.frameDurationsSeconds).toEqual([
      0.04,
      0.045,
      0.05,
      0.06,
      0.045,
      0.04,
    ]);
    expect(attack.frameDurationsSeconds.reduce(
      (sum, duration) => sum + duration,
      0,
    )).toBeCloseTo(0.28);
    expect(selectCharacterActionSpriteFrame(attack, "down", 0)).toBe(0);
    expect(selectCharacterActionSpriteFrame(attack, "down", 0.041)).toBe(1);
    expect(selectCharacterActionSpriteFrame(attack, "down", 0.086)).toBe(2);
    expect(selectCharacterActionSpriteFrame(attack, "up", 0.14)).toBe(9);
    expect(selectCharacterActionSpriteFrame(attack, "left", 0.2)).toBe(16);
    expect(selectCharacterActionSpriteFrame(attack, "right", 0.241)).toBe(23);
    expect(selectCharacterActionSpriteFrame(attack, "right", 10)).toBe(23);
  });

  it("plays Kyle's six-frame ultimate once using authored timings", () => {
    const action = KYLE_SPRITE.actions.ultimate;
    if (!action) throw new Error("Expected Kyle's ultimate action sprite.");

    expect(action).toEqual(expect.objectContaining({
      kind: "ultimate",
      sheetWidth: 288,
      sheetHeight: 192,
      frameWidth: 48,
      frameHeight: 48,
      columns: 6,
      rows: 4,
      loop: false,
      durationSeconds: 0.5,
    }));
    expect(action.frameDurationsSeconds).toEqual([
      0.06,
      0.08,
      0.11,
      0.09,
      0.09,
      0.07,
    ]);
    expect(action.frameDurationsSeconds.reduce(
      (sum, duration) => sum + duration,
      0,
    )).toBeCloseTo(0.5);
    expect(selectCharacterActionSpriteFrame(action, "down", 0)).toBe(0);
    expect(selectCharacterActionSpriteFrame(action, "down", 0.061)).toBe(1);
    expect(selectCharacterActionSpriteFrame(action, "down", 0.141)).toBe(2);
    expect(selectCharacterActionSpriteFrame(action, "up", 0.251)).toBe(9);
    expect(selectCharacterActionSpriteFrame(action, "left", 0.341)).toBe(16);
    expect(selectCharacterActionSpriteFrame(action, "right", 0.431)).toBe(23);
    expect(selectCharacterActionSpriteFrame(action, "right", 10)).toBe(23);

    expect([
      selectCharacterActionSpriteFrame(action, "down", 0.26),
      selectCharacterActionSpriteFrame(action, "up", 0.26),
      selectCharacterActionSpriteFrame(action, "left", 0.26),
      selectCharacterActionSpriteFrame(action, "right", 0.26),
    ]).toEqual([3, 9, 15, 21]);
  });

  it("plays Kyle's six-frame switch attack once using authored timings", () => {
    const action = KYLE_SPRITE.actions.switch;
    if (!action) throw new Error("Expected Kyle's switch action sprite.");

    expect(action).toEqual(expect.objectContaining({
      kind: "switch",
      sheetWidth: 288,
      sheetHeight: 192,
      frameWidth: 48,
      frameHeight: 48,
      columns: 6,
      rows: 4,
      loop: false,
      durationSeconds: 0.35,
    }));
    expect(action.frameDurationsSeconds).toEqual([
      0.045,
      0.05,
      0.06,
      0.075,
      0.065,
      0.055,
    ]);
    expect(action.frameDurationsSeconds.reduce(
      (sum, duration) => sum + duration,
      0,
    )).toBeCloseTo(0.35);
    expect(selectCharacterActionSpriteFrame(action, "down", 0)).toBe(0);
    expect(selectCharacterActionSpriteFrame(action, "down", 0.046)).toBe(1);
    expect(selectCharacterActionSpriteFrame(action, "up", 0.096)).toBe(8);
    expect(selectCharacterActionSpriteFrame(action, "left", 0.156)).toBe(15);
    expect(selectCharacterActionSpriteFrame(action, "right", 0.231)).toBe(22);
    expect(selectCharacterActionSpriteFrame(action, "right", 0.296)).toBe(23);
    expect(selectCharacterActionSpriteFrame(action, "right", 10)).toBe(23);

    expect([
      selectCharacterActionSpriteFrame(action, "down", 0.156),
      selectCharacterActionSpriteFrame(action, "up", 0.156),
      selectCharacterActionSpriteFrame(action, "left", 0.156),
      selectCharacterActionSpriteFrame(action, "right", 0.156),
    ]).toEqual([3, 9, 15, 21]);
  });

  it("plays Nadi's six-frame normal attack once using authored timings", () => {
    const attack = NADI_SPRITE.actions.normal;
    if (!attack) throw new Error("Expected Nadi's normal attack sprite.");

    expect(attack.loop).toBe(false);
    expect(attack.frameDurationsSeconds).toEqual([
      0.015,
      0.02,
      0.035,
      0.04,
      0.035,
      0.035,
    ]);
    expect(attack.frameDurationsSeconds.reduce(
      (sum, duration) => sum + duration,
      0,
    )).toBeCloseTo(0.18);
    expect(selectCharacterActionSpriteFrame(attack, "down", 0)).toBe(0);
    expect(selectCharacterActionSpriteFrame(attack, "down", 0.016)).toBe(1);
    expect(selectCharacterActionSpriteFrame(attack, "down", 0.036)).toBe(2);
    expect(selectCharacterActionSpriteFrame(attack, "up", 0.071)).toBe(9);
    expect(selectCharacterActionSpriteFrame(attack, "left", 0.111)).toBe(16);
    expect(selectCharacterActionSpriteFrame(attack, "right", 0.146)).toBe(23);
    expect(selectCharacterActionSpriteFrame(attack, "right", 10)).toBe(23);
  });

  it("plays Nadi's six-frame special from its fixed starting row", () => {
    const attack = NADI_SPRITE.actions.special;
    if (!attack) throw new Error("Expected Nadi's special attack sprite.");

    expect(attack).toEqual(expect.objectContaining({
      kind: "special",
      sheetWidth: 288,
      sheetHeight: 192,
      frameWidth: 48,
      frameHeight: 48,
      columns: 6,
      rows: 4,
      loop: false,
      durationSeconds: 0.34,
    }));
    expect(attack.frameDurationsSeconds).toEqual([
      0.05,
      0.05,
      0.06,
      0.07,
      0.06,
      0.05,
    ]);
    expect(attack.frameDurationsSeconds.reduce(
      (sum, duration) => sum + duration,
      0,
    )).toBeCloseTo(0.34);
    expect(selectCharacterActionSpriteFrame(attack, "down", 0)).toBe(0);
    expect(selectCharacterActionSpriteFrame(attack, "down", 0.051)).toBe(1);
    expect(selectCharacterActionSpriteFrame(attack, "down", 0.101)).toBe(2);
    expect(selectCharacterActionSpriteFrame(attack, "up", 0.161)).toBe(9);
    expect(selectCharacterActionSpriteFrame(attack, "left", 0.231)).toBe(16);
    expect(selectCharacterActionSpriteFrame(attack, "right", 0.291)).toBe(23);
    expect(selectCharacterActionSpriteFrame(attack, "right", 10)).toBe(23);

    expect([
      selectCharacterActionSpriteFrame(attack, "down", 0.17),
      selectCharacterActionSpriteFrame(attack, "up", 0.17),
      selectCharacterActionSpriteFrame(attack, "left", 0.17),
      selectCharacterActionSpriteFrame(attack, "right", 0.17),
    ]).toEqual([3, 9, 15, 21]);
  });

  it("plays Nadi's six-frame ultimate once in sync with Moon Eclipse Dance", () => {
    const action = NADI_SPRITE.actions.ultimate;
    if (!action) throw new Error("Expected Nadi's ultimate action sprite.");

    expect(action).toEqual(expect.objectContaining({
      kind: "ultimate",
      sheetWidth: 288,
      sheetHeight: 192,
      frameWidth: 48,
      frameHeight: 48,
      columns: 6,
      rows: 4,
      loop: false,
      durationSeconds: 1.04,
    }));
    expect(action.frameDurationsSeconds).toEqual([
      0.06,
      0.18,
      0.19,
      0.26,
      0.21,
      0.14,
    ]);
    expect(action.frameDurationsSeconds.reduce(
      (sum, duration) => sum + duration,
      0,
    )).toBeCloseTo(1.04);
    expect(selectCharacterActionSpriteFrame(action, "down", 0)).toBe(0);
    expect(selectCharacterActionSpriteFrame(action, "down", 0.061)).toBe(1);
    expect(selectCharacterActionSpriteFrame(action, "up", 0.241)).toBe(8);
    expect(selectCharacterActionSpriteFrame(action, "left", 0.431)).toBe(15);
    expect(selectCharacterActionSpriteFrame(action, "right", 0.691)).toBe(22);
    expect(selectCharacterActionSpriteFrame(action, "right", 0.901)).toBe(23);
    expect(selectCharacterActionSpriteFrame(action, "right", 10)).toBe(23);

    expect([0.061, 0.241, 0.431, 0.691].map((elapsed) =>
      selectCharacterActionSpriteFrame(action, "down", elapsed)
    )).toEqual([1, 2, 3, 4]);
    expect([0.061, 0.241, 0.431, 0.691].map((elapsed) =>
      selectCharacterActionSpriteFrame(action, "up", elapsed)
    )).toEqual([7, 8, 9, 10]);
    expect([0.061, 0.241, 0.431, 0.691].map((elapsed) =>
      selectCharacterActionSpriteFrame(action, "left", elapsed)
    )).toEqual([13, 14, 15, 16]);
    expect([0.061, 0.241, 0.431, 0.691].map((elapsed) =>
      selectCharacterActionSpriteFrame(action, "right", elapsed)
    )).toEqual([19, 20, 21, 22]);
  });

  it("plays Nadi's six-frame switch attack once using authored timings", () => {
    const action = NADI_SPRITE.actions.switch;
    if (!action) throw new Error("Expected Nadi's switch action sprite.");

    expect(action).toEqual(expect.objectContaining({
      kind: "switch",
      sheetWidth: 288,
      sheetHeight: 192,
      frameWidth: 48,
      frameHeight: 48,
      columns: 6,
      rows: 4,
      loop: false,
      durationSeconds: 0.35,
    }));
    expect(action.frameDurationsSeconds).toEqual([
      0.045,
      0.05,
      0.06,
      0.075,
      0.065,
      0.055,
    ]);
    expect(action.frameDurationsSeconds.reduce(
      (sum, duration) => sum + duration,
      0,
    )).toBeCloseTo(0.35);
    expect(selectCharacterActionSpriteFrame(action, "down", 0)).toBe(0);
    expect(selectCharacterActionSpriteFrame(action, "down", 0.046)).toBe(1);
    expect(selectCharacterActionSpriteFrame(action, "up", 0.096)).toBe(8);
    expect(selectCharacterActionSpriteFrame(action, "left", 0.156)).toBe(15);
    expect(selectCharacterActionSpriteFrame(action, "right", 0.231)).toBe(22);
    expect(selectCharacterActionSpriteFrame(action, "right", 0.296)).toBe(23);
    expect(selectCharacterActionSpriteFrame(action, "right", 10)).toBe(23);

    expect([
      selectCharacterActionSpriteFrame(action, "down", 0.156),
      selectCharacterActionSpriteFrame(action, "up", 0.156),
      selectCharacterActionSpriteFrame(action, "left", 0.156),
      selectCharacterActionSpriteFrame(action, "right", 0.156),
    ]).toEqual([3, 9, 15, 21]);
  });

  it("plays Meru's six-frame normal attack once using authored timings", () => {
    const attack = MERU_SPRITE.actions.normal;
    if (!attack) throw new Error("Expected Meru's normal attack sprite.");

    expect(attack.loop).toBe(false);
    expect(attack.frameDurationsSeconds).toEqual([
      0.015,
      0.02,
      0.035,
      0.04,
      0.035,
      0.035,
    ]);
    expect(attack.frameDurationsSeconds.reduce(
      (sum, duration) => sum + duration,
      0,
    )).toBeCloseTo(0.18);
    expect(selectCharacterActionSpriteFrame(attack, "down", 0)).toBe(0);
    expect(selectCharacterActionSpriteFrame(attack, "down", 0.016)).toBe(1);
    expect(selectCharacterActionSpriteFrame(attack, "down", 0.036)).toBe(2);
    expect(selectCharacterActionSpriteFrame(attack, "up", 0.071)).toBe(9);
    expect(selectCharacterActionSpriteFrame(attack, "left", 0.111)).toBe(16);
    expect(selectCharacterActionSpriteFrame(attack, "right", 0.146)).toBe(23);
    expect(selectCharacterActionSpriteFrame(attack, "right", 10)).toBe(23);
  });

  it("plays Meru's six-frame healing cast once using authored timings", () => {
    const action = MERU_SPRITE.actions.special;
    if (!action) throw new Error("Expected Meru's special action sprite.");

    expect(action).toEqual(expect.objectContaining({
      kind: "special",
      sheetWidth: 288,
      sheetHeight: 192,
      frameWidth: 48,
      frameHeight: 48,
      columns: 6,
      rows: 4,
      loop: false,
      durationSeconds: 0.38,
    }));
    expect(action.frameDurationsSeconds).toEqual([
      0.05,
      0.055,
      0.07,
      0.08,
      0.065,
      0.06,
    ]);
    expect(action.frameDurationsSeconds.reduce(
      (sum, duration) => sum + duration,
      0,
    )).toBeCloseTo(0.38);
    expect(selectCharacterActionSpriteFrame(action, "down", 0)).toBe(0);
    expect(selectCharacterActionSpriteFrame(action, "down", 0.051)).toBe(1);
    expect(selectCharacterActionSpriteFrame(action, "down", 0.106)).toBe(2);
    expect(selectCharacterActionSpriteFrame(action, "up", 0.176)).toBe(9);
    expect(selectCharacterActionSpriteFrame(action, "left", 0.256)).toBe(16);
    expect(selectCharacterActionSpriteFrame(action, "right", 0.321)).toBe(23);
    expect(selectCharacterActionSpriteFrame(action, "right", 10)).toBe(23);

    expect([
      selectCharacterActionSpriteFrame(action, "down", 0.18),
      selectCharacterActionSpriteFrame(action, "up", 0.18),
      selectCharacterActionSpriteFrame(action, "left", 0.18),
      selectCharacterActionSpriteFrame(action, "right", 0.18),
    ]).toEqual([3, 9, 15, 21]);
  });

  it("plays Meru's six-frame ultimate once in sync with Crystal Fall", () => {
    const action = MERU_SPRITE.actions.ultimate;
    if (!action) throw new Error("Expected Meru's ultimate action sprite.");

    expect(action).toEqual(expect.objectContaining({
      kind: "ultimate",
      sheetWidth: 288,
      sheetHeight: 192,
      frameWidth: 48,
      frameHeight: 48,
      columns: 6,
      rows: 4,
      loop: false,
      durationSeconds: 1.12,
    }));
    expect(action.frameDurationsSeconds).toEqual([
      0.08,
      0.18,
      0.26,
      0.24,
      0.22,
      0.14,
    ]);
    expect(action.frameDurationsSeconds.reduce(
      (sum, duration) => sum + duration,
      0,
    )).toBeCloseTo(1.12);
    expect(selectCharacterActionSpriteFrame(action, "down", 0)).toBe(0);
    expect(selectCharacterActionSpriteFrame(action, "down", 0.081)).toBe(1);
    expect(selectCharacterActionSpriteFrame(action, "up", 0.261)).toBe(8);
    expect(selectCharacterActionSpriteFrame(action, "left", 0.521)).toBe(15);
    expect(selectCharacterActionSpriteFrame(action, "right", 0.761)).toBe(22);
    expect(selectCharacterActionSpriteFrame(action, "right", 0.981)).toBe(23);
    expect(selectCharacterActionSpriteFrame(action, "right", 10)).toBe(23);

    expect([
      selectCharacterActionSpriteFrame(action, "down", 0.521),
      selectCharacterActionSpriteFrame(action, "up", 0.521),
      selectCharacterActionSpriteFrame(action, "left", 0.521),
      selectCharacterActionSpriteFrame(action, "right", 0.521),
    ]).toEqual([3, 9, 15, 21]);
  });

  it("plays Meru's six-frame switch skill once using authored timings", () => {
    const action = MERU_SPRITE.actions.switch;
    if (!action) throw new Error("Expected Meru's switch action sprite.");

    expect(action).toEqual(expect.objectContaining({
      kind: "switch",
      sheetWidth: 288,
      sheetHeight: 192,
      frameWidth: 48,
      frameHeight: 48,
      columns: 6,
      rows: 4,
      loop: false,
      durationSeconds: 0.35,
    }));
    expect(action.frameDurationsSeconds).toEqual([
      0.045,
      0.05,
      0.06,
      0.075,
      0.065,
      0.055,
    ]);
    expect(action.frameDurationsSeconds.reduce(
      (sum, duration) => sum + duration,
      0,
    )).toBeCloseTo(0.35);
    expect(selectCharacterActionSpriteFrame(action, "down", 0)).toBe(0);
    expect(selectCharacterActionSpriteFrame(action, "down", 0.046)).toBe(1);
    expect(selectCharacterActionSpriteFrame(action, "up", 0.096)).toBe(8);
    expect(selectCharacterActionSpriteFrame(action, "left", 0.156)).toBe(15);
    expect(selectCharacterActionSpriteFrame(action, "right", 0.231)).toBe(22);
    expect(selectCharacterActionSpriteFrame(action, "right", 0.296)).toBe(23);
    expect(selectCharacterActionSpriteFrame(action, "right", 10)).toBe(23);

    expect([
      selectCharacterActionSpriteFrame(action, "down", 0.156),
      selectCharacterActionSpriteFrame(action, "up", 0.156),
      selectCharacterActionSpriteFrame(action, "left", 0.156),
      selectCharacterActionSpriteFrame(action, "right", 0.156),
    ]).toEqual([3, 9, 15, 21]);
  });

  it("registers all party members in the same renderer configuration map", () => {
    expect(CHARACTER_SPRITE_CONFIGS.kyle).toBe(KYLE_SPRITE);
    expect(CHARACTER_SPRITE_CONFIGS.nadi).toBe(NADI_SPRITE);
    expect(CHARACTER_SPRITE_CONFIGS.meru).toBe(MERU_SPRITE);
    expect(Object.keys(KYLE_SPRITE.actions)).toEqual([
      "normal",
      "special",
      "ultimate",
      "switch",
    ]);
    expect(Object.keys(NADI_SPRITE.actions)).toEqual([
      "normal",
      "special",
      "ultimate",
      "switch",
    ]);
    expect(Object.keys(MERU_SPRITE.actions)).toEqual([
      "normal",
      "special",
      "ultimate",
      "switch",
    ]);
  });

  it.each([KYLE_SPRITE, NADI_SPRITE, MERU_SPRITE])(
    "advances $characterId idle at 2fps and walk at 8fps",
    (config) => {
      expect(selectCharacterSpriteFrame(config, "down", "idle", 0.5)).toBe(1);
      expect(selectCharacterSpriteFrame(config, "down", "idle", 1)).toBe(0);
      expect(selectCharacterSpriteFrame(config, "up", "walk", 0)).toBe(8);
      expect(selectCharacterSpriteFrame(config, "up", "walk", 0.125)).toBe(9);
      expect(selectCharacterSpriteFrame(config, "up", "walk", 0.25)).toBe(10);
      expect(selectCharacterSpriteFrame(config, "up", "walk", 0.375)).toBe(11);
    },
  );

  it("uses the stronger axis and retains the prior axis on diagonal ties", () => {
    expect(
      resolveCharacterSpriteDirection({ x: -2, y: 0.5 }, "down"),
    ).toBe("left");
    expect(
      resolveCharacterSpriteDirection({ x: 0.5, y: -2 }, "right"),
    ).toBe("up");
    expect(
      resolveCharacterSpriteDirection({ x: -1, y: -1 }, "right"),
    ).toBe("left");
    expect(
      resolveCharacterSpriteDirection({ x: 1, y: -1 }, "down"),
    ).toBe("up");
    expect(
      resolveCharacterSpriteDirection({ x: 0, y: 0 }, "left"),
    ).toBe("left");
  });

  it.each([KYLE_SPRITE, NADI_SPRITE, MERU_SPRITE])(
    "holds $characterId on an authored idle frame during actions",
    (config) => {
      expect(
        selectCharacterSpriteFrame(config, "left", "action", 99),
      ).toBe(12);
      expect(
        selectCharacterSpriteFrame(config, "right", "downed", 99),
      ).toBe(18);
    },
  );

  it("keeps grounding adjustments presentation-only and within a subtle range", () => {
    expect(KYLE_SPRITE.drawOffsetY).toBe(0);
    expect(KYLE_SPRITE.directionDrawOffsetY).toEqual({
      down: 0,
      up: 1.5,
      left: 4.5,
      right: 6,
    });
    expect(KYLE_SPRITE.shadow).toEqual({
      radiusX: 9,
      radiusY: 2.5,
      offsetY: 0,
    });
    expect(NADI_SPRITE.drawScale).toBe(KYLE_SPRITE.drawScale);
    expect(NADI_SPRITE.anchor).toEqual({ x: 0.5, y: 0.92 });
    expect(NADI_SPRITE.directionDrawOffsetY).toEqual({
      down: 0,
      up: 3,
      left: 5.25,
      right: 9,
    });
    expect(NADI_SPRITE.shadow).toEqual(KYLE_SPRITE.shadow);
    expect(MERU_SPRITE.drawScale).toBe(KYLE_SPRITE.drawScale);
    expect(MERU_SPRITE.anchor).toEqual({ x: 0.5, y: 0.92 });
    expect(MERU_SPRITE.directionDrawOffsetY).toEqual({
      down: 0,
      up: 0.75,
      left: 3.75,
      right: 6.75,
    });
    expect(MERU_SPRITE.shadow).toEqual(KYLE_SPRITE.shadow);
    expect(CHARACTER_GROUNDING.shadow.opacity).toBeGreaterThanOrEqual(0.2);
    expect(CHARACTER_GROUNDING.shadow.opacity).toBeLessThanOrEqual(0.3);
  });

  it("locks attack direction and restarts frame one for a new sequence", () => {
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

    const renderer = new CharacterSpriteRenderer(KYLE_SPRITE);
    for (const image of fakeImages) image.onload?.();
    const member = {
      id: "kyle",
      downed: false,
      actionTimer: 0.18,
      actionDuration: 0.18,
      actionKind: "normal",
      actionSequenceId: 1,
      actionFacing: { x: 1, y: 0 },
      facing: { x: 1, y: 0 },
      moveIntent: { x: 0, y: 0 },
      hurtFlash: 0,
    } as Parameters<CharacterSpriteRenderer["draw"]>[1];
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;

    renderer.draw(context, member, 1, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "right",
      frame: 18,
      actionKind: "normal",
      sheet: "action",
    }));

    member.facing = { x: -1, y: 0 };
    member.actionTimer = 0.14;
    renderer.draw(context, member, 1.04, "playing");
    expect(renderer.debugState.direction).toBe("right");
    expect(renderer.debugState.frame).toBe(19);

    member.actionSequenceId = 2;
    member.actionFacing = { x: -1, y: 0 };
    member.actionTimer = 0.18;
    renderer.draw(context, member, 1.05, "playing");
    expect(renderer.debugState.direction).toBe("left");
    expect(renderer.debugState.frame).toBe(12);

    member.actionKind = "special";
    member.actionDuration = 0.28;
    member.actionTimer = 0.28;
    member.actionSequenceId = 3;
    member.actionFacing = { x: 0, y: -1 };
    renderer.draw(context, member, 1.06, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "up",
      frame: 6,
      actionKind: "special",
      sequenceId: 3,
      sheet: "action",
    }));

    member.facing = { x: 1, y: 0 };
    member.actionTimer = 0.2;
    renderer.draw(context, member, 1.14, "playing");
    expect(renderer.debugState.direction).toBe("up");
    expect(renderer.debugState.frame).toBe(7);

    member.actionSequenceId = 4;
    member.actionFacing = { x: 0, y: 1 };
    member.actionTimer = 0.28;
    renderer.draw(context, member, 1.15, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "down",
      frame: 0,
      actionKind: "special",
      sequenceId: 4,
      sheet: "action",
    }));

    member.actionKind = "ultimate";
    member.actionDuration = 0.5;
    member.actionTimer = 0.5;
    member.actionSequenceId = 5;
    member.actionFacing = { x: 1, y: 0 };
    renderer.draw(context, member, 1.16, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "right",
      frame: 18,
      actionKind: "ultimate",
      sequenceId: 5,
      sheet: "action",
    }));

    member.facing = { x: 0, y: -1 };
    member.moveIntent = { x: 0, y: -1 };
    member.actionTimer = 0.24;
    renderer.draw(context, member, 1.42, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "right",
      frame: 21,
      actionKind: "ultimate",
      sequenceId: 5,
      sheet: "action",
    }));

    member.actionTimer = 0.5;
    member.actionSequenceId = 6;
    member.actionFacing = { x: -1, y: 0 };
    renderer.draw(context, member, 1.43, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "left",
      frame: 12,
      actionKind: "ultimate",
      sequenceId: 6,
      sheet: "action",
    }));

    member.actionKind = "switch";
    member.actionDuration = 0.35;
    member.actionTimer = 0.35;
    member.actionSequenceId = 7;
    member.actionFacing = { x: 0, y: -1 };
    renderer.draw(context, member, 1.44, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "up",
      frame: 6,
      actionKind: "switch",
      sequenceId: 7,
      sheet: "action",
    }));

    member.facing = { x: 1, y: 0 };
    member.moveIntent = { x: 1, y: 0 };
    member.actionTimer = 0.19;
    renderer.draw(context, member, 1.6, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "up",
      frame: 9,
      actionKind: "switch",
      sequenceId: 7,
      sheet: "action",
    }));

    member.actionTimer = 0.35;
    member.actionSequenceId = 8;
    member.actionFacing = { x: 0, y: 1 };
    renderer.draw(context, member, 1.61, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "down",
      frame: 0,
      actionKind: "switch",
      sequenceId: 8,
      sheet: "action",
    }));

    member.downed = true;
    member.actionKind = "ultimate";
    member.actionDuration = 0.5;
    member.actionTimer = 0.5;
    member.actionSequenceId = 9;
    expect(renderer.draw(context, member, 1.62, "playing")).toBe(false);
    expect(renderer.debugState).toEqual(expect.objectContaining({
      pose: "downed",
      actionKind: null,
      sheet: "base",
    }));

    member.downed = false;
    member.actionKind = null;
    member.actionDuration = 0;
    member.actionTimer = 0;
    member.facing = { x: 1, y: 0 };
    member.moveIntent = { x: 1, y: 0 };
    renderer.draw(context, member, 1.63, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      pose: "walk",
      direction: "right",
      actionKind: null,
      sheet: "base",
    }));

    member.moveIntent = { x: 0, y: 0 };
    renderer.draw(context, member, 1.64, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      pose: "idle",
      actionKind: null,
      sheet: "base",
    }));
    renderer.destroy();
  });

  it("switches Nadi from her normal sheet to a fixed-row special and restarts it", () => {
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

    const renderer = new CharacterSpriteRenderer(NADI_SPRITE);
    for (const image of fakeImages) image.onload?.();
    const member = {
      id: "nadi",
      downed: false,
      actionTimer: 0.18,
      actionDuration: 0.18,
      actionKind: "normal",
      actionSequenceId: 1,
      actionFacing: { x: 1, y: 0 },
      facing: { x: 1, y: 0 },
      moveIntent: { x: 0, y: 0 },
      hurtFlash: 0,
    } as Parameters<CharacterSpriteRenderer["draw"]>[1];
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;

    renderer.draw(context, member, 1, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "right",
      frame: 18,
      actionKind: "normal",
      sheet: "action",
    }));

    member.actionKind = "special";
    member.actionDuration = 0.34;
    member.actionTimer = 0.34;
    member.actionSequenceId = 2;
    member.actionFacing = { x: 0, y: -1 };
    renderer.draw(context, member, 1.01, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "up",
      frame: 6,
      actionKind: "special",
      sequenceId: 2,
      sheet: "action",
    }));

    member.facing = { x: 1, y: 0 };
    member.moveIntent = { x: 1, y: 0 };
    member.actionTimer = 0.17;
    renderer.draw(context, member, 1.18, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "up",
      frame: 9,
      actionKind: "special",
      sequenceId: 2,
    }));

    member.actionSequenceId = 3;
    member.actionFacing = { x: -1, y: 0 };
    member.actionTimer = 0.34;
    renderer.draw(context, member, 1.19, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "left",
      frame: 12,
      actionKind: "special",
      sequenceId: 3,
      sheet: "action",
    }));

    member.actionKind = "ultimate";
    member.actionDuration = 1.04;
    member.actionTimer = 1.04;
    member.actionSequenceId = 4;
    member.actionFacing = { x: 0, y: 1 };
    renderer.draw(context, member, 1.2, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "down",
      frame: 0,
      actionKind: "ultimate",
      sequenceId: 4,
      sheet: "action",
    }));

    member.facing = { x: 1, y: 0 };
    member.moveIntent = { x: 1, y: 0 };
    member.actionTimer = 0.6;
    renderer.draw(context, member, 1.64, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "down",
      frame: 3,
      actionKind: "ultimate",
      sequenceId: 4,
      sheet: "action",
    }));

    member.actionTimer = 1.04;
    member.actionSequenceId = 5;
    member.actionFacing = { x: 1, y: 0 };
    renderer.draw(context, member, 1.65, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "right",
      frame: 18,
      actionKind: "ultimate",
      sequenceId: 5,
      sheet: "action",
    }));

    member.actionKind = "switch";
    member.actionDuration = 0.35;
    member.actionTimer = 0.35;
    member.actionSequenceId = 6;
    renderer.draw(context, member, 1.66, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "right",
      frame: 18,
      actionKind: "switch",
      sequenceId: 6,
      sheet: "action",
    }));

    member.facing = { x: 0, y: 1 };
    member.moveIntent = { x: 0, y: 1 };
    member.actionTimer = 0.19;
    renderer.draw(context, member, 1.82, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "right",
      frame: 21,
      actionKind: "switch",
      sequenceId: 6,
      sheet: "action",
    }));

    member.actionSequenceId = 7;
    member.actionFacing = { x: -1, y: 0 };
    member.actionTimer = 0.35;
    renderer.draw(context, member, 1.83, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "left",
      frame: 12,
      actionKind: "switch",
      sequenceId: 7,
      sheet: "action",
    }));

    member.downed = true;
    member.actionKind = "ultimate";
    member.actionDuration = 1.04;
    member.actionTimer = 1.04;
    member.actionSequenceId = 8;
    expect(renderer.draw(context, member, 1.84, "playing")).toBe(false);
    expect(renderer.debugState).toEqual(expect.objectContaining({
      pose: "downed",
      actionKind: null,
      sheet: "base",
    }));

    member.downed = false;
    member.actionKind = null;
    member.actionDuration = 0;
    member.actionTimer = 0;
    member.moveIntent = { x: 1, y: 0 };
    renderer.draw(context, member, 1.85, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      pose: "walk",
      direction: "right",
      actionKind: null,
      sheet: "base",
    }));

    member.moveIntent = { x: 0, y: 0 };
    renderer.draw(context, member, 1.69, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      pose: "idle",
      actionKind: null,
      sheet: "base",
    }));
    renderer.destroy();
  });

  it("uses Meru's configured sheets for normal, healing, and ultimate actions", () => {
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

    const renderer = new CharacterSpriteRenderer(MERU_SPRITE);
    for (const image of fakeImages) image.onload?.();
    const member = {
      id: "meru",
      downed: false,
      actionTimer: 0.18,
      actionDuration: 0.18,
      actionKind: "normal",
      actionSequenceId: 1,
      actionFacing: { x: 1, y: 0 },
      facing: { x: 1, y: 0 },
      moveIntent: { x: 0, y: 0 },
      hurtFlash: 0,
    } as Parameters<CharacterSpriteRenderer["draw"]>[1];
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;

    renderer.draw(context, member, 1, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "right",
      frame: 18,
      actionKind: "normal",
      sheet: "action",
    }));

    member.actionKind = "special";
    member.actionDuration = 0.38;
    member.actionTimer = 0.38;
    member.actionSequenceId = 2;
    member.actionFacing = { x: 0, y: -1 };
    renderer.draw(context, member, 1.01, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "up",
      frame: 6,
      actionKind: "special",
      sequenceId: 2,
      sheet: "action",
    }));

    member.facing = { x: 1, y: 0 };
    member.moveIntent = { x: 1, y: 0 };
    member.actionTimer = 0.2;
    renderer.draw(context, member, 1.19, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "up",
      frame: 9,
      actionKind: "special",
      sequenceId: 2,
      sheet: "action",
    }));

    member.actionTimer = 0.38;
    member.actionSequenceId = 3;
    member.actionFacing = { x: -1, y: 0 };
    renderer.draw(context, member, 1.2, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "left",
      frame: 12,
      actionKind: "special",
      sequenceId: 3,
      sheet: "action",
    }));

    member.actionKind = "normal";
    member.actionDuration = 0.18;
    member.actionTimer = 0.18;
    member.actionSequenceId = 4;
    member.actionFacing = { x: -1, y: 0 };
    renderer.draw(context, member, 1.21, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "left",
      frame: 12,
      actionKind: "normal",
      sequenceId: 4,
      sheet: "action",
    }));

    member.actionKind = "ultimate";
    member.actionDuration = 1.12;
    member.actionTimer = 1.12;
    member.actionSequenceId = 5;
    member.actionFacing = { x: 0, y: 1 };
    renderer.draw(context, member, 1.22, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "down",
      frame: 0,
      actionKind: "ultimate",
      sequenceId: 5,
      sheet: "action",
    }));

    member.facing = { x: 1, y: 0 };
    member.moveIntent = { x: 1, y: 0 };
    member.actionTimer = 0.59;
    renderer.draw(context, member, 1.75, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "down",
      frame: 3,
      actionKind: "ultimate",
      sequenceId: 5,
      sheet: "action",
    }));

    member.actionTimer = 1.12;
    member.actionSequenceId = 6;
    member.actionFacing = { x: 1, y: 0 };
    renderer.draw(context, member, 1.76, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "right",
      frame: 18,
      actionKind: "ultimate",
      sequenceId: 6,
      sheet: "action",
    }));

    member.actionKind = "switch";
    member.actionDuration = 0.35;
    member.actionTimer = 0.35;
    member.actionSequenceId = 7;
    renderer.draw(context, member, 1.77, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "right",
      frame: 18,
      actionKind: "switch",
      sequenceId: 7,
      sheet: "action",
    }));

    member.facing = { x: 0, y: -1 };
    member.moveIntent = { x: 0, y: -1 };
    member.actionTimer = 0.19;
    renderer.draw(context, member, 1.93, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "right",
      frame: 21,
      actionKind: "switch",
      sequenceId: 7,
      sheet: "action",
    }));

    member.actionSequenceId = 8;
    member.actionFacing = { x: 0, y: -1 };
    member.actionTimer = 0.35;
    renderer.draw(context, member, 1.94, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      direction: "up",
      frame: 6,
      actionKind: "switch",
      sequenceId: 8,
      sheet: "action",
    }));

    member.downed = true;
    member.actionKind = "special";
    member.actionDuration = 0.38;
    member.actionTimer = 0.38;
    member.actionSequenceId = 9;
    expect(renderer.draw(context, member, 1.95, "playing")).toBe(false);
    expect(renderer.debugState).toEqual(expect.objectContaining({
      pose: "downed",
      actionKind: null,
      sheet: "base",
    }));

    member.downed = false;
    member.actionKind = null;
    member.actionDuration = 0;
    member.actionTimer = 0;
    member.moveIntent = { x: 1, y: 0 };
    renderer.draw(context, member, 1.96, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      pose: "walk",
      direction: "right",
      actionKind: null,
      sheet: "base",
    }));

    member.moveIntent = { x: 0, y: 0 };
    renderer.draw(context, member, 1.97, "playing");
    expect(renderer.debugState).toEqual(expect.objectContaining({
      pose: "idle",
      actionKind: null,
      sheet: "base",
    }));
    renderer.destroy();
  });

  it("marks a failed image load for the placeholder fallback path", () => {
    const fakeImages: Array<{
      decoding: string;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }> = [];
    vi.stubGlobal("Image", function FakeImage() {
      const image = {
        decoding: "",
        onload: null,
        onerror: null,
        src: "",
      };
      fakeImages.push(image);
      return image;
    });

    const renderer = new CharacterSpriteRenderer(NADI_SPRITE);
    const fail = fakeImages[0]?.onerror;
    if (!fail) throw new Error("Expected an image error handler.");
    fail();

    expect(renderer.debugState.status).toBe("failed");
    renderer.destroy();
  });
});
