import "./style.css";
import battleMusicUrl from "../assets/audio/music/battle-crystal-realm-v1.mp3?url";
import explorationMusicUrl from "../assets/audio/music/exploration-forest-crystal-ruins-v1.mp3?url";
import ancientForestMusicUrl from "../assets/audio/music/field-star-circling-forest-v1.mp3?url";
import titleMusicUrl from "../assets/audio/music/title-starshadow-prelude-v1.mp3?url";
import prologueMusicUrl from "../assets/audio/music/prologue-before-forest-calls-v1.mp3?url";
import { AudioManager } from "./audio/AudioManager";
import { GameAudioDirector } from "./audio/GameAudioDirector";
import { SfxSynthesizer } from "./audio/SfxSynthesizer";
import { VIEW } from "./config";
import { GameWorld } from "./game/GameWorld";
import { createEnemy } from "./game/entities";
import type { EnemyKind, WorldSnapshot } from "./game/types";
import type { GameMode, RoomId } from "./stage/types";
import type { EncounterGroupId } from "./stage/maps/mossRootRuinsMap";
import type { LightwingEncounterGroupId } from "./stage/maps/lightwingCrystalCavernMap";
import type { DepthsEncounterGroupId } from "./stage/maps/spiritClothStonescaleDepthsMap";
import { InputController } from "./input/InputController";
import {
  ENEMY_SPRITE_CONFIGS,
  type EnemyActionSpritePhase,
  type EnemySpriteClipConfig,
} from "./render/enemySpriteConfig";
import { Renderer } from "./render/Renderer";
import { AudioControls } from "./ui/AudioControls";
import { DesktopHudController } from "./ui/DesktopHudController";
import { OverlayController } from "./ui/OverlayController";
import { GameGestureGuard } from "./ui/GameGestureGuard";
import { ViewportLayoutController } from "./ui/ViewportLayoutController";
import { OpeningController } from "./ui/OpeningController";
import { shouldShowOpening } from "./ui/openingSequence";
import { Layer1AnomalyController } from "./ui/Layer1AnomalyController";
import { ChapterCinematicController } from "./ui/ChapterCinematicController";
import { TitleReturnController } from "./ui/TitleReturnController";
import { VelgranReturnChoiceController } from "./ui/VelgranReturnChoiceController";
import { FOREST_RETURN_SCENES, FOREST_RETURN_ART } from "./ui/forestReturnScenes";
import { CaveGuideController } from "./ui/CaveGuideController";
import { CaveEntryTitleController } from "./ui/CaveEntryTitleController";
import { FieldMessages } from "./ui/FieldMessages";
import { StatusPanelController } from "./ui/StatusPanelController";
import { SfxSoundboard } from "./ui/SfxSoundboard";

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required element is missing: ${selector}`);
  return element;
}

const viewportLayout = new ViewportLayoutController(document.documentElement);
const canvas = requireElement<HTMLCanvasElement>("#game");
const gameShell = requireElement<HTMLElement>("#game-shell");
const gameGestures = new GameGestureGuard(gameShell);
const searchParams = new URLSearchParams(window.location.search);
const gameMode: GameMode = searchParams.get("mode") === "arena"
  ? "arena"
  : "stage";
const stageQaRoomParam = searchParams.get("stageQa");
const stageQaRoom: RoomId | undefined =
  import.meta.env.DEV &&
    (
      stageQaRoomParam === "ancientForest" ||
      stageQaRoomParam === "mossRootRuins" ||
      stageQaRoomParam === "lightwingCrystalCavern" ||
      stageQaRoomParam === "spiritClothStonescaleDepths" ||
      stageQaRoomParam === "crystalAltar" ||
      stageQaRoomParam === "transferChamber" ||
      stageQaRoomParam === "mossCorridor"
    )
    ? stageQaRoomParam === "ancientForest" ||
      stageQaRoomParam === "lightwingCrystalCavern" ||
      stageQaRoomParam === "spiritClothStonescaleDepths" ||
      stageQaRoomParam === "crystalAltar"
      ? stageQaRoomParam
      : "mossRootRuins"
    : undefined;
const mossCorridorEncounterQa =
  import.meta.env.DEV && stageQaRoom === "mossRootRuins"
    ? searchParams.get("encounterQa")
    : null;
const layerEncounterQa =
  import.meta.env.DEV &&
  (stageQaRoom === "lightwingCrystalCavern" || stageQaRoom === "spiritClothStonescaleDepths")
    ? searchParams.get("layerEncounterQa")
    : null;
const stageFormationQa =
  import.meta.env.DEV &&
  gameMode === "stage" &&
  searchParams.get("partyQa") === "formation";
const world = new GameWorld({
  mode: gameMode,
  initialRoomId: stageQaRoom,
  enableLayer1Anomaly: !(import.meta.env.DEV && [...searchParams.keys()].some(key => key.endsWith("Qa"))),
  debugAi:
    import.meta.env.DEV &&
    searchParams.has("debug-ai"),
});

/** Deliberately isolated from shipped startup.  No selector DOM is created
 * unless Vite's DEV flag is true and a QA URL did not request a room. */
function mountDevLayerSelector(onChosen: () => void, onCancel: () => void): () => void {
  const layers = [
    { id: "ancientForest", label: "序章　古の森" },
    { id: "mossRootRuins", label: "第1層　苔根の遺構" },
    { id: "lightwingCrystalCavern", label: "第2層　光羽の晶洞" },
    { id: "spiritClothStonescaleDepths", label: "第3層　霊布と石鱗の深層" },
    { id: "crystalAltar", label: "守護者戦　森晶の祭壇" },
  ] as const;
  let selected = 0;
  const panel = document.createElement("section");
  panel.dataset.devLayerSelector = "true";
  panel.setAttribute("aria-label", "開発用開始層選択");
  Object.assign(panel.style, {
    position: "fixed", inset: "0", zIndex: "100", display: "grid", placeItems: "safe center",
    overflow: "auto", padding: "12px", boxSizing: "border-box",
    background: "rgba(4,10,13,.88)", color: "#e9fff8", fontFamily: "monospace",
  });
  const card = document.createElement("div");
  Object.assign(card.style, { width: "min(420px, 100%)", boxSizing: "border-box", border: "1px solid #74ddd1", background: "#112326", padding: "22px", boxShadow: "0 0 0 3px #071214" });
  const title = document.createElement("h2");
  title.textContent = "開発用｜開始する層を選択";
  title.style.margin = "0 0 16px";
  card.append(title);
  const buttons = layers.map((layer, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${index + 1}. ${layer.label}`;
    Object.assign(button.style, { display: "block", width: "100%", margin: "8px 0", padding: "10px", textAlign: "left", font: "inherit", cursor: "pointer" });
    button.addEventListener("click", () => choose(index));
    card.append(button);
    return button;
  });
  const hint = document.createElement("p");
  hint.textContent = "クリック / 1・2・3・4・5 / ↑↓ + Enter";
  hint.style.margin = "14px 0 0";
  card.append(hint);
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "タイトルへ戻る";
  Object.assign(cancel.style, { padding: "8px 12px", marginTop: "8px", cursor: "pointer" });
  cancel.addEventListener("click", () => { cleanup(); onCancel(); });
  card.append(cancel);
  const fullscreenButton = document.createElement("button");
  fullscreenButton.type = "button";
  fullscreenButton.dataset.devFullscreen = "true";
  fullscreenButton.setAttribute("aria-describedby", "dev-fullscreen-hint");
  Object.assign(fullscreenButton.style, {
    display: "block", width: "100%", margin: "18px 0 0", padding: "10px",
    font: "inherit", cursor: "pointer", color: "#d8f4ee",
    background: "#20383b", border: "1px solid #6ca49c",
  });
  const fullscreenHint = document.createElement("p");
  fullscreenHint.id = "dev-fullscreen-hint";
  fullscreenHint.setAttribute("aria-live", "polite");
  Object.assign(fullscreenHint.style, { margin: "7px 0 0", color: "#acd5cc", fontSize: "12px" });
  card.append(fullscreenButton, fullscreenHint);
  panel.append(card);
  document.body.append(panel);
  const fullscreenAvailable =
    typeof document.documentElement.requestFullscreen === "function" &&
    typeof document.exitFullscreen === "function" &&
    document.fullscreenEnabled !== false;
  const syncFullscreen = () => {
    const active = document.fullscreenElement !== null;
    fullscreenButton.disabled = !fullscreenAvailable;
    fullscreenButton.style.cursor = fullscreenAvailable ? "pointer" : "not-allowed";
    fullscreenButton.textContent = !fullscreenAvailable
      ? "全画面は利用できません"
      : active ? "全画面を終了" : "⛶ 全画面で遊ぶ";
    fullscreenButton.setAttribute("aria-pressed", String(active));
    fullscreenHint.textContent = !fullscreenAvailable
      ? "このブラウザでは通常表示で層を選んでください。"
      : active ? "Escで通常表示に戻れます" : "ブラウザの全画面表示を切り替えます";
  };
  const showFullscreenError = () => {
    syncFullscreen();
    fullscreenHint.textContent = "全画面に切り替えられませんでした。通常表示で層を選べます。";
  };
  fullscreenButton.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      syncFullscreen();
    } catch {
      showFullscreenError();
    }
  });
  document.addEventListener("fullscreenchange", syncFullscreen);
  document.addEventListener("fullscreenerror", showFullscreenError);
  const render = () => buttons.forEach((button, index) => {
    button.style.background = index === selected ? "#2b706e" : "#183338";
    button.style.color = index === selected ? "#ffffff" : "#bfe9df";
    button.style.border = index === selected ? "1px solid #bdfbf0" : "1px solid #386a67";
  });
  const choose = (index: number) => {
    const layer = layers[index];
    if (!layer) return;
    cleanup();
    world.startDevelopmentLayer(layer.id);
    onChosen();
  };
  const onKey = (event: KeyboardEvent) => {
    if ((event.target as Element | null)?.closest("button") && (event.key === "Enter" || event.code === "Space")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) ((event.target as Element).closest("button") as HTMLButtonElement).click();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault(); event.stopImmediatePropagation();
      cleanup(); onCancel(); return;
    }
    if (["1", "2", "3", "4", "5", "ArrowUp", "ArrowDown", "Enter"].includes(event.key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    } else return;
    if (["1", "2", "3", "4", "5"].includes(event.key)) choose(Number(event.key) - 1);
    else if (event.key === "ArrowUp") { selected = (selected + layers.length - 1) % layers.length; render(); buttons[selected]?.focus(); }
    else if (event.key === "ArrowDown") { selected = (selected + 1) % layers.length; render(); buttons[selected]?.focus(); }
    else choose(selected);
  };
  const onKeyUp = (event: KeyboardEvent) => {
    if (event.target === fullscreenButton && (event.key === "Enter" || event.code === "Space")) {
      event.stopImmediatePropagation();
    }
  };
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("keyup", onKeyUp, true);
  const cleanup = () => {
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("keyup", onKeyUp, true);
    document.removeEventListener("fullscreenchange", syncFullscreen);
    document.removeEventListener("fullscreenerror", showFullscreenError);
    panel.remove();
  };
  syncFullscreen();
  render();
  buttons[0]?.focus();
  return cleanup;
}

