import kyleUrl from "../../assets/sprites/characters/kyle/kyle-downed-48px-v1.png?url";
import nadiUrl from "../../assets/sprites/characters/nadi/nadi-downed-48px-v1.png?url";
import meruUrl from "../../assets/sprites/characters/mel/mel-downed-48px-v1.png?url";
import type { CharacterId } from "../game/types";

/** Approved concepts packed into 48px frames; see downed-preparation-v1.json. */
export const DOWNED_CHARACTER_SPRITES: Readonly<Record<CharacterId, string>> = {
  kyle: kyleUrl,
  nadi: nadiUrl,
  meru: meruUrl,
};
export const DOWNED_FRAME = {
  width: 48,
  height: 48,
  anchorX: 24,
  anchorY: 32,
  shadow: { radiusX: 14, radiusY: 3, offsetY: 0 },
} as const;
