import type { CharacterId, Vec2 } from "./types";

export type AbilityKind = "normal" | "special" | "ultimate";
export type HitMaterial = "normal" | "stone";
export type PickupSoundKind = "leaf" | "mana";

export type GameAudioEvent =
  | {
      kind: "ability";
      character: CharacterId;
      ability: AbilityKind;
      automatic: boolean;
      variant: number;
      position: Vec2;
    }
  | {
      kind: "switch";
      character: CharacterId;
      position: Vec2;
    }
  | {
      kind: "hit";
      material: HitMaterial;
      position: Vec2;
    }
  | {
      kind: "armorBreak";
      position: Vec2;
    }
  | {
      kind: "enemyDefeated";
      position: Vec2;
    }
  | {
      kind: "experience";
      position: Vec2;
    }
  | {
      kind: "pickup";
      pickup: PickupSoundKind;
      position: Vec2;
    }
  | {
      kind: "projectileReturn";
      character: "nadi";
      position: Vec2;
    }
  | {
      kind: "dialogueType" | "crystalActivate" | "rootGateOpen" | "crystalPlatformRise" | "crystalPathComplete" | "healingSpringActivate" | "healingSpringComplete" | "depthsSpiritLamp" | "depthsStoneWedge" | "depthsCentralGate" | "depthsRestorationCrystal" | "velgranRoar" | "velgranStomp" | "velgranRoots" | "velgranShards" | "velgranForestRing" | "velgranArmorBreak" | "velgranDefeat" | "forestSealStone";
      position: Vec2;
      /** Optional authored variation for sequential stage-event sounds. */
      variant?: number;
    };
