import { describe, expect, it, vi } from "vitest";
import { AudioManager } from "../src/audio/AudioManager";
import { GameAudioDirector } from "../src/audio/GameAudioDirector";
import { SfxSynthesizer } from "../src/audio/SfxSynthesizer";
import { SFX_CUE, type SfxCue } from "../src/audio/sfxConfig";

function createDirector(): {
  director: GameAudioDirector;
  played: SfxCue[];
  duckMusic: ReturnType<typeof vi.fn>;
} {
  const played: SfxCue[] = [];
  const duckMusic = vi.fn();
  const audio = { duckMusic } as unknown as AudioManager;
  const synth = {
    play: (cue: SfxCue): boolean => {
      played.push(cue);
      return true;
    },
  } as unknown as SfxSynthesizer;
  return {
    director: new GameAudioDirector(audio, synth),
    played,
    duckMusic,
  };
}

describe("GameAudioDirector", () => {
  it("layers the shared and character-specific switch sounds", () => {
    const { director, played } = createDirector();
    director.dispatch([
      {
        kind: "switch",
        character: "meru",
        position: { x: 320, y: 180 },
      },
    ]);

    expect(played).toEqual([SFX_CUE.switchCommon, SFX_CUE.meruSwitch]);
  });

  it("ducks only for an ultimate and routes material-specific impacts", () => {
    const { director, played, duckMusic } = createDirector();
    director.dispatch([
      {
        kind: "ability",
        character: "nadi",
        ability: "normal",
        automatic: false,
        variant: 0,
        position: { x: 200, y: 180 },
      },
      {
        kind: "hit",
        material: "stone",
        position: { x: 240, y: 180 },
      },
      {
        kind: "ability",
        character: "nadi",
        ability: "ultimate",
        automatic: false,
        variant: 0,
        position: { x: 200, y: 180 },
      },
    ]);

    expect(played).toEqual([
      SFX_CUE.nadiNormal,
      SFX_CUE.hitArmor,
      SFX_CUE.nadiUltimate,
    ]);
    expect(duckMusic).toHaveBeenCalledTimes(1);
    expect(duckMusic).toHaveBeenCalledWith(
      expect.objectContaining({ target: 0.8 }),
    );
  });

  it("routes dialogue and landmark events through their independent synth cues", () => {
    const { director, played, duckMusic } = createDirector();
    director.dispatch([
      { kind: "dialogueType", position: { x: 100, y: 100 } },
      { kind: "crystalActivate", position: { x: 120, y: 100 } },
      { kind: "rootGateOpen", position: { x: 140, y: 100 } },
      { kind: "crystalPlatformRise", position: { x: 160, y: 100 } },
      { kind: "crystalPathComplete", position: { x: 180, y: 100 } },
      { kind: "healingSpringActivate", position: { x: 200, y: 100 } },
      { kind: "healingSpringComplete", position: { x: 220, y: 100 } },
    ]);
    expect(played).toEqual([
      SFX_CUE.dialogueType,
      SFX_CUE.crystalActivate,
      SFX_CUE.rootGateOpen,
      SFX_CUE.crystalPlatformRise,
      SFX_CUE.crystalPathComplete,
      SFX_CUE.healingSpringActivate,
      SFX_CUE.healingSpringComplete,
    ]);
    expect(duckMusic).toHaveBeenCalledWith(expect.objectContaining({ target: 0.8 }));
    expect(duckMusic).toHaveBeenCalledWith(expect.objectContaining({ target: 0.76 }));
    expect(duckMusic).toHaveBeenCalledWith(expect.objectContaining({ target: 0.87 }));
  });

  it("gives Forest Crystal Ring a charging resonance and a separate release impact", () => {
    const { director, played, duckMusic } = createDirector();
    director.dispatch([
      { kind: "velgranForestRing", position: { x: 400, y: 240 }, variant: 0 },
      { kind: "velgranForestRing", position: { x: 400, y: 240 }, variant: 1 },
    ]);
    expect(played).toEqual([SFX_CUE.crystalActivate, SFX_CUE.nadiUltimate]);
    expect(duckMusic).toHaveBeenCalledWith(expect.objectContaining({ target: 0.82 }));
  });
});
