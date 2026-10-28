import caveArt from "../../assets/concepts/epilogue/eloria-epilogue-forest-cave-return-v1.png?url";
import roadArt from "../../assets/concepts/epilogue/eloria-epilogue-village-road-v1.png?url";
import type { CinematicScene } from "./chapterSequence";
export const FOREST_RETURN_SCENES: readonly CinematicScene[] = [
  { id: "forest-cave-return", label: "森に出る", speaker: "", narration: ["洞窟を出ると、森を震わせていた青い脈動は消えていた。", "枝の向こうから、小鳥の声が聞こえる。"] },
  { id: "village-road", label: "村への道", speaker: "ナディ", narration: ["いったん村に戻ろう。みんなが心配してる。", "三人は、静けさを取り戻した森の道へ歩き出した。"] },
];
export const FOREST_RETURN_ART = [caveArt, roadArt];
