import { VIEW } from "../config";
import type { GameAudioEvent } from "../game/audioEvents";
import type { CharacterId } from "../game/types";
import { AudioManager } from "./AudioManager";
import { SfxSynthesizer } from "./SfxSynthesizer";
import { SFX_CUE, type SfxCue } from "./sfxConfig";

const ABILITY_CUES: Record<
  CharacterId,
  Record<"normal" | "special" | "ultimate", SfxCue>
> = {
  kyle: {
    normal: SFX_CUE.kyleNormal,
    special: SFX_CUE.kyleSpecial,
    ultimate: SFX_CUE.kyleUltimate,
  },
  nadi: {
    normal: SFX_CUE.nadiNormal,
    special: SFX_CUE.nadiSpecial,
    ultimate: SFX_CUE.nadiUltimate,
  },
  meru: {
    normal: SFX_CUE.meruNormal,
    special: SFX_CUE.meruHeal,
    ultimate: SFX_CUE.meruUltimate,
  },
};

const SWITCH_CUES: Record<CharacterId, SfxCue> = {
  kyle: SFX_CUE.kyleSwitch,
  nadi: SFX_CUE.nadiSwitch,
  meru: SFX_CUE.meruSwitch,
};

const ULTIMATE_DUCK_DELAY: Record<CharacterId, number> = {
  kyle: 0.28,
  nadi: 0.62,
  meru: 0.48,
};

export class GameAudioDirector {
  public constructor(
    private readonly audio: AudioManager,
    private readonly synth: SfxSynthesizer,
  ) {}

  public dispatch(events: readonly GameAudioEvent[]): void {
    for (const event of events) {
      const pan = this.panFromWorldX(event.position.x);
      switch (event.kind) {
        case "ability": {
          this.synth.play(ABILITY_CUES[event.character][event.ability], {
            pan,
            variant: event.variant,
          });
          if (event.ability === "ultimate") {
            this.audio.duckMusic({
              target: 0.8,
              delay: ULTIMATE_DUCK_DELAY[event.character],
              attack: 0.14,
              hold: 0.18,
              release: 0.82,
            });
          }
          break;
        }
        case "switch":
          this.synth.play(SFX_CUE.switchCommon, { pan });
          this.synth.play(SWITCH_CUES[event.character], { pan });
          break;
        case "hit":
          this.synth.play(
            event.material === "stone" ? SFX_CUE.hitArmor : SFX_CUE.hitNormal,
            { pan },
          );
          break;
        case "armorBreak":
          this.synth.play(SFX_CUE.armorBreak, { pan });
          break;
        case "enemyDefeated":
          this.synth.play(SFX_CUE.enemyDefeat, { pan });
          break;
        case "experience":
          this.synth.play(SFX_CUE.expGain, { pan });
          break;
        case "pickup":
          this.synth.play(
            event.pickup === "leaf" ? SFX_CUE.pickupLeaf : SFX_CUE.pickupMana,
            { pan },
          );
          break;
        case "projectileReturn":
          this.synth.play(SFX_CUE.nadiReturn, { pan });
          break;
        case "dialogueType":
          this.synth.play(SFX_CUE[event.kind], { pan, variant: event.variant });
          break;
        case "crystalActivate":
          this.synth.play(SFX_CUE.crystalActivate, { pan: pan * 0.35, variant: event.variant });
          this.audio.duckMusic({ target: 0.8, attack: 0.12, hold: 1.1, release: 0.5 });
          break;
        case "rootGateOpen":
          // Landmark cues remain centered enough to survive a scrolling
          // camera and a full exploration BGM mix.
          this.synth.play(SFX_CUE.rootGateOpen, { pan: pan * 0.22, variant: event.variant });
          this.audio.duckMusic({ target: 0.76, attack: 0.1, hold: 2.35, release: 0.46 });
          break;
        case "crystalPlatformRise":
          this.synth.play(SFX_CUE.crystalPlatformRise, { pan: pan * 0.22, variant: event.variant });
          if ((event.variant ?? 0) === 0) {
            this.audio.duckMusic({ target: 0.8, attack: 0.1, hold: 2.4, release: 0.48 });
          }
          break;
        case "crystalPathComplete":
          this.synth.play(SFX_CUE.crystalPathComplete, { pan: pan * 0.22, variant: event.variant });
          break;
        case "healingSpringActivate":
          this.synth.play(SFX_CUE.healingSpringActivate, { pan: pan * 0.16 });
          this.audio.duckMusic({ target: 0.87, attack: 0.14, hold: 1.28, release: 0.52 });
          break;
        case "healingSpringComplete":
          this.synth.play(SFX_CUE.healingSpringComplete, { pan: pan * 0.16 });
          break;
        case "depthsSpiritLamp":
          this.synth.play(SFX_CUE.crystalActivate, { pan: pan * 0.16, variant: 2 });
          break;
        case "depthsStoneWedge":
          this.synth.play(SFX_CUE.rootGateOpen, { pan: pan * 0.2, variant: 1 });
          break;
        case "depthsCentralGate":
          this.synth.play(SFX_CUE.rootGateOpen, { pan: pan * 0.18, variant: 2 });
          this.audio.duckMusic({ target: 0.82, attack: 0.12, hold: 1.5, release: 0.38 });
          break;
        case "depthsRestorationCrystal":
          this.synth.play(SFX_CUE.crystalActivate, { pan: pan * 0.18, variant: 5 });
          this.audio.duckMusic({ target: 0.88, attack: 0.08, hold: 0.55, release: 0.35 });
          break;
        case "velgranRoar":
          this.synth.play(SFX_CUE.rootGateOpen, { pan: pan * 0.12, variant: 3 });
          this.audio.duckMusic({ target: 0.68, attack: 0.08, hold: 1.3, release: 0.5 });
          break;
        case "velgranStomp":
          this.synth.play(SFX_CUE.crystalPlatformRise, { pan: pan * 0.25, variant: 3 });
          break;
        case "velgranRoots":
          this.synth.play(SFX_CUE.rootGateOpen, { pan: pan * 0.2, variant: 4 });
          break;
        case "velgranShards":
          this.synth.play(SFX_CUE.nadiSpecial, { pan, variant: 3 });
          break;
        case "velgranForestRing":
          if ((event.variant ?? 0) === 0) {
            this.synth.play(SFX_CUE.crystalActivate, { pan: pan * 0.18, variant: 5 });
            this.audio.duckMusic({ target: 0.82, attack: 0.12, hold: 1.05, release: 0.36 });
          } else {
            this.synth.play(SFX_CUE.nadiUltimate, { pan: pan * 0.2, variant: 4 });
          }
          break;
        case "velgranArmorBreak":
          this.synth.play(SFX_CUE.armorBreak, { pan });
          this.audio.duckMusic({ target: 0.74, attack: 0.05, hold: 0.55, release: 0.35 });
          break;
        case "velgranDefeat":
          this.synth.play(SFX_CUE.rootGateOpen, { pan: pan * 0.12, variant: 5 });
          this.audio.duckMusic({ target: 0.58, attack: 0.12, hold: 1.4, release: 0.8 });
          break;
        case "forestSealStone":
          this.synth.play(SFX_CUE.crystalActivate, { pan: pan * 0.12, variant: event.variant ?? 4 });
          break;
      }
    }
  }

  private panFromWorldX(x: number): number {
    const normalized = (x / VIEW.width) * 2 - 1;
    return Math.min(0.72, Math.max(-0.72, normalized * 0.72));
  }
}