const lightwingAreaQa = searchParams.get("areaQa");
const lightwingTerrainQa = searchParams.get("terrainQa");
if (
  import.meta.env.DEV && stageQaRoom === "lightwingCrystalCavern" &&
  lightwingAreaQa &&
  ["arrival", "intro-battle", "primary-crystal", "dead-end", "mixed-battle", "healing-spring", "secondary-crystal", "platforms-locked", "platforms-open", "final-battle", "floor3-gate", "outer-boundary"].includes(lightwingAreaQa)
) world.setLightwingCrystalCavernForQa(lightwingAreaQa);
const depthsAreaQa = searchParams.get("areaQa");
if (
  import.meta.env.DEV && stageQaRoom === "spiritClothStonescaleDepths" &&
  depthsAreaQa &&
  ["arrival", "spirit-entry", "spirit-lamp", "stone-passage", "stone-wedge", "central-gate", "antechamber", "narrow-formation"].includes(depthsAreaQa)
) world.setSpiritClothStonescaleDepthsForQa(depthsAreaQa);
if (
  import.meta.env.DEV &&
  stageQaRoom === "spiritClothStonescaleDepths" &&
  searchParams.get("depthsGateQa") === "opening"
) {
  world.spiritLampActivated = true;
  world.stoneWedgeActivated = true;
  world.tryOpenDepthsCentralGateForQa();
}
if (
  import.meta.env.DEV && stageQaRoom === "lightwingCrystalCavern" &&
  lightwingTerrainQa === "outer-boundary"
) world.setLightwingCrystalCavernForQa("outer-boundary");
if (
  import.meta.env.DEV && stageQaRoom === "lightwingCrystalCavern" &&
  searchParams.get("spawnQa") === "all"
) world.setLightwingSpawnQaAll();
if (stageFormationQa) world.beginStageCombat();
if (import.meta.env.DEV && stageQaRoom === "crystalAltar") {
  const bossQa = searchParams.get("bossQa");
  if (
    bossQa === "awakening" || bossQa === "active" || bossQa === "stomp" ||
    bossQa === "roots" || bossQa === "shards" || bossQa === "forestRing" || bossQa === "repel" || bossQa === "core" ||
    bossQa === "defeat" || bossQa === "seal"
  ) {
    world.setVelgranBossForQa(bossQa, searchParams.get("bossEnragedQa") === "1");
  }
}
const encounterQaMatch = mossCorridorEncounterQa?.match(
  /^(mossIntro|mossFork|mossDeadEnd|mossGate)-(dormant|noticed|active|cleared)$/,
);
const encounterDisengageQaMatch = mossCorridorEncounterQa?.match(
  /^(mossIntro|mossFork|mossDeadEnd|mossGate)-disengage$/,
);
if (encounterDisengageQaMatch) {
  world.setMossRootDisengageForQa(encounterDisengageQaMatch[1] as EncounterGroupId);
} else if (mossCorridorEncounterQa === "all-cleared") {
  world.clearAllMossRootEncountersForQa();
} else if (encounterQaMatch) {
  world.setMossRootEncounterForQa(
    encounterQaMatch[1] as EncounterGroupId,
    encounterQaMatch[2] as "dormant" | "noticed" | "active" | "cleared",
  );
} else if (
  mossCorridorEncounterQa === "noticed" ||
  mossCorridorEncounterQa === "cleared"
) {
  world.setStageEncounterForQa(mossCorridorEncounterQa);
}
const lightwingEncounterQaMatch = layerEncounterQa?.match(
  /^(lightwingIntro|lightwingDraft|lightwingDeadEnd|mixedChannel|lightwingNest)-(dormant|noticed|active|cleared)$/,
);
const depthsEncounterQaMatch = layerEncounterQa?.match(
  /^(depthsSpiritEntry|depthsSpiritLamp|depthsStonePassage|depthsStoneWedge)-(dormant|noticed|active|cleared)$/,
);
const depthsMultiGroupQa = import.meta.env.DEV && stageQaRoom === "spiritClothStonescaleDepths"
  ? searchParams.get("multiGroupQa")
  : null;
