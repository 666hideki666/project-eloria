import { describe, expect, it } from "vitest";
import {
  SFX_CUE,
  SFX_CUE_ORDER,
  SFX_LIBRARY,
} from "../src/audio/sfxConfig";

describe("synthesized SFX tuning", () => {
  it("provides one typed definition for every soundboard cue", () => {
    expect(new Set(SFX_CUE_ORDER).size).toBe(SFX_CUE_ORDER.length);
    expect(Object.keys(SFX_LIBRARY).sort()).toEqual(
      Object.values(SFX_CUE).sort(),
    );
  });

  it("randomizes only character normals and keeps signature skills stable", () => {
    expect(SFX_LIBRARY.kyleNormal.pitchJitter).toBeGreaterThanOrEqual(0.03);
    expect(SFX_LIBRARY.nadiNormal.pitchJitter).toBeGreaterThanOrEqual(0.03);
    expect(SFX_LIBRARY.meruNormal.pitchJitter).toBeGreaterThanOrEqual(0.03);
    expect(SFX_LIBRARY.kyleNormal.pitchJitter).toBeLessThanOrEqual(0.05);

    for (const cue of [
      SFX_CUE.kyleSpecial,
      SFX_CUE.kyleUltimate,
      SFX_CUE.nadiSpecial,
      SFX_CUE.nadiUltimate,
      SFX_CUE.meruHeal,
      SFX_CUE.meruUltimate,
    ]) {
      expect(SFX_LIBRARY[cue].pitchJitter).toBe(0);
    }
  });

  it("caps high-frequency hit voices and applies a minimum interval", () => {
    expect(SFX_LIBRARY.hitNormal.maxVoices).toBeLessThanOrEqual(4);
    expect(SFX_LIBRARY.hitNormal.minInterval).toBeGreaterThan(0);
    expect(SFX_LIBRARY.hitArmor.maxVoices).toBeLessThanOrEqual(4);
  });

  it("keeps cinematic landmark sounds readable over BGM", () => {
    const rootGate = SFX_LIBRARY.rootGateOpen;
    const rootGateLength = Math.max(
      ...rootGate.tones.map((tone) => tone.delay + tone.duration),
      ...rootGate.noises.map((noise) => noise.delay + noise.duration),
    );
    expect(rootGateLength).toBeGreaterThanOrEqual(2);
    expect(rootGateLength).toBeLessThanOrEqual(3);
    expect(rootGate.bus).toBe("impact");

    const crystalLength = Math.max(
      ...SFX_LIBRARY.crystalActivate.tones.map((tone) => tone.delay + tone.duration + (tone.echo ?? 0) * 2),
      ...SFX_LIBRARY.crystalActivate.noises.map((noise) => noise.delay + noise.duration + (noise.echo ?? 0) * 2),
    );
    expect(crystalLength).toBeGreaterThanOrEqual(1.2);
    expect(SFX_LIBRARY.crystalActivate.bus).toBe("impact");

    const platform = SFX_LIBRARY.crystalPlatformRise;
    expect(platform.minInterval).toBeGreaterThanOrEqual(0.4);
    expect(platform.bus).toBe("impact");
    const completionLength = Math.max(
      ...SFX_LIBRARY.crystalPathComplete.tones.map((tone) => tone.delay + tone.duration + (tone.echo ?? 0) * 2),
    );
    expect(completionLength).toBeGreaterThanOrEqual(0.8);

    const sanctuaryActivation = SFX_LIBRARY.healingSpringActivate;
    const sanctuaryActivationLength = Math.max(
      ...sanctuaryActivation.tones.map((tone) => tone.delay + tone.duration + (tone.echo ?? 0) * 2),
      ...sanctuaryActivation.noises.map((noise) => noise.delay + noise.duration + (noise.echo ?? 0) * 2),
    );
    expect(sanctuaryActivationLength).toBeGreaterThanOrEqual(1.2);
    expect(sanctuaryActivation.bus).toBe("impact");
    const sanctuaryComplete = SFX_LIBRARY.healingSpringComplete;
    expect(Math.max(...sanctuaryComplete.tones.map((tone) => tone.delay + tone.duration + (tone.echo ?? 0) * 2))).toBeGreaterThanOrEqual(0.6);
    expect(sanctuaryComplete.bus).toBe("ui");
  });
});
