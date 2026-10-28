import { afterEach, describe, expect, it, vi } from "vitest";
import { CharacterSpriteRenderer } from "../src/render/CharacterSpriteRenderer";
import { KYLE_SPRITE, NADI_SPRITE, MERU_SPRITE } from "../src/render/characterSpriteConfig";
import { DOWNED_CHARACTER_SPRITES } from "../src/render/downedCharacterSprites";

describe("approved downed character sprites", () => {
  afterEach(() => vi.unstubAllGlobals());
  function setup(config: typeof KYLE_SPRITE) {
    const images: Array<{ src: string; naturalWidth: number; naturalHeight: number; onload: (() => void) | null; onerror: (() => void) | null }> = [];
    vi.stubGlobal("Image", function () {
      const image = { src: "", naturalWidth: 288, naturalHeight: 192, onload: null, onerror: null };
      images.push(image);
      return image;
    });
    const renderer = new CharacterSpriteRenderer(config);
    const downed = images.find(i => i.src === DOWNED_CHARACTER_SPRITES[config.characterId])!;
    downed.naturalWidth = downed.naturalHeight = 48;
    const context = { drawImage: vi.fn(), save: vi.fn(), restore: vi.fn(), imageSmoothingEnabled: true };
    const member = {
      id: config.characterId, downed: true, actionTimer: 0, actionDuration: 0,
      actionKind: null, actionSequenceId: 0, actionFacing: { x: 1, y: 0 },
      facing: { x: -1, y: 0 }, moveIntent: { x: 0, y: 0 }, hurtFlash: 1,
      pos: { x: 120, y: 150 },
    } as Parameters<CharacterSpriteRenderer["draw"]>[1];
    const draw = (time = 1) => renderer.draw(context as unknown as CanvasRenderingContext2D, member, time, "playing");
    return { renderer, images, downed, context, member, draw };
  }
  it.each([KYLE_SPRITE, NADI_SPRITE, MERU_SPRITE])("draws $characterId independently of base loading and returns to walking after revival", config => {
    const { renderer, images, downed, context, member, draw } = setup(config);
    downed.onload?.();
    const pos = { ...member.pos };
    expect(draw()).toBe(true);
    expect(context.drawImage).toHaveBeenLastCalledWith(downed, 0, 0, 48, 48, -18, -24, 36, 36);
    expect(context.imageSmoothingEnabled).toBe(false);
    expect(context.drawImage).toHaveBeenCalledTimes(1); // No hurt flash, mirror or animation.
    expect(member.pos).toEqual(pos);
    context.drawImage.mockClear();
    draw(8);
    expect(context.drawImage).toHaveBeenLastCalledWith(downed, 0, 0, 48, 48, -18, -24, 36, 36);
    images[0]?.onload?.();
    member.downed = false;
    member.hurtFlash = 0;
    member.moveIntent = { x: 1, y: 0 };
    expect(draw(8.05)).toBe(true);
    expect(context.drawImage.mock.lastCall?.[0]).toBe(images[0]);
    expect(renderer.debugState.pose).toBe("walk");
    expect(member.pos).toEqual(pos);
    renderer.destroy();
    expect(images.every(i => i.onload === null && i.onerror === null)).toBe(true);
  });
  it.each([KYLE_SPRITE, NADI_SPRITE, MERU_SPRITE])("falls back for $characterId on loading/error/wrong dimensions without breaking alive art", config => {
    const { renderer, images, downed, context, member, draw } = setup(config);
    expect(draw()).toBe(false);
    downed.onerror?.();
    expect(renderer.debugState.downedStatus).toBe("failed");
    expect(draw()).toBe(false);
    downed.naturalWidth = 1536;
    downed.onload?.();
    expect(draw()).toBe(false); // Never show the large concept as an in-game sprite.
    expect(context.drawImage).not.toHaveBeenCalled();
    images[0]?.onload?.();
    member.downed = false;
    member.hurtFlash = 0;
    expect(draw()).toBe(true);
    expect(context.drawImage.mock.lastCall?.[0]).toBe(images[0]);
    renderer.destroy();
  });
});