const depthsMultiGroupQaMatch = depthsMultiGroupQa?.match(
  /^(depthsSpiritEntry|depthsSpiritLamp|depthsStonePassage|depthsStoneWedge),(depthsSpiritEntry|depthsSpiritLamp|depthsStonePassage|depthsStoneWedge)$/,
);
if (lightwingEncounterQaMatch) {
  world.setLightwingEncounterForQa(
    lightwingEncounterQaMatch[1] as LightwingEncounterGroupId,
    lightwingEncounterQaMatch[2] as "dormant" | "noticed" | "active" | "cleared",
  );
} else if (depthsMultiGroupQaMatch) {
  world.setDepthsMultiEncounterForQa(
    depthsMultiGroupQaMatch[1] as DepthsEncounterGroupId,
    depthsMultiGroupQaMatch[2] as DepthsEncounterGroupId,
  );
} else if (depthsEncounterQaMatch) {
  world.setDepthsEncounterForQa(
    depthsEncounterQaMatch[1] as DepthsEncounterGroupId,
    depthsEncounterQaMatch[2] as "dormant" | "noticed" | "active" | "cleared",
  );
}
const landmarkQa = searchParams.get("landmarkQa");
if (
  import.meta.env.DEV &&
  (
    landmarkQa === "crystal-near" || landmarkQa === "crystal-touch" ||
    landmarkQa === "root-gate-closed" || landmarkQa === "root-gate-open"
  )
) world.setMossRootLandmarkForQa(landmarkQa);
const cameraQa = searchParams.get("cameraQa");
// `positionQa` is kept as a concise landmark-oriented alias for the stage
// visual-QA URLs documented for the production map.
const positionQa = searchParams.get("positionQa");
const requestedCameraQa = positionQa ?? cameraQa;
if (
  import.meta.env.DEV &&
  (
    requestedCameraQa === "start" || requestedCameraQa === "center" || requestedCameraQa === "top" ||
    requestedCameraQa === "left-intro" || requestedCameraQa === "water-ruins" || requestedCameraQa === "left-junction" ||
    requestedCameraQa === "crossing" || requestedCameraQa === "crystal-bridge" || requestedCameraQa === "right-battle" ||
    requestedCameraQa === "root-maze" || requestedCameraQa === "former-spring" ||
    requestedCameraQa === "nav-water" || requestedCameraQa === "waterfall" ||
    requestedCameraQa === "nav-dark-lower" || requestedCameraQa === "nav-dark-upper" ||
    requestedCameraQa === "final"
  )
) {
  world.setStageCameraQa(requestedCameraQa);
}
if (import.meta.env.DEV && stageQaRoom === "lightwingCrystalCavern") {
  const springQa = searchParams.get("springQa");
  const normalizedSpringQa = springQa === "lake-idle" ? "idle" : springQa === "lake-healing" ? "healing" : springQa;
  if (
    normalizedSpringQa === "idle" || normalizedSpringQa === "charging" || normalizedSpringQa === "healing" || normalizedSpringQa === "context" ||
    normalizedSpringQa === "afterglow" || normalizedSpringQa === "damaged-party" || normalizedSpringQa === "downed-member"
  ) world.setLightwingSpringForQa(normalizedSpringQa);
}
const dialogueQa = searchParams.get("dialogueQa");
if (
  import.meta.env.DEV && dialogueQa &&
  ["crystal-touch", "root-open-result", "primary-crystal", "platform-complete"].includes(dialogueQa)
) world.setDialogueForQa(dialogueQa);
const transitionQa = searchParams.get("transitionQa");
if (import.meta.env.DEV && (
  transitionQa === "to-layer2" || transitionQa === "to-layer1" || transitionQa === "arrival" ||
  transitionQa === "to-layer3" || transitionQa === "to-layer2-from-layer3" ||
  transitionQa === "to-boss" || transitionQa === "to-depths"
)) {
  world.setLayerTransitionForQa(transitionQa);
}
const respawnQa = searchParams.get("respawnQa");
if (import.meta.env.DEV && (respawnQa === "cleared-far" || respawnQa === "cleared-edge")) {
  world.setMossRootRespawnForQa(respawnQa === "cleared-edge" ? "edge" : "far");
} else if (import.meta.env.DEV && (respawnQa === "partial-far" || respawnQa === "partial-edge")) {
  world.setMossRootPartialDisengageForQa(respawnQa === "partial-edge" ? "edge" : "far");
}
const renderer = new Renderer(canvas, world.effects);
const audio = new AudioManager({
  musicUrl: battleMusicUrl,
  musicTracks: {
    title: titleMusicUrl,
    prologue: prologueMusicUrl,
    ancientForest: ancientForestMusicUrl,
    battle: battleMusicUrl,
    exploration: explorationMusicUrl,
  },
  initialMusicTrack: world.musicScene,
});
audio.syncGamePhase(world.phase);
const sfx = new SfxSynthesizer(audio);
const gameAudio = new GameAudioDirector(audio, sfx);
const input = new InputController(window, (mode) => {
  document.body.dataset.input = mode;
});
if (window.matchMedia("(pointer: coarse)").matches ||
    (import.meta.env.DEV && searchParams.get("touchQa") === "1")) {
  input.buffer.setTouchMove({ x: 0, y: 0 });
  document.body.dataset.input = "touch";
}

function syncStageDataset(): void {
  const snapshot = world.snapshot;
  gameShell.dataset.stageLayer = snapshot.stageLayer ?? "";
  gameShell.dataset.worldWidth = String(snapshot.worldWidth);
  gameShell.dataset.worldHeight = String(snapshot.worldHeight);
  gameShell.dataset.cameraX = String(snapshot.camera.x);
  gameShell.dataset.cameraY = String(snapshot.camera.y);
  gameShell.dataset.activeEncounter = snapshot.activeEncounter ?? "none";
  gameShell.dataset.clearedEncounters = snapshot.clearedEncounters.join(",");
  gameShell.dataset.disengageProgress = snapshot.disengageProgress.toFixed(3);
  gameShell.dataset.reengageCooldown = snapshot.reengageCooldown.toFixed(3);
  gameShell.dataset.primaryCrystalActivated = String(snapshot.primaryCrystalActivated);
  gameShell.dataset.secondaryCrystalActivated = String(snapshot.secondaryCrystalActivated);
  gameShell.dataset.crystalPathUnlocked = String(snapshot.crystalPathUnlocked);
  gameShell.dataset.healingSpringPhase = snapshot.healingSpringPhase;
  gameShell.dataset.healingSpringProgress = snapshot.healingSpringProgress.toFixed(3);
  gameShell.dataset.springCooldown = snapshot.springCooldown.toFixed(3);
  gameShell.dataset.spiritLampActivated = String(snapshot.spiritLampActivated);
  gameShell.dataset.stoneWedgeActivated = String(snapshot.stoneWedgeActivated);
  gameShell.dataset.depthsCentralGateOpened = String(snapshot.depthsCentralGateOpened);
  gameShell.dataset.velgranPhase = snapshot.velgran?.phase ?? "none";
  gameShell.dataset.velgranHp = String(snapshot.velgran?.hp ?? 0);
  gameShell.dataset.velgranArmor = String(snapshot.velgran?.armor ?? 0);
  gameShell.dataset.velgranAttack = snapshot.velgran?.attack ?? "none";
  gameShell.dataset.velgranMoving = String(snapshot.velgran?.moving ?? false);
  gameShell.dataset.velgranX = (snapshot.velgran?.pos.x ?? 0).toFixed(2);
  gameShell.dataset.velgranY = (snapshot.velgran?.pos.y ?? 0).toFixed(2);
  gameShell.dataset.velgranPhaseTime = (snapshot.velgran?.phaseTime ?? 0).toFixed(3);
  gameShell.dataset.velgranAttackTime = (snapshot.velgran?.attackTime ?? 0).toFixed(3);
  gameShell.dataset.velgranProjectileCount = String(snapshot.velgran?.crystalProjectiles.length ?? 0);
  gameShell.dataset.forestSealStoneObtained = String(snapshot.forestSealStoneObtained);
}

const spriteDebugCharacters = ["kyle", "nadi", "meru"] as const;

function syncSpriteDebugDataset(): void {
  for (const characterId of spriteDebugCharacters) {
    const state = renderer.getCharacterSpriteState(characterId);
    if (!state) continue;
    const datasetPrefix = `${characterId}Sprite`;
    gameShell.dataset[`${datasetPrefix}Status`] = state.status;
    gameShell.dataset[`${datasetPrefix}Direction`] = state.direction;
    gameShell.dataset[`${datasetPrefix}Pose`] = state.pose;
    gameShell.dataset[`${datasetPrefix}Frame`] = String(state.frame);
    gameShell.dataset[`${datasetPrefix}Action`] = state.actionKind ?? "none";
    gameShell.dataset[`${datasetPrefix}Sequence`] = String(state.sequenceId);
    gameShell.dataset[`${datasetPrefix}Sheet`] = state.sheet;
  }
}

function syncEnemySpriteDebugDataset(): void {
  if (!import.meta.env.DEV) return;
  for (const enemy of world.enemies) {
    const state = renderer.getEnemySpriteState(enemy.kind, enemy.id);
    const datasetPrefix = `enemy${enemy.id}Sprite`;
    gameShell.dataset[`${datasetPrefix}Armor`] = String(enemy.armor);
    gameShell.dataset[`${datasetPrefix}MaxArmor`] = String(enemy.maxArmor);
    gameShell.dataset[`${datasetPrefix}Presentation`] =
      enemy.kind === "iwaUroko" &&
        state?.status !== "ready"
        ? "fallback"
        : "sprite";
    if (!state) continue;
    gameShell.dataset[`${datasetPrefix}Status`] = state.status;
    gameShell.dataset[`${datasetPrefix}Direction`] = state.direction;
    gameShell.dataset[`${datasetPrefix}Clip`] = state.clip;
    gameShell.dataset[`${datasetPrefix}Frame`] = String(state.frame);
    gameShell.dataset[`${datasetPrefix}Action`] = state.action ?? "none";
    gameShell.dataset[`${datasetPrefix}Sheet`] = state.sheet ?? "base";
    gameShell.dataset[`${datasetPrefix}ActionStatus`] =
      state.actionStatus ?? "none";
    gameShell.dataset[`${datasetPrefix}AiState`] = enemy.aiState;
    gameShell.dataset[`${datasetPrefix}Telegraph`] = enemy.telegraph.toFixed(3);
  }
}

