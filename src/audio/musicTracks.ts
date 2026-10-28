import type { PartyPresence } from "../stage/types";

export const MUSIC_TRACKS = {
  title: {
    name: "星影の序曲",
  },
  prologue: {
    name: "森が呼ぶ、その前に",
  },
  ancientForest: {
    name: "星巡る古の森",
  },
  exploration: {
    name: "森晶遺跡の静寂",
  },
  battle: {
    name: "晶界を駆ける",
  },
} as const;

export type MusicTrackId = keyof typeof MUSIC_TRACKS;

export function musicTrackForPartyPresence(
  presence: PartyPresence,
): MusicTrackId {
  return presence === "solo" ? "exploration" : "battle";
}