function syncEffectDebugDataset(): void {
  if (!import.meta.env.DEV) return;
  let bladeArcs = 0;
  let moonTrails = 0;
  let phosphorMotes = 0;
  let impactRings = 0;
  let leaves = 0;
  let sparks = 0;
  let dust = 0;
  for (const effect of world.effects.effects) {
    if (!effect.active) continue;
    if (effect.kind === "bladeArc") bladeArcs += 1;
    else if (effect.kind === "moonTrail") moonTrails += 1;
    else if (effect.kind === "phosphorMote") phosphorMotes += 1;
    else if (effect.kind === "impactRing") impactRings += 1;
    else if (effect.kind === "leaf") leaves += 1;
    else if (effect.kind === "spark") sparks += 1;
    else if (effect.kind === "dust") dust += 1;
  }
  gameShell.dataset.effectBladeArc = String(bladeArcs);
  gameShell.dataset.effectMoonTrail = String(moonTrails);
  gameShell.dataset.effectPhosphorMote = String(phosphorMotes);
  gameShell.dataset.effectImpactRing = String(impactRings);
  gameShell.dataset.effectLeaf = String(leaves);
  gameShell.dataset.effectSpark = String(sparks);
  gameShell.dataset.effectDust = String(dust);
  gameShell.dataset.effectSpawnCount = String(world.effects.spawnCount);
}

let spriteQaKey: string | null = null;
let spriteQaStartedAt: number | null = null;
let spriteQaCharacter: "kyle" | "nadi" | "meru" = "kyle";
let initialActiveQa: "kyle" | "nadi" | "meru" | null = null;
let spriteQaSwitchPressed = false;
let spriteQaNextSwitchAt = 0;
let autoHealQaPending = false;
let normalEffectQaMode:
  | "miss"
  | "hit"
  | "armor"
  | "multi"
  | "wall"
  | null = null;
let normalEffectQaPrepared = false;
let spriteQaFreezeAction:
  | "normal"
  | "special"
  | "ultimate"
  | "switch"
  | null = null;
let spriteQaFreezeFrame: number | null = null;
let normalEffectQaFreeze:
  | "blade"
  | "spark"
  | "dust"
  | "moon"
  | "mote"
  | "meruHit"
  | null = null;
let attackQaMode:
  | "single"
  | "hold"
  | "move"
  | "special"
  | "ultimate"
  | "normalThenSpecial"
  | null = null;
let attackQaStartedAt: number | null = null;
let enemySpriteQaDirection:
  | "down"
  | "up"
  | "left"
  | "right"
  | null = null;
let enemySpriteQaClip: "idle" | "move" = "idle";
let enemySpriteQaKind: EnemyKind = "utsurobou";
let enemySpriteQaArmor: "intact" | "broken" = "intact";
let enemyActionQa: string | null = null;
let enemyActionQaPhase: EnemyActionSpritePhase | null = null;
let enemyActionQaFrame: number | null = null;

function clipDuration(clip: EnemySpriteClipConfig): number {
  return clip.frameDurationsSeconds.reduce(
    (sum, duration) => sum + duration,
    0,
  );
}

function qaFrameTime(
  clip: EnemySpriteClipConfig,
  frameWithinDirection: number,
): number | null {
  const index = clip.framesWithinDirection.indexOf(frameWithinDirection);
  if (index < 0) return null;
  return clip.frameDurationsSeconds
    .slice(0, index)
    .reduce((sum, duration) => sum + duration, 0) + 0.001;
}

function applySpriteQaFacing(): void {
  if (!import.meta.env.DEV || !spriteQaKey) return;
  const facing = spriteQaKey === "ArrowDown"
    ? { x: 0, y: 1 }
    : spriteQaKey === "ArrowUp"
      ? { x: 0, y: -1 }
      : spriteQaKey === "ArrowLeft"
        ? { x: -1, y: 0 }
        : { x: 1, y: 0 };
  const member = world.party.find(
    (candidate) => candidate.id === spriteQaCharacter,
  );
  if (member) member.facing = facing;
}

function applyEnemySpriteQa(): void {
  if (!import.meta.env.DEV || !enemySpriteQaDirection) return;
  const facing = enemySpriteQaDirection === "down"
    ? { x: 0, y: 1 }
    : enemySpriteQaDirection === "up"
      ? { x: 0, y: -1 }
      : enemySpriteQaDirection === "left"
        ? { x: -1, y: 0 }
        : { x: 1, y: 0 };
  let qaEnemy = world.enemies.find(
    (enemy) => enemy.kind === enemySpriteQaKind,
  );
  if (!qaEnemy) {
    qaEnemy = createEnemy(
      world.enemies[0]?.id ?? 1,
      enemySpriteQaKind,
      470,
      190,
    );
    world.enemies[0] = qaEnemy;
  }
  for (const enemy of world.enemies) {
    enemy.alive = enemy === qaEnemy;
  }
  qaEnemy.pos = { x: 470, y: 190 };
  qaEnemy.idleAnchor = { ...qaEnemy.pos };
  qaEnemy.idleTarget = { ...qaEnemy.pos };
  qaEnemy.reservedPos = { ...qaEnemy.pos };
  qaEnemy.facing = facing;
  qaEnemy.attackDirection = facing;
  qaEnemy.velocity = { x: 0, y: 0 };
  qaEnemy.knockback = { x: 0, y: 0 };
  const actionConfig = enemyActionQa
    ? ENEMY_SPRITE_CONFIGS[qaEnemy.kind]?.actions[enemyActionQa]
    : undefined;
  if (actionConfig) {
    const phases: readonly EnemyActionSpritePhase[] = [
      "windup",
      "attack",
      "recover",
    ];
    let phase = enemyActionQaPhase;
    if (!phase && enemyActionQaFrame !== null) {
      phase = phases.find((candidate) =>
        actionConfig.phases[candidate].framesWithinDirection.includes(
          enemyActionQaFrame as number,
        )
      ) ?? null;
    }
    let stateAge = 0;
    if (phase) {
      const phaseClip = actionConfig.phases[phase];
      stateAge = enemyActionQaFrame === null
        ? world.time % clipDuration(phaseClip)
        : qaFrameTime(phaseClip, enemyActionQaFrame) ?? 0;
    } else {
      const totalDuration = phases.reduce(
        (sum, candidate) =>
          sum + clipDuration(actionConfig.phases[candidate]),
        0,
      );
      let actionTime = world.time % totalDuration;
      phase = "recover";
      for (const candidate of phases) {
        const duration = clipDuration(actionConfig.phases[candidate]);
        if (actionTime < duration) {
          phase = candidate;
          stateAge = actionTime;
          break;
        }
        actionTime -= duration;
      }
    }
    qaEnemy.aiState = phase;
    qaEnemy.stateAge = stateAge;
    qaEnemy.stateTimer = 999;
    qaEnemy.attackConnected = true;
    qaEnemy.telegraph = phase === "windup"
      ? Math.max(0, clipDuration(actionConfig.phases.windup) - stateAge)
      : 0;
    qaEnemy.telegraphDuration = clipDuration(
      actionConfig.phases.windup,
    );
    gameShell.dataset.enemyActionQa = actionConfig.action;
    gameShell.dataset.enemyActionQaPhase = phase;
    gameShell.dataset.enemyActionQaFrame = String(
      enemyActionQaFrame ?? "",
    );
  } else {
    qaEnemy.aiState = enemySpriteQaClip === "move"
      ? "approach"
      : "notice";
    qaEnemy.stateAge = 0;
    qaEnemy.stateTimer = 999;
    qaEnemy.telegraph = 0;
  }
  qaEnemy.aware = false;
  if (qaEnemy.kind === "iwaUroko") {
    qaEnemy.armor =
      enemySpriteQaArmor === "broken" ? 0 : qaEnemy.maxArmor;
  }
  gameShell.dataset.enemySpriteQaKind = qaEnemy.kind;
  gameShell.dataset.enemySpriteQaArmor = String(qaEnemy.armor);
}

if (import.meta.env.DEV) {
  const initialActiveQaParam = searchParams.get("initialActiveQa");
  if (
    initialActiveQaParam === "kyle" ||
    initialActiveQaParam === "nadi" ||
    initialActiveQaParam === "meru"
  ) {
    initialActiveQa = initialActiveQaParam;
    world.activeId = initialActiveQa;
  }
  const layoutQa = searchParams.get("layoutQa");
  const layoutQaKeys =
    layoutQa === "top-left"
      ? ["ArrowLeft", "ArrowUp"]
      : layoutQa === "bottom-right"
        ? ["ArrowRight", "ArrowDown"]
        : [];
  for (const code of layoutQaKeys) input.buffer.setKey(code, true);

  const spriteQa = searchParams.get("spriteQa");
  const spriteQaKeys: Record<string, string> = {
    down: "ArrowDown",
    up: "ArrowUp",
    left: "ArrowLeft",
    right: "ArrowRight",
  };
  spriteQaKey = spriteQa ? spriteQaKeys[spriteQa] ?? null : null;
  const spriteQaCharacterParam = searchParams.get("spriteQaCharacter");
  spriteQaCharacter =
    spriteQaCharacterParam === "nadi" || spriteQaCharacterParam === "meru"
      ? spriteQaCharacterParam
      : "kyle";
  applySpriteQaFacing();
  autoHealQaPending = searchParams.get("autoHealQa") === "1";
  const normalEffectQa = searchParams.get("effectQa");
  normalEffectQaMode =
    normalEffectQa === "miss" ||
    normalEffectQa === "hit" ||
    normalEffectQa === "armor" ||
    normalEffectQa === "multi" ||
    normalEffectQa === "wall"
      ? normalEffectQa
      : null;
  const freezeSpriteActionQa = searchParams.get("freezeSpriteAction");
  spriteQaFreezeAction =
    freezeSpriteActionQa === "normal" ||
    freezeSpriteActionQa === "special" ||
    freezeSpriteActionQa === "ultimate" ||
    freezeSpriteActionQa === "switch"
      ? freezeSpriteActionQa
      : null;
  const freezeSpriteFrameParam = searchParams.get("freezeSpriteFrame");
  const freezeSpriteFrameQa = freezeSpriteFrameParam === null
    ? Number.NaN
    : Number(freezeSpriteFrameParam);
  spriteQaFreezeFrame = Number.isInteger(freezeSpriteFrameQa)
    ? freezeSpriteFrameQa
    : null;
  const freezeEffectQa = searchParams.get("freezeQa");
  normalEffectQaFreeze =
    freezeEffectQa === "blade" ||
    freezeEffectQa === "spark" ||
    freezeEffectQa === "dust" ||
    freezeEffectQa === "moon" ||
    freezeEffectQa === "mote" ||
    freezeEffectQa === "meruHit"
      ? freezeEffectQa
      : null;
  const attackQa =
    searchParams.get("actionQa") ?? searchParams.get("attackQa");
  attackQaMode =
    attackQa === "single" ||
    attackQa === "hold" ||
    attackQa === "move" ||
    attackQa === "special" ||
    attackQa === "ultimate" ||
    attackQa === "normalThenSpecial"
      ? attackQa
      : null;
  const enemySpriteQa = searchParams.get("enemySpriteQa");
  enemySpriteQaDirection =
    enemySpriteQa === "down" ||
    enemySpriteQa === "up" ||
    enemySpriteQa === "left" ||
    enemySpriteQa === "right"
      ? enemySpriteQa
      : null;
  enemySpriteQaClip =
    searchParams.get("enemySpriteQaClip") === "move"
      ? "move"
      : "idle";
  const enemySpriteQaArmorParam =
    searchParams.get("enemySpriteQaArmor") ?? searchParams.get("armor");
  enemySpriteQaArmor =
    enemySpriteQaArmorParam === "0" ? "broken" : "intact";
  const enemySpriteQaKindParam = searchParams.get("enemySpriteQaKind");
  if (
    enemySpriteQaKindParam &&
    Object.prototype.hasOwnProperty.call(
      ENEMY_SPRITE_CONFIGS,
      enemySpriteQaKindParam,
    )
  ) {
    enemySpriteQaKind = enemySpriteQaKindParam as EnemyKind;
  }
  const enemyActionQaParam = searchParams.get("enemyActionQa");
  if (
    enemyActionQaParam &&
    ENEMY_SPRITE_CONFIGS[enemySpriteQaKind]?.actions[enemyActionQaParam]
  ) {
    enemyActionQa = enemyActionQaParam;
    enemySpriteQaDirection ??= "down";
  }
  const enemyActionQaPhaseParam = searchParams.get("enemyActionQaPhase");
  enemyActionQaPhase =
    enemyActionQaPhaseParam === "windup" ||
      enemyActionQaPhaseParam === "attack" ||
      enemyActionQaPhaseParam === "recover"
      ? enemyActionQaPhaseParam
      : null;
  const enemyActionQaFrameParam = Number(
    searchParams.get("enemyActionQaFrame"),
  );
  enemyActionQaFrame =
    Number.isInteger(enemyActionQaFrameParam) &&
      enemyActionQaFrameParam >= 0 &&
      enemyActionQaFrameParam <= 5 &&
      searchParams.has("enemyActionQaFrame")
      ? enemyActionQaFrameParam
      : null;
  if (spriteQaKey) input.buffer.setKey(spriteQaKey, true);
}

input.bindTouch({
  zone: requireElement<HTMLElement>("#stick-zone"),
  stick: requireElement<HTMLElement>("#touch-stick"),
  actionButtons: document.querySelectorAll<HTMLButtonElement>("[data-touch-action]"),
});

const audioControls = new AudioControls(
  {
    toggle: requireElement<HTMLButtonElement>("#audio-toggle"),
    pauseSettings: requireElement<HTMLElement>("#audio-settings"),
    track: requireElement<HTMLElement>("#audio-track"),
    pauseMusicMute: requireElement<HTMLButtonElement>("#pause-audio-mute"),
    musicVolume: requireElement<HTMLInputElement>("#bgm-volume"),
    musicVolumeValue: requireElement<HTMLOutputElement>("#bgm-volume-value"),
    pauseSfxMute: requireElement<HTMLButtonElement>("#pause-sfx-mute"),
    sfxVolume: requireElement<HTMLInputElement>("#sfx-volume"),
    sfxVolumeValue: requireElement<HTMLOutputElement>("#sfx-volume-value"),
    unlockHint: requireElement<HTMLElement>("#audio-unlock-hint"),
  },
  audio,
  window,
);

const desktopHud = new DesktopHudController(
  {
    shell: gameShell,
    area: requireElement<HTMLElement>("#hud-area-name"),
    encounter: requireElement<HTMLElement>("#hud-encounter"),
    trial: requireElement<HTMLElement>("#hud-trial"),
    enemies: requireElement<HTMLElement>("#hud-enemies"),
    pause: requireElement<HTMLButtonElement>("#pause-toggle"),
    pauseLabel: requireElement<HTMLElement>("#pause-toggle-label"),
    partyRows:
      document.querySelectorAll<HTMLElement>("[data-party-id]"),
    actionSlots:
      document.querySelectorAll<HTMLElement>("[data-action-slot]"),
  },
  world,
  canvas,
);

const statusPanel = new StatusPanelController(
  {
    root: requireElement<HTMLElement>("#status-panel"),
    name: requireElement<HTMLElement>("#status-name"),
    health: requireElement<HTMLElement>("#status-health"),
    mana: requireElement<HTMLElement>("#status-mana"),
    tech: requireElement<HTMLElement>("#status-tech"),
    techFill: requireElement<HTMLElement>("#status-tech-fill"),
    abilities: requireElement<HTMLElement>("#status-abilities"),
    close: requireElement<HTMLButtonElement>("#status-close"),
    faces: document.querySelectorAll<HTMLElement>("[data-party-id]"),
  },
  world,
  canvas,
  () => input.buffer.releaseAll(),
);

const layerEntry = requireElement<HTMLElement>("#layer-entry");
const layerEntryKicker = requireElement<HTMLElement>("#layer-entry span");
const layerEntryTitle = requireElement<HTMLElement>("#layer-entry strong");
const layerEntryCopy: Partial<Record<RoomId, { kicker: string; title: string }>> = {
  ancientForest: { kicker: "序章", title: "古の森" },
  mossRootRuins: { kicker: "第一層", title: "苔根の遺構" },
  lightwingCrystalCavern: { kicker: "第二層", title: "光羽の晶洞" },
  spiritClothStonescaleDepths: { kicker: "第三層", title: "霊布と石鱗の深層" },
  crystalAltar: { kicker: "守護者戦", title: "森晶の祭壇" },
};
let lastLayerEntryRoom: RoomId | null = null;
let layerEntryTimer: number | null = null;
let layerEntryGeneration = 0;
function hideLayerEntry(): void {
  if (layerEntryTimer !== null) window.clearTimeout(layerEntryTimer);
  layerEntryTimer = null;
  layerEntryGeneration += 1;
  layerEntry.classList.remove("is-active");
  layerEntry.hidden = true;
}
function syncLayerEntry(snapshot: WorldSnapshot): void {
  if (world.chapterReturnActive || world.revisitReturnActive || world.titleReturnPending) { hideLayerEntry(); lastLayerEntryRoom = world.roomId; return; }
  if (world.caveGuidePending) { hideLayerEntry(); return; }
  if (world.phase === "intro" || world.phase === "gameover") lastLayerEntryRoom = null;
  if (snapshot.roomTransitionOpacity > 0) {
    if (!layerEntry.hidden) hideLayerEntry();
    return;
  }
  const roomId = world.roomId;
  const copy = roomId ? layerEntryCopy[roomId] : undefined;
  if (world.phase !== "playing" || !copy || roomId === lastLayerEntryRoom) return;
  lastLayerEntryRoom = roomId;
  hideLayerEntry();
  layerEntryKicker.textContent = copy.kicker;
  layerEntryTitle.textContent = copy.title;
  layerEntry.hidden = false;
  void layerEntry.offsetWidth;
  layerEntry.classList.add("is-active");
  sfx.play("switchCommon");
  if (roomId === "mossRootRuins" && world.layer1AnomalyPending) {
    caveEntryTitle.begin();
    return;
  }
  const generation = ++layerEntryGeneration;
  layerEntryTimer = window.setTimeout(() => {
    if (generation === layerEntryGeneration) hideLayerEntry();
  }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 400 : 5200);
}
const layer1Anomaly = new Layer1AnomalyController(requireElement<HTMLElement>("#layer1-anomaly"), world,
  () => input.buffer.releaseAll(), canvas, () => caveEntryTitle.blocking);
const caveEntryTitle = new CaveEntryTitleController(requireElement<HTMLElement>("#cave-entry-story"), layerEntry,
  () => input.buffer.releaseAll(), hideLayerEntry, () => layer1Anomaly.skipPresentation(), canvas);
const fieldMessages = new FieldMessages(requireElement<HTMLElement>("#field-banner"),
  requireElement<HTMLElement>(".field-shell"), requireElement<HTMLElement>(".party-panel"), requireElement<HTMLElement>(".top-info-bar"), world.effects.effects,
  () => { canvas.focus(); input.buffer.setTouchAction("interact", true); input.buffer.setTouchAction("interact", false); });

const controlsHelp = requireElement<HTMLButtonElement>("#controls-help");
const caveGuide = new CaveGuideController(requireElement<HTMLElement>("#cave-guide"), world,
  () => input.buffer.releaseAll(), canvas, controlsHelp, requireElement<HTMLElement>(".page-shell"),
  requireElement<HTMLButtonElement>("#status-controls-help"), () => statusPanel.isOpen);
const chapterCinematic = new ChapterCinematicController(requireElement<HTMLElement>("#chapter-cinematic"), world,
  requireElement<HTMLElement>(".page-shell"), () => input.buffer.releaseAll(), canvas);

const forestReturnCinematic = new ChapterCinematicController(requireElement<HTMLElement>("#forest-return-cinematic"), world,
  requireElement<HTMLElement>(".page-shell"), () => input.buffer.releaseAll(), canvas, {
    scenes: FOREST_RETURN_SCENES, artwork: FOREST_RETURN_ART, label: "古の森へ", lastAction: "森へ戻る", calm: true,
    active: () => world.chapterReturnActive, ready: () => world.forestReturnCinematicPending,
    complete: () => { world.completeForestReturnCinematic(); },
  });
const titleReturn = new TitleReturnController(requireElement<HTMLElement>("#title-return-fade"), world, () => input.buffer.releaseAll());
const velgranReturnChoice = new VelgranReturnChoiceController(requireElement<HTMLElement>("#velgran-return-choice"), world,
  requireElement<HTMLElement>(".page-shell"), () => input.buffer.releaseAll(), canvas);

const showSfxSoundboard =
  import.meta.env.DEV &&
  searchParams.get("sfxDebug") === "1";
const soundboard = showSfxSoundboard
  ? new SfxSoundboard(
      {
        root: requireElement<HTMLElement>("#sfx-soundboard"),
        controls: requireElement<HTMLElement>("#sfx-board-controls"),
        buttons: requireElement<HTMLElement>("#sfx-board-buttons"),
        status: requireElement<HTMLElement>("#sfx-board-status"),
        collapse: requireElement<HTMLButtonElement>("#sfx-board-collapse"),
      },
      audio,
      sfx,
    )
  : null;

const overlay = new OverlayController(
  {
    root: requireElement<HTMLElement>("#screen-overlay"),
    kicker: requireElement<HTMLElement>("#overlay-kicker"),
    title: requireElement<HTMLElement>("#overlay-title"),
    copy: requireElement<HTMLElement>("#overlay-copy"),
    action: requireElement<HTMLButtonElement>("#overlay-action"),
    hint: requireElement<HTMLElement>("#overlay-hint"),
  },
  world,
  canvas,
  (phase) => {
    audioControls.setPauseSettingsVisible(phase === "paused");
  },
);

if (import.meta.env.DEV && searchParams.get("autoStartQa") === "1") {
  world.confirm();
  if (
    landmarkQa === "crystal-near" || landmarkQa === "crystal-touch" ||
    landmarkQa === "root-gate-closed" || landmarkQa === "root-gate-open"
  ) world.setMossRootLandmarkForQa(landmarkQa);
  if (initialActiveQa) world.activeId = initialActiveQa;
  applySpriteQaFacing();
  if (
    searchParams.get("switchQa") === "1" &&
    world.activeId !== spriteQaCharacter
  ) {
    world.switchCharacter(true);
  }
}

let devSelectorCleanup: (() => void) | undefined;
const opening = shouldShowOpening(gameMode,
  import.meta.env.DEV && (Boolean(stageQaRoom) || searchParams.has("autoStartQa")),
) ? new OpeningController({
  root: requireElement<HTMLElement>("#opening"),
  game: requireElement<HTMLElement>(".page-shell"),
  audio,
  onComplete: () => {
    input.buffer.releaseAll();
    world.confirm();
    world.banner = "";
    world.bannerTimer = 0;
    overlay.sync(true);
    canvas.focus();
  },
  onDevWarp: import.meta.env.DEV ? (onSelected, onCancel) => {
    devSelectorCleanup = mountDevLayerSelector(() => {
      onSelected();
      input.buffer.releaseAll();
      overlay.sync(true);
      canvas.focus();
    }, onCancel);
  } : undefined,
}) : null;
if (!opening) delete document.body.dataset.opening;

canvas.addEventListener("pointerdown", (event) => {
  if (world.inputLocked || caveGuide.blocking) return;
  if (statusPanel.isOpen) return;
  canvas.focus();
  if (event.pointerType !== "mouse") document.body.dataset.input = "touch";
  const snapshot = world.snapshot;
  if (world.phase === "playing" && snapshot.partyPresence === "solo" && !snapshot.dialogue) {
    const bounds = canvas.getBoundingClientRect();
    const worldX = (event.clientX - bounds.left) * canvas.width / bounds.width + snapshot.camera.x;
    const worldY = (event.clientY - bounds.top) * canvas.height / bounds.height + snapshot.camera.y;
    const actor = world.active;
    if (Math.abs(worldX - actor.pos.x) <= 20 && worldY >= actor.pos.y - 42 && worldY <= actor.pos.y + 6) {
      statusPanel.toggle(actor.id);
      return;
    }
  }
  if (!snapshot.dialogue && !snapshot.interactionPrompt) return;
  // A click advances dialogue or uses a nearby landmark, never both.
  input.buffer.setTouchAction("interact", true);
  input.buffer.setTouchAction("interact", false);
});

let previousTime = performance.now();
let frameRequest = 0;

function frame(now: number): void {
  const delta = Math.min(0.05, Math.max(0, (now - previousTime) / 1000));
  previousTime = now;
  if (opening?.blocking) {
    input.buffer.releaseAll();
    opening.update(delta);
    frameRequest = requestAnimationFrame(frame);
    return;
  }
  if (autoHealQaPending && world.phase === "playing") {
    world.damageCharacter("kyle", 90, { x: 0, y: 0 }, true);
    autoHealQaPending = false;
  }
  if (spriteQaKey && world.phase === "playing") {
    if (world.activeId !== spriteQaCharacter) {
      if (spriteQaSwitchPressed) {
        input.buffer.setKey("Space", false);
        spriteQaSwitchPressed = false;
        spriteQaNextSwitchAt = now + 520;
      } else if (now >= spriteQaNextSwitchAt) {
        input.buffer.setKey("Space", true);
        spriteQaSwitchPressed = true;
      }
    } else {
      if (spriteQaSwitchPressed) input.buffer.setKey("Space", false);
      spriteQaStartedAt ??= now;
      const spriteQaDuration = attackQaMode === "move" ? 1_200 : 720;
      if (now - spriteQaStartedAt >= spriteQaDuration) {
        input.buffer.setKey(spriteQaKey, false);
        spriteQaKey = null;
      }
    }
  }
  if (
    import.meta.env.DEV &&
    normalEffectQaMode &&
    !normalEffectQaPrepared &&
    !spriteQaKey &&
    world.phase === "playing" &&
    world.activeId === spriteQaCharacter
  ) {
    world.effects.clear();
    for (const member of world.party) {
      if (member.id !== world.activeId) member.cooldowns.normal = 999;
    }
    if (normalEffectQaMode === "miss") {
      const away = {
        x: world.active.pos.x - world.active.facing.x * 220,
        y: world.active.pos.y - world.active.facing.y * 220,
      };
      const perpendicularFacing = {
        x: -world.active.facing.y,
        y: world.active.facing.x,
      };
      for (const [index, enemy] of world.enemies.entries()) {
        const spread = (index - 1) * 34;
        const enemyPosition = {
          x: Math.min(
            VIEW.arena.right - enemy.radius,
            Math.max(
              VIEW.arena.left + enemy.radius,
              away.x + perpendicularFacing.x * spread,
            ),
          ),
          y: Math.min(
            VIEW.arena.bottom - enemy.radius,
            Math.max(
              VIEW.arena.top + enemy.radius,
              away.y + perpendicularFacing.y * spread,
            ),
          ),
        };
        enemy.alive = true;
        enemy.hp = enemy.maxHp;
        enemy.pos = enemyPosition;
        enemy.idleAnchor = { ...enemyPosition };
        enemy.idleTarget = { ...enemyPosition };
        enemy.velocity = { x: 0, y: 0 };
        enemy.knockback = { x: 0, y: 0 };
        enemy.aiState = "idle";
        enemy.aware = false;
      }
    } else if (normalEffectQaMode === "wall") {
      for (const enemy of world.enemies) enemy.alive = false;
      const { active } = world;
      const wallGap = 5;
      if (Math.abs(active.facing.x) >= Math.abs(active.facing.y)) {
        active.pos.x = active.facing.x >= 0
          ? VIEW.arena.right - active.radius - wallGap
          : VIEW.arena.left + active.radius + wallGap;
      } else {
        active.pos.y = active.facing.y >= 0
          ? VIEW.arena.bottom - active.radius - wallGap
          : VIEW.arena.top + active.radius + wallGap;
      }
      active.velocity = { x: 0, y: 0 };
    } else if (normalEffectQaMode === "multi") {
      const targets = world.enemies.slice(0, 2);
      for (const enemy of world.enemies) enemy.alive = targets.includes(enemy);
      const perpendicularFacing = {
        x: -world.active.facing.y,
        y: world.active.facing.x,
      };
      const targetPositions = [
        {
          x: world.active.pos.x + world.active.facing.x * 32,
          y: world.active.pos.y + world.active.facing.y * 32,
        },
        {
          x: world.active.pos.x + perpendicularFacing.x * 32,
          y: world.active.pos.y + perpendicularFacing.y * 32,
        },
      ];
      for (const [index, target] of targets.entries()) {
        const targetPosition = targetPositions[index];
        if (!targetPosition) continue;
        target.hp = target.maxHp;
        target.armor = 0;
        target.pos = targetPosition;
        target.idleAnchor = { ...targetPosition };
        target.idleTarget = { ...targetPosition };
        target.velocity = { x: 0, y: 0 };
        target.knockback = { x: 0, y: 0 };
        target.aiState = "idle";
        target.aware = false;
      }
    } else {
      const target = normalEffectQaMode === "armor"
        ? world.enemies.find((enemy) => enemy.kind === "iwaUroko")
        : world.enemies.find((enemy) => enemy.kind === "mossPlun") ??
          world.enemies[0];
      if (target) {
        for (const enemy of world.enemies) enemy.alive = enemy === target;
        target.hp = target.maxHp;
        target.armor =
          normalEffectQaMode === "armor" ? target.maxArmor : 0;
        const targetDistance = attackQaMode === "special"
          ? world.activeId === "kyle"
            ? 72
            : 32
          : 30;
        target.pos = {
          x: world.active.pos.x + world.active.facing.x * targetDistance,
          y: world.active.pos.y + world.active.facing.y * targetDistance,
        };
        target.idleAnchor = { ...target.pos };
        target.idleTarget = { ...target.pos };
        target.velocity = { x: 0, y: 0 };
        target.knockback = { x: 0, y: 0 };
        target.aiState = "idle";
        target.aware = false;
      }
    }
    if (attackQaMode === "special") {
      gameShell.dataset.qaActionOriginX = world.active.pos.x.toFixed(2);
      gameShell.dataset.qaActionOriginY = world.active.pos.y.toFixed(2);
      const qaTarget = world.enemies.find((enemy) => enemy.alive);
      gameShell.dataset.qaTargetId = qaTarget ? String(qaTarget.id) : "";
      gameShell.dataset.qaTargetHp = qaTarget?.hp.toFixed(2) ?? "";
      gameShell.dataset.qaTargetArmor = qaTarget?.armor.toFixed(2) ?? "";
      const qaTargets =
        normalEffectQaMode === "miss" || normalEffectQaMode === "wall"
          ? []
          : world.enemies.filter((enemy) => enemy.alive);
      gameShell.dataset.qaTargetIds = qaTargets
        .map((target) => target.id)
        .join(",");
      gameShell.dataset.qaTargetCount = String(qaTargets.length);
      gameShell.dataset.qaTargetTotalHp = qaTargets
        .reduce((sum, target) => sum + target.hp, 0)
        .toFixed(2);
      gameShell.dataset.qaTargetTotalArmor = qaTargets
        .reduce((sum, target) => sum + target.armor, 0)
        .toFixed(2);
    }
    normalEffectQaPrepared = true;
  }
  if (
    attackQaMode &&
    (attackQaMode === "move" || !spriteQaKey) &&
    world.phase === "playing"
  ) {
    attackQaStartedAt ??= now;
    const attackQaDelay = attackQaMode === "move" ? 800 : 0;
    const attackQaElapsed = now - attackQaStartedAt - attackQaDelay;
    if (attackQaMode === "normalThenSpecial") {
      if (attackQaElapsed < 70) {
        input.buffer.setKey("KeyJ", true);
        input.buffer.setKey("KeyK", false);
      } else if (attackQaElapsed < 95) {
        input.buffer.setKey("KeyJ", false);
        input.buffer.setKey("KeyK", false);
      } else if (attackQaElapsed < 165) {
        input.buffer.setKey("KeyJ", false);
        input.buffer.setKey("KeyK", true);
      } else {
        input.buffer.setKey("KeyJ", false);
        input.buffer.setKey("KeyK", false);
        attackQaMode = null;
      }
    } else {
      const attackQaDuration = attackQaMode === "hold" ? 1_200 : 70;
      const attackQaKey = attackQaMode === "special"
        ? "KeyK"
        : attackQaMode === "ultimate"
          ? "KeyL"
          : "KeyJ";
      if (attackQaElapsed < 0) {
        input.buffer.setKey(attackQaKey, false);
      } else if (attackQaElapsed < attackQaDuration) {
        input.buffer.setKey(attackQaKey, true);
      } else {
        input.buffer.setKey(attackQaKey, false);
        attackQaMode = null;
      }
    }
  }
  const controls = input.consumeFrame();
  let statusInputConsumed = false;
  if (controls.pressed.has("status") && world.phase === "playing" && !world.inputLocked && !caveGuide.blocking) {
    statusPanel.toggle(world.activeId);
    statusInputConsumed = true;
  } else if (statusPanel.isOpen && controls.pressed.has("pause")) {
    statusPanel.close();
    statusInputConsumed = true;
  }
  if (!statusPanel.isOpen && !statusInputConsumed && !caveGuide.blocking) world.update(delta, controls);
  caveGuide.update(delta);
  chapterCinematic.update(delta);
  forestReturnCinematic.update(delta);
  titleReturn.update(delta);
  velgranReturnChoice.update();
  caveEntryTitle.update(delta);
  layer1Anomaly.update(delta, !layerEntry.hidden);
  if (world.inputLocked || caveGuide.blocking) input.buffer.releaseAll();
  if (statusPanel.isOpen && world.phase !== "playing") statusPanel.close();
  applyEnemySpriteQa();
  if (
    import.meta.env.DEV &&
    (searchParams.get("actionQa") ?? searchParams.get("attackQa")) ===
      "normalThenSpecial"
  ) {
    if (world.active.actionKind === "normal") {
      gameShell.dataset.qaSawNormalSequence = String(
        world.active.actionSequenceId,
      );
    }
    if (
      world.active.actionKind === "special" &&
      gameShell.dataset.qaSawNormalSequence
    ) {
      gameShell.dataset.qaSawSpecialSequence = String(
        world.active.actionSequenceId,
      );
    }
  }
  audio.setMusicTrack(world.musicScene, {
    fadeOut: 0.35,
    fadeIn: 0.55,
    restart: true,
  });
  audio.syncGamePhase(world.phase);
  sfx.syncGamePhase(world.phase);
  gameAudio.dispatch(world.drainAudioEvents());
  const snapshot = world.snapshot;
  desktopHud.render(snapshot);
  statusPanel.render(snapshot);
  renderer.render(layer1Anomaly.presentation(snapshot), layer1Anomaly.visual);
  overlay.sync();
  syncLayerEntry(snapshot);
  gameShell.dataset.caveEntryStory = String(caveEntryTitle.blocking);
  const presentationBlocked = world.inputLocked || caveGuide.blocking;
  gameGestures.update(world.phase === "playing" && !snapshot.dialogue && !statusPanel.isOpen && !presentationBlocked);
  if (presentationBlocked) requireElement<HTMLButtonElement>("#pause-toggle").disabled = true;
  controlsHelp.hidden = world.phase !== "paused" || presentationBlocked;
  requireElement<HTMLElement>("#screen-overlay").hidden = caveGuide.blocking || chapterCinematic.blocking || forestReturnCinematic.blocking || world.titleReturnPending;
  fieldMessages.render(snapshot, !layerEntry.hidden || presentationBlocked || statusPanel.isOpen);
  gameShell.dataset.phase = world.phase;
  gameShell.dataset.gameMode = world.mode;
  gameShell.dataset.partyPresence = world.partyPresence;
  gameShell.dataset.stageId = world.stageId ?? "";
  gameShell.dataset.roomId = world.roomId ?? "";
  gameShell.dataset.roomName = world.roomName ?? "";
  gameShell.dataset.stageEncounter = world.stageEncounter ?? "";
  syncStageDataset();
  gameShell.dataset.northGateUnlocked = String(world.northGateUnlocked);
  gameShell.dataset.active = world.activeId;
  gameShell.dataset.activeX = world.active.pos.x.toFixed(1);
  gameShell.dataset.activeY = world.active.pos.y.toFixed(1);
  if (import.meta.env.DEV && gameShell.dataset.qaActionOriginX) {
    const originX = Number(gameShell.dataset.qaActionOriginX);
    const originY = Number(gameShell.dataset.qaActionOriginY);
    gameShell.dataset.qaActionTravel = Math.hypot(
      world.active.pos.x - originX,
      world.active.pos.y - originY,
    ).toFixed(2);
    const targetId = Number(gameShell.dataset.qaTargetId);
    const target = world.enemies.find((enemy) => enemy.id === targetId);
    gameShell.dataset.qaTargetCurrentHp = target?.hp.toFixed(2) ?? "";
    gameShell.dataset.qaTargetCurrentArmor = target?.armor.toFixed(2) ?? "";
    const targetIds = gameShell.dataset.qaTargetIds
      ?.split(",")
      .map(Number)
      .filter(Number.isFinite) ?? [];
    const targets = world.enemies.filter((enemy) =>
      targetIds.includes(enemy.id)
    );
    gameShell.dataset.qaTargetCurrentTotalHp = targets
      .reduce((sum, enemy) => sum + enemy.hp, 0)
      .toFixed(2);
    gameShell.dataset.qaTargetCurrentTotalArmor = targets
      .reduce((sum, enemy) => sum + enemy.armor, 0)
      .toFixed(2);
  }
  gameShell.dataset.enemies = String(
    world.enemies.filter((enemy) => enemy.alive).length,
  );
  gameShell.dataset.exp = String(world.exp);
  const audioState = audio.state;
  gameShell.dataset.audioPlaying = String(audioState.playing);
  gameShell.dataset.musicTrack = audioState.musicTrack;
  gameShell.dataset.audioUnlocked = String(audioState.unlocked);
  gameShell.dataset.audioMuted = String(audioState.muted);
  gameShell.dataset.audioVolume = String(audioState.musicVolume);
  gameShell.dataset.audioSfxMuted = String(audioState.sfxMuted);
  gameShell.dataset.audioSfxVolume = String(audioState.sfxVolume);
  gameShell.dataset.audioContext = audioState.audioContextState;
  gameShell.dataset.audioDuck = audioState.musicDuckGain.toFixed(3);
  gameShell.dataset.audioTime = audioState.currentTime.toFixed(2);
  gameShell.dataset.audioError = audioState.errorMessage ?? "";
  const sfxState = sfx.debugState;
  gameShell.dataset.audioLastSfx = sfxState.lastCue ?? "";
  gameShell.dataset.audioActiveSources = String(sfxState.activeSources);
  syncSpriteDebugDataset();
  syncEnemySpriteDebugDataset();
  syncEffectDebugDataset();
  if (
    import.meta.env.DEV &&
    spriteQaFreezeAction &&
    spriteQaFreezeFrame !== null
  ) {
    const spriteState = renderer.getCharacterSpriteState(spriteQaCharacter);
    if (
      spriteState?.sheet === "action" &&
      spriteState.actionKind === spriteQaFreezeAction &&
      spriteState.frame === spriteQaFreezeFrame
    ) {
      gameShell.dataset.qaFrozen = "true";
      return;
    }
  }
  if (import.meta.env.DEV && normalEffectQaFreeze) {
    let hasTargetEffect = false;
    let hasImpactRing = false;
    let phosphorMoteCount = 0;
    const targetKind =
      normalEffectQaFreeze === "blade"
        ? "bladeArc"
        : normalEffectQaFreeze === "spark"
          ? "spark"
          : normalEffectQaFreeze === "dust"
            ? "dust"
            : normalEffectQaFreeze === "moon"
              ? "moonTrail"
              : "phosphorMote";
    for (const effect of world.effects.effects) {
      if (!effect.active) continue;
      if (effect.kind === targetKind) hasTargetEffect = true;
      if (effect.kind === "impactRing") hasImpactRing = true;
      if (effect.kind === "phosphorMote") phosphorMoteCount += 1;
    }
    const shouldFreeze =
      normalEffectQaFreeze === "meruHit"
        ? hasImpactRing && phosphorMoteCount >= 6
        : hasTargetEffect;
    if (shouldFreeze) {
      gameShell.dataset.qaFrozen = "true";
      return;
    }
  }
  frameRequest = requestAnimationFrame(frame);
}

overlay.sync(true);
if (!opening) {
  audio.setMusicTrack(world.musicScene, {
    fadeOut: 0,
    fadeIn: 0.55,
    restart: true,
  });
  audio.syncGamePhase(world.phase);
}
sfx.syncGamePhase(world.phase);
desktopHud.render(world.snapshot);
renderer.render(world.snapshot);
gameShell.dataset.phase = world.phase;
gameShell.dataset.active = world.activeId;
gameShell.dataset.activeX = world.active.pos.x.toFixed(1);
gameShell.dataset.activeY = world.active.pos.y.toFixed(1);
gameShell.dataset.gameMode = world.mode;
gameShell.dataset.partyPresence = world.partyPresence;
gameShell.dataset.stageId = world.stageId ?? "";
gameShell.dataset.roomId = world.roomId ?? "";
gameShell.dataset.roomName = world.roomName ?? "";
gameShell.dataset.stageEncounter = world.stageEncounter ?? "";
syncStageDataset();
gameShell.dataset.northGateUnlocked = String(world.northGateUnlocked);
gameShell.dataset.enemies = String(world.enemies.filter((enemy) => enemy.alive).length);
gameShell.dataset.exp = "0";
gameShell.dataset.audioPlaying = "false";
gameShell.dataset.musicTrack = audio.state.musicTrack;
gameShell.dataset.audioUnlocked = String(audio.state.unlocked);
gameShell.dataset.audioMuted = String(audio.state.muted);
gameShell.dataset.audioVolume = String(audio.state.musicVolume);
gameShell.dataset.audioSfxMuted = String(audio.state.sfxMuted);
gameShell.dataset.audioSfxVolume = String(audio.state.sfxVolume);
gameShell.dataset.audioContext = audio.state.audioContextState;
gameShell.dataset.audioDuck = audio.state.musicDuckGain.toFixed(3);
gameShell.dataset.audioTime = "0.00";
gameShell.dataset.audioError = "";
gameShell.dataset.audioLastSfx = "";
gameShell.dataset.audioActiveSources = "0";
syncSpriteDebugDataset();
syncEffectDebugDataset();
if (!opening) canvas.focus();
frameRequest = requestAnimationFrame(frame);

function destroy(): void {
  window.removeEventListener("beforeunload", destroy);
  cancelAnimationFrame(frameRequest);
  viewportLayout.destroy();
  gameGestures.destroy();
  devSelectorCleanup?.();
  opening?.destroy();
  layer1Anomaly.destroy();
  caveEntryTitle.destroy();
  caveGuide.destroy();
  chapterCinematic.destroy();
  forestReturnCinematic.destroy();
  titleReturn.destroy();
  velgranReturnChoice.destroy();
  fieldMessages.destroy();
  input.destroy();
  soundboard?.destroy();
  desktopHud.destroy();
  renderer.destroy();
  audioControls.destroy();
  sfx.destroy();
  audio.destroy();
}

window.addEventListener("beforeunload", destroy, { once: true });
if (import.meta.hot) {
  import.meta.hot.dispose(destroy);
}

declare global {
  interface Window {
    __ELORIA__?: {
      world: GameWorld;
      input: InputController;
      audio: AudioManager;
      sfx: SfxSynthesizer;
    };
  }
}

window.__ELORIA__ = { world, input, audio, sfx };
