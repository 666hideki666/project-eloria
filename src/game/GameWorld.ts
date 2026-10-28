import {
  ACCESSIBILITY,
  CHARACTER_TUNING,
  COMBAT,
  ENEMY_AI,
  ENEMY_TUNING,
  FIELD_ENEMY_CONTACT,
  GARACROW_DIVE_STRIKE,
  IWAUROKO_ROCK_ARMOR_CHARGE,
  KYLE_HAJIN_THRUST,
  LUMIBANE_LUMINOUS_DASH,
  MOSS_PLUN_JUMP_SLAM,
  NORMAL_ATTACK_EFFECTS,
  PARTY_AI,
  STAGE_ENCOUNTER,
  UTSUROBOU_MASK_CURSE_WAVE,
  VELGRAN_COMBAT,
} from "../config";
import { EffectPool } from "../effects/EffectPool";
import {
  add,
  angleBetween,
  clampToArena,
  distance,
  distancePointToSegment,
  length,
  normalize,
  perpendicular,
  rotateDirectionToward,
  scale,
  sub,
  vec,
} from "./math";
import {
  createEnemy,
  createArenaEnemies,
  createAttackPool,
  createParty,
  createProjectilePool,
} from "./entities";
import {
  canMeruAutoHeal,
  findNextLivingCharacter,
  lowestHealthMember,
  restoreForRetry,
  reviveAfterCombat,
} from "./combatRules";
import { EnemyAttackDirector } from "./EnemyAttackDirector";
import {
  FIELD_ENEMY_RESPAWN_OFFSCREEN_HOLD,
  isFieldEnemyGroupOutsideExpandedCamera,
  type FieldEnemyRespawnPoint,
} from "./fieldEnemyRespawn";
import {
  ANCIENT_FOREST_ROOM,
  MOSS_ROOT_RUINS_ROOM,
  STAGE_ROOMS,
  TRANSFER_CHAMBER_NORTH_GATE_BLOCKER,
} from "../stage/roomDefinitions";
import { CRYSTAL_ALTAR } from "../stage/maps/crystalAltarMap";
import { ANCIENT_FOREST, ANCIENT_FOREST_BACKDROP_TRANSFORM, ancientForestWorldToSource } from "../stage/maps/ancientForestMap";
import {
  findNearestAncientForestWalkablePosition,
  isAncientForestPositionWalkable,
  resolveAncientForestMovement,
} from "../stage/ancientForestCollision";
import {
  isCrystalAltarPositionWalkable,
  resolveCrystalAltarMovement,
} from "../stage/crystalAltarCollision";
import { VelgranBossController } from "./VelgranBossController";
import { VELGRAN_REVISIT_PAGES, VELGRAN_REVISIT_RANGE } from "./velgranRevisit";
import { resolveRoomMovement } from "../stage/roomCollision";
import { StageCamera } from "../stage/StageCamera";
import {
  MOSS_ROOT_ENCOUNTERS,
  MOSS_ROOT_ENEMY_GROUP,
  MOSS_ROOT_GATE_TRANSFORM,
  MOSS_ROOT_LANDMARKS,
  MOSS_ROOT_RUINS,
  MOSS_ROOT_SOLID_PROPS,
  mossRootBackdropSourceToWorld,
  type EncounterGroupId,
  type EncounterGroupState,
} from "../stage/maps/mossRootRuinsMap";
import {
  LIGHTWING_CRYSTAL_CAVERN,
  LIGHTWING_ENCOUNTERS,
  LIGHTWING_ENEMY_GROUP,
  LIGHTWING_SAFE_GROUP_ANCHORS,
  LIGHTWING_SOLID_PROPS,
  LIGHTWING_PLATFORM_RISE_STEPS,
  findNearestSafeLightwingEnemySpawn,
  lightwingReachableTiles,
  lightwingSourceToWorld,
  type LightwingEncounterGroupId,
  type LightwingEncounterDefinition,
  type LightwingEncounterGroupState,
} from "../stage/maps/lightwingCrystalCavernMap";
import {
  DEPTHS_ENCOUNTERS,
  DEPTHS_ENEMY_GROUP,
  DEPTHS_SAFE_GROUP_ANCHORS,
  DEPTHS_SOLID_PROPS,
  SPIRIT_CLOTH_STONESCALE_DEPTHS,
  depthsReachableTiles,
  depthsSourceToWorld,
  findNearestSafeDepthsEnemySpawn,
  type DepthsEncounterDefinition,
  type DepthsEncounterGroupId,
  type DepthsEncounterGroupState,
} from "../stage/maps/spiritClothStonescaleDepthsMap";
import {
  findNearestMossRootWalkablePosition,
  isMossRootPositionWalkable,
  resolveMossRootMovement,
} from "../stage/tileCollision";
import {
  isLightwingPositionWalkable,
  resolveLightwingMovement,
} from "../stage/lightwingCrystalCavernCollision";
import {
  findNearestDepthsWalkablePosition,
  isDepthsPositionWalkable,
  resolveDepthsMovement,
} from "../stage/spiritClothStonescaleDepthsCollision";
import type {
  GameMode,
  PartyPresence,
  RoomId,
  StageId,
  StageEncounterState,
  StageRoomDefinition,
} from "../stage/types";
import type { GameAudioEvent } from "./audioEvents";
import type {
  ActionName,
  AttackArea,
  AttackImpactStyle,
  CharacterActionKind,
  CharacterId,
  CharacterState,
  DialogueSnapshot,
  EnemyState,
  GamePhase,
  HealingSpringPhase,
  InputFrame,
  Pickup,
  Projectile,
  UltimateSequence,
  Vec2,
  WorldSnapshot,
} from "./types";

const EMPTY_INPUT: InputFrame = {
  move: { x: 0, y: 0 },
  pressed: new Set(),
  held: new Set(),
  mode: "keyboard",
};

const VELGRAN_EXP_REWARD = 240;

export interface WorldOptions {
  initialPhase?: GamePhase;
  random?: () => number;
  debugAi?: boolean;
  mode?: GameMode;
  initialRoomId?: RoomId;
  enableLayer1Anomaly?: boolean;
}

interface ProjectileOptions {
  kind: Projectile["kind"];
  owner: CharacterId;
  pos: Vec2;
  direction: Vec2;
  speed: number;
  radius: number;
  damage: number;
  life: number;
  damageScale: number;
}

interface AreaOptions {
  owner: AttackArea["owner"];
  team: AttackArea["team"];
  pos: Vec2;
  direction?: Vec2;
  radius: number;
  innerRadius?: number;
  arc?: number;
  damage: number;
  damageScale?: number;
  life?: number;
  delay?: number;
  breakArmor?: number;
  knockback?: number;
  color?: string;
  impactStyle?: AttackImpactStyle;
  sweepStart?: Vec2;
  sweepEnd?: Vec2;
  terminalRadius?: number;
  sweepCollisionRadius?: number;
  activationEffect?: AttackArea["activationEffect"];
  sourceEnemyId?: number;
}

interface CharacterDamageOptions {
  invulnerability?: number;
  knockback?: number;
  impactStrength?: number;
  hitParticleCount?: number;
}

type StageEncounterGroupId =
  | EncounterGroupId
  | LightwingEncounterGroupId
  | DepthsEncounterGroupId;

type DialogueSourceId =
  | "mossCrystalActivate"
  | "mossCrystalResult"
  | "mossLayerExit"
  | "lightwingPrimaryActivate"
  | "lightwingPrimaryResult"
  | "lightwingSecondaryLocked"
  | "lightwingSecondaryActivate"
  | "lightwingSecondaryResult"
  | "lightwingPathResult"
  | "lightwingPathRising"
  | "lightwingSpringIntro"
  | "lightwingSpringResult"
  | "lightwingFloor3Gate"
  | "lightwingReturnRoute"
  | "depthsSpiritLampActivate"
  | "depthsStoneWedgeActivate"
  | "depthsBossDoor"
  | "depthsDevWarpConfirm"
  | "velgranDefeatResult"
  | "velgranPeacefulRevisit";

interface DialogueState {
  pages: readonly string[];
  pageIndex: number;
  visibleCharacterCount: number;
  characterTimer: number;
  inputLock: number;
  sourceId: DialogueSourceId;
}

const DIALOGUE_CHARACTER_SECONDS = 0.034;
const LIGHTWING_SPRING_CHARGING_DURATION = 0.52;
const LIGHTWING_SPRING_HEALING_DURATION = 0.92;
const LIGHTWING_SPRING_AFTERGLOW_DURATION = 0.68;
const DIALOGUE_PUNCTUATION_SECONDS = 0.1;
const ENCOUNTER_RESPAWN_DELAY = 7;
/** The crystal fills first, then the gate spends about 2.5 seconds moving. */
const ROOT_GATE_OPEN_DURATION = 3.1;
const DEPTHS_CENTRAL_GATE_OPEN_DURATION = 1.45;
const DEPTHS_RESTORATION_CRYSTAL_COOLDOWN = 1.1;
const ROOT_GATE_SOUND_START = 0.62;
const CRYSTAL_PLATFORM_RISE_DURATION = 3;
const CRYSTAL_PLATFORM_RISE_INTERVAL = 0.5;
const CRYSTAL_PLATFORM_RISE_LIFT_DURATION = 0.18;

export function resolveImpactShake(
  current: number,
  strength: number,
  enabled: boolean = ACCESSIBILITY.screenShake,
): number {
  return enabled
    ? Math.max(current, COMBAT.screenShake * strength)
    : current;
}

export class GameWorld {
  public readonly party = createParty();
  public enemies: EnemyState[] = [];
  public readonly projectiles = createProjectilePool();
  public readonly attacks = createAttackPool();
  public readonly effects = new EffectPool();
  public readonly pickups: Pickup[] = [];
  public readonly sequences: UltimateSequence[] = [];

  public phase: GamePhase;
  public activeId: CharacterId = "kyle";
  public time = 0;
  public exp = 0;
  public wave = 1;
  public banner = "";
  public bannerTimer = 0;
  public hitStop = 0;
  public shake = 0;
  public encounterGrace = ENEMY_AI.encounterGrace;
  public readonly debugAi: boolean;
  public readonly mode: GameMode;
  public stageId: StageId | null;
  public roomId: RoomId | null;
  public roomName: string | null;
  public stageEncounter: StageEncounterState | null = null;
  public stageEncounterNoticeEnemyId: number | null = null;
  public northGateUnlocked = false;
  public roomTransitionOpacity = 0;
  public layer1AnomalyPending = false;
  public caveGuidePending = false;
  public sealCinematicPending = false;
  public forestReturnCinematicPending = false;
  public titleReturnPending = false;
  public velgranReturnChoicePending = false;
  private pendingForestReturn = false;
  private pendingRevisitReturn = false;
  public get chapterReturnActive(): boolean { return this.pendingForestReturn || this.forestReturnCinematicPending; }
  public get revisitReturnActive(): boolean { return this.pendingRevisitReturn; }
  public get inputLocked(): boolean { return this.presentationLocked || this.pendingForestReturn || this.pendingRevisitReturn; }
  public techFeedback: { character: CharacterId; required: number; timer: number } | null = null;
  public get presentationLocked(): boolean {
    return this.layer1AnomalyPending || this.caveGuidePending || this.sealCinematicPending || this.forestReturnCinematicPending || this.titleReturnPending || this.velgranReturnChoicePending;
  }
  private layer1AnomalyEnabled = false;
  private layer1AnomalySeen = false;
  private pendingLayer1Anomaly = false;
  private primaryActiveEncounterGroupId: StageEncounterGroupId | null = null;
  /** All encounter groups currently participating in one uninterrupted battle. */
  public readonly activeEncounterGroupIds = new Set<StageEncounterGroupId>();
  public get activeEncounterGroupId(): StageEncounterGroupId | null {
    return this.primaryActiveEncounterGroupId;
  }
  private set activeEncounterGroupId(groupId: StageEncounterGroupId | null) {
    this.primaryActiveEncounterGroupId = groupId;
    this.activeEncounterGroupIds.clear();
    if (groupId) this.activeEncounterGroupIds.add(groupId);
  }
  public readonly encounterStates: Record<EncounterGroupId, EncounterGroupState> = {
    mossIntro: "dormant",
    mossFork: "dormant",
    mossDeadEnd: "dormant",
    mossGate: "dormant",
  };
  public readonly lightwingEncounterStates: Record<LightwingEncounterGroupId, LightwingEncounterGroupState> = {
    lightwingIntro: "dormant",
    lightwingDraft: "dormant",
    lightwingDeadEnd: "dormant",
    mixedChannel: "dormant",
    lightwingNest: "dormant",
  };
  public readonly depthsEncounterStates: Record<DepthsEncounterGroupId, DepthsEncounterGroupState> = {
    depthsSpiritEntry: "dormant",
    depthsSpiritLamp: "dormant",
    depthsStonePassage: "dormant",
    depthsStoneWedge: "dormant",
  };
  public primaryCrystalActivated = false;
  public secondaryCrystalActivated = false;
  public crystalPathUnlocked = false;
  /** Permanent route progress is intentionally independent from enemy respawns. */
  public mossLayerGateUnlocked = false;
  public lightwingLayerGateUnlocked = false;
  public spiritLampActivated = false;
  public stoneWedgeActivated = false;
  public depthsCentralGateOpened = false;
  public depthsBossDoorExplained = false;
  public forestSealStoneObtained = false;
  public dialogue: DialogueState | null = null;
  private readonly velgran = new VelgranBossController();
  private velgranResultDialogueShown = false;
  private velgranRewardGranted = false;

  private switchCooldown = 0;
  private formationRebuildTimer = 0;
  private formationFacing: Vec2 = { x: 1, y: 0 };
  private stageCombatActive = false;
  private gateUnlockTimer = -1;
  private crystalProximityWasNear = false;
  private springInteractionCooldown = 0;
  private restorationCrystalCooldown = 0;
  private healingSpringPhase: HealingSpringPhase = "idle";
  private healingSpringPhaseTime = 0;
  private lightwingSpringIntroductionShown = false;
  private lightwingSpringResultShown = false;
  private encounterNoticeTimer = -1;
  private encounterClearTimer = -1;
  private encounterDisengageTimer = 0;
  private readonly encounterReengageCooldown: Record<EncounterGroupId, number> = {
    mossIntro: 0,
    mossFork: 0,
    mossDeadEnd: 0,
    mossGate: 0,
  };
  private readonly lightwingEncounterReengageCooldown: Record<LightwingEncounterGroupId, number> = {
    lightwingIntro: 0, lightwingDraft: 0, lightwingDeadEnd: 0, mixedChannel: 0, lightwingNest: 0,
  };
  private readonly depthsEncounterReengageCooldown: Record<DepthsEncounterGroupId, number> = {
    depthsSpiritEntry: 0, depthsSpiritLamp: 0, depthsStonePassage: 0, depthsStoneWedge: 0,
  };
  private readonly mossRespawnAt: Record<EncounterGroupId, number> = {
    mossIntro: -1, mossFork: -1, mossDeadEnd: -1, mossGate: -1,
  };
  private readonly lightwingRespawnAt: Record<LightwingEncounterGroupId, number> = {
    lightwingIntro: -1, lightwingDraft: -1, lightwingDeadEnd: -1, mixedChannel: -1, lightwingNest: -1,
  };
  private readonly depthsRespawnAt: Record<DepthsEncounterGroupId, number> = {
    depthsSpiritEntry: -1, depthsSpiritLamp: -1, depthsStonePassage: -1, depthsStoneWedge: -1,
  };
  /** Consecutive time each cleared group has remained wholly beyond the expanded camera. */
  private readonly encounterRespawnOffscreenTime = new Map<StageEncounterGroupId, number>();
  /**
   * A disengaged, partially defeated group keeps its current bodies and
   * positions until the same offscreen respawn rule can safely rebuild it.
   */
  private readonly disengagedEncounterResetPending = new Set<StageEncounterGroupId>();
  private primaryCrystalTimer = -1;
  private secondaryCrystalTimer = -1;
  private lightwingInitialized = false;
  private lightwingEnemies: EnemyState[] | null = null;
  private depthsInitialized = false;
  private depthsEnemies: EnemyState[] | null = null;
  private mossInitialized = false;
  private mossEnemies: EnemyState[] | null = null;
  private layerTransitionCooldown = 0;
  private forestVillageHintShown = false;
  private layer2ExitExplained = false;
  private layer2ReturnRouteExplained = false;
  private crystalPlatformSoundStep = -1;
  private rootGateSoundStarted = false;
  private rootGateDebrisStage = -1;
  private mossEncounterCleared = false;
  private stageEncounterDetectionSuppressed = false;
  private roomTransitionPhase: "none" | "out" | "in" = "none";
  private roomTransitionTimer = 0;
  private pendingRoomId: RoomId | null = null;
  private pendingRoomSpawn: Vec2 | null = null;
  private pendingRoomFacing: Vec2 | null = null;
  /** Reset only after the old layer is no longer the displayed entity set. */
  private pendingRespawnLayer: "mossRootRuins" | "lightwingCrystalCavern" | "spiritClothStonescaleDepths" | null = null;
  private depthsCentralGateUnlockTimer = -1;
  private pendingLayerArrivalDialogue = false;
  private encounterAlerted = false;
  private nextPoolId = 100;
  private nextPickupId = 1;
  private clearDelay = -1;
  private readonly bufferedActions = new Set<ActionName>();
  private readonly random: () => number;
  private readonly enemyDirector = new EnemyAttackDirector();
  private readonly iwaChargeRetryUntil = new Map<number, number>();
  private readonly iwaChargeBlockedDirection = new Map<number, Vec2>();
  private readonly iwaChargeRepositionTarget = new Map<number, Vec2>();
  private readonly iwaChargeRepositionAttempts = new Map<number, number>();
  private readonly iwaCombatEngagedAt = new Map<number, number>();
  private readonly iwaLastAttackAt = new Map<number, number>();
  /** A short steering override keeps AI companions from standing inside bodies. */
  private readonly followerBodyRetreatUntil = new Map<CharacterId, number>();
  private readonly followerBodyRetreatTarget = new Map<CharacterId, Vec2>();
  private stageCamera = new StageCamera(ANCIENT_FOREST);
  private readonly audioEvents: GameAudioEvent[] = [];
  private readonly normalSoundStep: Record<CharacterId, number> = {
    kyle: 0,
    nadi: 0,
    meru: 0,
  };
  private room: StageRoomDefinition | null;

  public constructor(options: WorldOptions = {}) {
    this.mode = options.mode ?? "arena";
    this.room = this.resolveInitialRoom(options.initialRoomId);
    this.stageId = this.room ? "forestRuins01" : null;
    this.roomId = this.room?.id ?? null;
    this.roomName = this.room?.name ?? null;
    this.enemies = this.mode === "arena" ? createArenaEnemies() : [];
    this.phase = options.initialPhase ?? "intro";
    this.random = options.random ?? Math.random;
    this.debugAi = options.debugAi ?? false;
    this.layer1AnomalyEnabled = Boolean(options.enableLayer1Anomaly && this.mode === "stage" && this.roomId === "ancientForest");
    if (this.room) {
      this.encounterGrace = 0;
      this.configureStageRoom(this.room);
    }
  }

  private resolveInitialRoom(initialRoomId?: RoomId): StageRoomDefinition | null {
    if (this.mode !== "stage") return null;
    const roomId = initialRoomId === "transferChamber" || initialRoomId === "mossCorridor"
      ? "mossRootRuins"
      : initialRoomId ?? "ancientForest";
    return (STAGE_ROOMS as Partial<Record<RoomId, StageRoomDefinition>>)[roomId]
      ?? ANCIENT_FOREST_ROOM;
  }

  public get active(): CharacterState {
    const member = this.party.find((item) => item.id === this.activeId);
    if (!member) throw new Error(`Active character ${this.activeId} is missing.`);
    return member;
  }

  public get partyPresence(): PartyPresence {
    return this.mode === "arena" || this.stageCombatActive
      ? "formation"
      : "solo";
  }

  public get musicScene(): WorldSnapshot["musicScene"] {
    if (this.mode === "arena") return "battle";
    if (this.stageCombatActive) return "battle";
    if (this.room?.id === "crystalAltar" && this.velgran.combatActive) return "battle";
    if (this.room?.id === "ancientForest") return "ancientForest";
    return "exploration";
  }

  public get snapshot(): WorldSnapshot {
    const forest = this.room?.id === "ancientForest";
    const lightwing = this.room?.id === "lightwingCrystalCavern";
    const depths = this.room?.id === "spiritClothStonescaleDepths";
    const boss = this.room?.id === "crystalAltar";
    const encounterDefinitions = forest || boss ? [] : depths ? DEPTHS_ENCOUNTERS : lightwing ? LIGHTWING_ENCOUNTERS : MOSS_ROOT_ENCOUNTERS;
    const activeIds = this.activeEncounterGroupIds.size > 0
      ? this.enemyIdsForActiveEncounter()
      : [];
    return {
      phase: this.phase,
      techFeedback: this.techFeedback,
      mode: this.mode,
      partyPresence: this.partyPresence,
      stageId: this.stageId,
      roomId: this.roomId,
      roomName: this.roomName,
      stageEncounter: this.stageEncounter,
      stageEncounterNoticeEnemyId: this.stageEncounterNoticeEnemyId,
      stageLayer: this.mode === "stage" ? (forest ? "ancientForest" : boss ? "crystalAltar" : depths ? "spiritClothStonescaleDepths" : lightwing ? "lightwingCrystalCavern" : "mossRootRuins") : null,
      worldWidth: this.mode === "stage" ? (forest ? ANCIENT_FOREST.width : boss ? CRYSTAL_ALTAR.width : depths ? SPIRIT_CLOTH_STONESCALE_DEPTHS.width : lightwing ? LIGHTWING_CRYSTAL_CAVERN.width : MOSS_ROOT_RUINS.width) : 640,
      worldHeight: this.mode === "stage" ? (forest ? ANCIENT_FOREST.height : boss ? CRYSTAL_ALTAR.height : depths ? SPIRIT_CLOTH_STONESCALE_DEPTHS.height : lightwing ? LIGHTWING_CRYSTAL_CAVERN.height : MOSS_ROOT_RUINS.height) : 360,
      camera: this.mode === "stage"
        ? this.stageCamera.snapshot
        : { x: 0, y: 0, viewportWidth: 640, viewportHeight: 360 },
      activeEncounter: this.activeEncounterGroupId,
      clearedEncounters: encounterDefinitions
        .filter((group) => (depths ? this.depthsEncounterStates[group.id as DepthsEncounterGroupId] : lightwing ? this.lightwingEncounterStates[group.id as LightwingEncounterGroupId] : this.encounterStates[group.id as EncounterGroupId]) === "cleared")
        .map((group) => group.id)
        .concat(forest || boss
          ? []
          : depths
          ? []
          : lightwing
          ? (this.lightwingLayerGateUnlocked ? ["lightwingNest"] : [])
          : (this.mossLayerGateUnlocked ? ["mossGate"] : [])),
      encounterAlive: this.enemies.filter(
        (enemy) => activeIds.includes(enemy.id) && enemy.alive,
      ).length,
      encounterTotal: activeIds.length,
      disengageProgress: this.encounterDisengageTimer / STAGE_ENCOUNTER.disengageHold,
      reengageCooldown: this.activeEncounterGroupIds.size > 0
        ? Math.max(...[...this.activeEncounterGroupIds].map((groupId) => this.getReengageCooldown(groupId)))
        : 0,
      northGateUnlocked: this.northGateUnlocked,
      gateUnlockProgress: this.gateUnlockTimer >= 0
        ? Math.max(0, Math.min(1, (ROOT_GATE_OPEN_DURATION - this.gateUnlockTimer - ROOT_GATE_SOUND_START) /
          (ROOT_GATE_OPEN_DURATION - ROOT_GATE_SOUND_START)))
        : this.northGateUnlocked ? 1 : 0,
      primaryCrystalActivated: this.primaryCrystalActivated,
      secondaryCrystalActivated: this.secondaryCrystalActivated,
      crystalPathUnlocked: this.crystalPathUnlocked,
      crystalPathAnimationProgress: this.secondaryCrystalTimer >= 0
        ? this.getCrystalPlatformAnimationProgress()
        : this.crystalPathUnlocked ? 1 : 0,
      crystalPathRevealStep: this.crystalPathUnlocked ? 5 : Math.max(0, this.crystalPlatformSoundStep),
      spiritLampActivated: this.spiritLampActivated,
      stoneWedgeActivated: this.stoneWedgeActivated,
      depthsCentralGateOpened: this.depthsCentralGateOpened,
      depthsCentralGateOpenProgress: this.depthsCentralGateUnlockTimer >= 0
        ? 1 - this.depthsCentralGateUnlockTimer / DEPTHS_CENTRAL_GATE_OPEN_DURATION
        : this.depthsCentralGateOpened ? 1 : 0,
      healingSpringPhase: this.healingSpringPhase,
      healingSpringProgress: this.getHealingSpringProgress(),
      dialogue: this.dialogue ? this.dialogueSnapshot : null,
      velgran: boss ? this.velgran.snapshot : null,
      forestSealStoneObtained: this.forestSealStoneObtained,
      musicScene: this.musicScene,
      interactionPrompt: this.getInteractionPrompt(),
      springCooldown: this.springInteractionCooldown,
      roomTransitionOpacity: this.roomTransitionOpacity,
      time: this.time,
      activeId: this.activeId,
      party: this.party,
      enemies: this.enemies,
      projectiles: this.projectiles,
      attacks: this.attacks,
      pickups: this.pickups,
      exp: this.exp,
      wave: this.wave,
      banner: this.banner,
      bannerTimer: this.bannerTimer,
      hitStop: this.hitStop,
      shake: this.shake,
      encounterGrace: this.encounterGrace,
      switchCooldown: this.switchCooldown,
      debugAi: this.debugAi,
    };
  }

  public drainAudioEvents(): GameAudioEvent[] {
    if (this.audioEvents.length === 0) return [];
    return this.audioEvents.splice(0, this.audioEvents.length);
  }

  private get dialogueSnapshot(): DialogueSnapshot {
    const dialogue = this.dialogue;
    if (!dialogue) throw new Error("Dialogue snapshot requested without dialogue state.");
    const page = dialogue.pages[dialogue.pageIndex] ?? "";
    return {
      sourceId: dialogue.sourceId,
      pageIndex: dialogue.pageIndex,
      pageCount: dialogue.pages.length,
      text: page.slice(0, dialogue.visibleCharacterCount),
      fullyVisible: dialogue.visibleCharacterCount >= page.length,
    };
  }

  public confirm(): void {
    if (this.inputLocked) return;
    if (this.phase === "intro") {
      this.phase = "playing";
      this.showBanner(this.mode === "stage" ? "探索開始" : "戦闘開始", 1.2);
      return;
    }
    if (this.phase === "cleared") {
      if (this.mode === "arena") {
        this.startNextWave();
      }
      return;
    }
    if (this.phase === "gameover") {
      this.retryArena();
      return;
    }
    if (this.phase === "paused") {
      this.phase = "playing";
    }
  }

  private openDialogue(sourceId: DialogueSourceId, pages: readonly string[]): void {
    this.banner = "";
    this.bannerTimer = 0;
    this.dialogue = {
      pages,
      pageIndex: 0,
      visibleCharacterCount: 0,
      characterTimer: 0,
      inputLock: 0.12,
      sourceId,
    };
  }

  private updateDialogue(delta: number, input: InputFrame): void {
    const dialogue = this.dialogue;
    if (!dialogue) return;
    dialogue.inputLock = Math.max(0, dialogue.inputLock - delta);
    if (input.pressed.has("pause")) {
      if (dialogue.sourceId === "depthsDevWarpConfirm") this.dialogue = null;
      return;
    }
    const page = dialogue.pages[dialogue.pageIndex] ?? "";
    if (dialogue.inputLock <= 0 && input.pressed.has("interact")) {
      if (dialogue.visibleCharacterCount < page.length) {
        dialogue.visibleCharacterCount = page.length;
        dialogue.characterTimer = 0;
      } else if (dialogue.pageIndex + 1 < dialogue.pages.length) {
        dialogue.pageIndex += 1;
        dialogue.visibleCharacterCount = 0;
        dialogue.characterTimer = 0;
        dialogue.inputLock = 0.08;
      } else {
        const sourceId = dialogue.sourceId;
        this.dialogue = null;
        this.completeDialogue(sourceId);
      }
      return;
    }
    if (dialogue.visibleCharacterCount >= page.length) return;
    dialogue.characterTimer += delta;
    while (dialogue.visibleCharacterCount < page.length) {
      const current = page[dialogue.visibleCharacterCount]!;
      const delay = "、。！？".includes(current)
        ? DIALOGUE_PUNCTUATION_SECONDS
        : DIALOGUE_CHARACTER_SECONDS;
      if (dialogue.characterTimer < delay) break;
      dialogue.characterTimer -= delay;
      dialogue.visibleCharacterCount += 1;
      const typed = page[dialogue.visibleCharacterCount - 1]!;
      if (
        dialogue.visibleCharacterCount % 3 === 0 &&
        !"、。！？ \n\t".includes(typed)
      ) this.emitAudio({ kind: "dialogueType", position: { ...this.active.pos } });
    }
  }

  private completeDialogue(sourceId: DialogueSourceId): void {
    switch (sourceId) {
      case "velgranPeacefulRevisit":
        if (this.phase === "playing" && this.roomId === "crystalAltar" &&
            this.forestSealStoneObtained && this.velgran.phase === "peaceful") this.velgranReturnChoicePending = true;
        return;
      case "mossCrystalActivate":
        this.beginMossCrystalActivation();
        return;
      case "mossLayerExit":
        this.beginRoomTransition("lightwingCrystalCavern", { ...LIGHTWING_CRYSTAL_CAVERN.spawn });
        return;
      case "lightwingPrimaryActivate":
        this.beginLightwingPrimaryActivation();
        return;
      case "lightwingSecondaryActivate":
        this.beginLightwingSecondaryActivation();
        return;
      case "depthsSpiritLampActivate":
        this.activateDepthsSpiritLamp();
        return;
      case "depthsStoneWedgeActivate":
        this.activateDepthsStoneWedge();
        return;
      case "lightwingSpringIntro":
        this.lightwingSpringIntroductionShown = true;
        this.beginLightwingSpringHealing();
        return;
      case "depthsDevWarpConfirm":
        this.resetDepthsForDevWarp();
        this.beginRoomTransition("spiritClothStonescaleDepths", { ...SPIRIT_CLOTH_STONESCALE_DEPTHS.spawn });
        return;
      default:
        return;
    }
  }

  public completeSealCinematic(): boolean {
    if (!this.sealCinematicPending || this.forestSealStoneObtained ||
        this.roomId !== "crystalAltar" || this.velgran.phase !== "blessing") return false;
    this.sealCinematicPending = false;
    this.velgran.completeBlessing();
    this.forestSealStoneObtained = true;
    this.stageCombatActive = false;
    this.clearActiveCombatObjects();
    this.emitAudio({ kind: "forestSealStone", position: { ...CRYSTAL_ALTAR.sealStone }, variant: 1 });
    this.phase = "playing";
    this.pendingForestReturn = true;
    this.beginRoomTransition("ancientForest", { ...ANCIENT_FOREST.caveReturnSpawn }, { x: 0, y: 1 });
    return true;
  }

  public completeForestReturnCinematic(): boolean {
    if (!this.forestReturnCinematicPending || this.roomId !== "ancientForest" || !this.forestSealStoneObtained) return false;
    this.forestReturnCinematicPending = false;
    return true;
  }

  public chooseVelgranReturn(returnToEntrance: boolean): boolean {
    if (!this.velgranReturnChoicePending || this.mode !== "stage" || this.phase !== "playing" || this.roomId !== "crystalAltar" ||
        !this.forestSealStoneObtained || this.velgran.phase !== "peaceful" || this.dialogue ||
        this.roomTransitionPhase !== "none") return false;
    this.velgranReturnChoicePending = false;
    if (returnToEntrance) {
      this.pendingRevisitReturn = true;
      this.beginRoomTransition("ancientForest", { ...ANCIENT_FOREST.caveReturnSpawn }, { x: 0, y: 1 });
    }
    return true;
  }

  public togglePause(): boolean {
    if (this.inputLocked) return false;
    if (this.phase === "playing") {
      this.phase = "paused";
      return true;
    }
    if (this.phase === "paused") {
      this.phase = "playing";
      return true;
    }
    return false;
  }

  public update(rawDelta: number, input: InputFrame = EMPTY_INPUT): void {
    if (this.presentationLocked) return;
    const delta = Math.min(rawDelta, 1 / 20);
    if (this.pendingForestReturn || this.pendingRevisitReturn) {
      this.updateStageEvents(delta);
      return;
    }

    if (this.dialogue) {
      this.updateDialogue(delta, input);
      this.effects.update(delta * 0.2);
      return;
    }

    if (input.pressed.has("pause")) {
      if (this.togglePause()) return;
    }

    if (
      (this.phase === "intro" ||
        this.phase === "cleared" ||
        this.phase === "gameover") &&
      input.pressed.has("interact")
    ) {
      this.confirm();
      return;
    }

    if (this.phase !== "playing") {
      this.effects.update(delta * 0.35, this.phase === "paused");
      return;
    }

    if (this.hitStop > 0) {
      for (const action of input.pressed) {
        if (action !== "pause") this.bufferedActions.add(action);
      }
      this.hitStop = Math.max(0, this.hitStop - rawDelta);
      if (this.mode === "stage" && this.stageEncounter === "active") {
        this.resolveEnemySeparation(rawDelta);
        this.keepMossCorridorAttackOrder();
      }
      this.effects.update(rawDelta * 0.2);
      if (this.mode === "stage") this.stageCamera.update(this.active.pos, rawDelta);
      return;
    }

    this.time += delta;
    this.bannerTimer = Math.max(0, this.bannerTimer - delta);
    this.switchCooldown = Math.max(0, this.switchCooldown - delta);
    this.formationRebuildTimer = Math.max(
      0,
      this.formationRebuildTimer - delta,
    );
    this.encounterGrace = Math.max(0, this.encounterGrace - delta);
    this.springInteractionCooldown = Math.max(
      0,
      this.springInteractionCooldown - delta,
    );
    this.restorationCrystalCooldown = Math.max(0, this.restorationCrystalCooldown - delta);
    this.layerTransitionCooldown = Math.max(0, this.layerTransitionCooldown - delta);
    this.tickEncounterReengageCooldown(delta);
    this.shake = Math.max(0, this.shake - delta * 12);
    this.tickPartyTimers(delta);
    if (this.mode === "stage" && this.updateStageEvents(delta)) {
      this.effects.update(delta);
      return;
    }
    if (this.mode === "stage" && this.room?.id === "crystalAltar") {
      if (this.forestSealStoneObtained && this.velgran.phase !== "peaceful") this.settleVelgranForRevisit();
      const started = this.velgran.beginIfNeeded(this.active.pos.y);
      if (started) {
        this.beginStageCombat();
        this.showBanner("森晶獣ヴェルグラン", 1.35);
      }
      const sealWasVisible = this.velgran.sealStoneVisible;
      this.velgran.update(delta, this.party, this.activeId, {
        damageCharacter: (id, damage, direction, knockback) => this.damageCharacter(
          id,
          damage,
          direction,
          false,
          knockback === undefined ? undefined : { knockback },
        ),
        emit: (kind, position, variant) => this.emitAudio({ kind, position: { ...position }, variant }),
        impact: (strength) => this.triggerImpact(strength),
      });
      if (!sealWasVisible && this.velgran.sealStoneVisible) this.relocatePartyOutsideCrystalAltarSeal();
      if (this.velgran.phase === "sealReady" && !this.velgranResultDialogueShown) {
        this.velgranResultDialogueShown = true;
        this.endStageCombat();
        reviveAfterCombat(this.party);
        this.openDialogue("velgranDefeatResult", [
          "森晶獣は静かに頭を下げた。だが、水晶の青い光はまだ不規則に揺れている。",
          "祭壇に、森の封印石が現れた。",
        ]);
        this.effects.update(delta);
        return;
      }
      if (this.velgran.controlLocked) {
        const focus = this.velgran.phase === "introPan" || this.velgran.phase === "awakening"
          ? this.velgran.pos
          : this.active.pos;
        this.stageCamera.update(focus, delta);
        this.effects.update(delta);
        return;
      }
    }
    this.tickTechGauge(delta);
    this.updateControlledCharacter(delta, input);
    if (this.mode === "stage" && this.updateLayerBoundaryTransition(input)) {
      this.effects.update(delta);
      return;
    }
    if (this.mode === "stage") {
      const cameraFocus = this.room?.id === "crystalAltar" && this.velgran.combatActive
        ? { x: (this.active.pos.x + this.velgran.pos.x) / 2, y: (this.active.pos.y + this.velgran.pos.y) / 2 }
        : this.active.pos;
      this.stageCamera.update(cameraFocus, delta);
    }
    if (this.partyPresence === "formation") this.updateFollowers(delta);
    const actionInput = this.consumeBufferedInput(input);
    this.handlePlayerActions(actionInput);
    if (this.room?.id === "crystalAltar" && (this.velgran.phase === "active" || this.velgran.phase === "coreExposed")) {
      this.updateVelgranCompanionAttacks();
    }
    if (this.partyPresence === "formation") this.updateAutoHeal();
    if (
      this.mode === "arena" ||
      (this.stageEncounter === "active" && this.encounterGrace <= 0)
    ) {
      this.updateEnemies(delta);
    }
    this.updateSequences(delta);
    this.updateProjectiles(delta);
    this.updateAttackAreas(delta);
    this.resolveCombatBodyContacts();
    if (this.mode === "stage" && this.stageEncounter === "active") {
      this.resolveEnemySeparation(delta);
    }
    if (this.mode === "arena") this.resolveBodyCollisions();
    if (this.partyPresence === "formation") this.resolvePartySeparation(delta);
    this.updatePickups(delta);
    this.effects.update(delta);
    if (this.mode === "arena") this.updateClearState(delta);
    else {
      this.updateStageEncounterClear(delta);
      this.updateStageContext();
    }
  }

  public switchCharacter(force = false): boolean {
    if (!force && this.switchCooldown > 0) return false;
    const nextId = findNextLivingCharacter(this.party, this.activeId);
    if (!nextId || nextId === this.activeId) return false;

    const incoming = this.getMember(nextId);
    const outgoing = this.active;
    const switchingSolo = this.partyPresence === "solo";
    const outgoingPosition = { ...outgoing.pos };
    const outgoingFacing = { ...outgoing.facing };
    this.activeId = nextId;
    if (switchingSolo) {
      incoming.pos = outgoingPosition;
      incoming.formationSlot = { ...outgoingPosition };
      incoming.facing = outgoingFacing;
      incoming.actionFacing = { ...outgoingFacing };
      incoming.velocity = vec();
      incoming.moveIntent = vec();
      outgoing.velocity = vec();
      outgoing.moveIntent = vec();
      incoming.followerState = "formation";
      incoming.followerTargetId = null;
      outgoing.followerState = "formation";
      outgoing.followerTargetId = null;
      this.switchCooldown = COMBAT.switchCooldown;
      this.emitAudio({
        kind: "switch",
        character: incoming.id,
        position: outgoingPosition,
      });

      return true;
    }
    incoming.followerState = "formation";
    incoming.followerTargetId = null;
    outgoing.followerState = "return";
    outgoing.followerTargetId = null;
    this.formationRebuildTimer = PARTY_AI.formationRebuildDuration;
    this.switchCooldown = COMBAT.switchCooldown;
    this.emitAudio({
      kind: "switch",
      character: incoming.id,
      position: { ...incoming.pos },
    });
    this.performSwitchAttack(incoming);
    return true;
  }

  /** Prepares the existing followers for a future stage-room battle. */
  public beginStageCombat(): boolean {
    if (this.mode !== "stage" || this.stageCombatActive) return false;
    this.stageCombatActive = true;
    this.deployStageFormation();
    return true;
  }

  /** DEV-only selector entry. It intentionally uses the same room setup path
   * as a normal transition, so `this.enemies` always belongs to the selected
   * layer rather than the previously displayed one. */
  public startDevelopmentLayer(layer: "ancientForest" | "mossRootRuins" | "lightwingCrystalCavern" | "spiritClothStonescaleDepths" | "crystalAltar"): boolean {
    if (!import.meta.env.DEV || this.mode !== "stage") return false;
    this.layer1AnomalyEnabled = false;
    this.layer1AnomalyPending = false;
    this.caveGuidePending = false;
    this.sealCinematicPending = false;
    this.forestReturnCinematicPending = false;
    this.pendingForestReturn = false;
    this.pendingRevisitReturn = false;
    this.velgranReturnChoicePending = false;
    this.titleReturnPending = false;
    this.pendingLayer1Anomaly = false;
    this.stageEncounterDetectionSuppressed = false;
    if (layer === "ancientForest") {
      this.configureStageRoom(ANCIENT_FOREST_ROOM);
    } else if (layer === "mossRootRuins") {
      this.configureStageRoom(MOSS_ROOT_RUINS_ROOM);
    } else if (layer === "lightwingCrystalCavern") {
      this.resetLightwingForDevWarp();
      this.mossLayerGateUnlocked = true;
      this.configureStageRoom((STAGE_ROOMS as Record<RoomId, StageRoomDefinition>).lightwingCrystalCavern);
    } else if (layer === "spiritClothStonescaleDepths") {
      this.resetDepthsForDevWarp();
      this.lightwingLayerGateUnlocked = true;
      this.configureStageRoom((STAGE_ROOMS as Record<RoomId, StageRoomDefinition>).spiritClothStonescaleDepths);
    } else {
      this.depthsCentralGateOpened = true;
      this.configureStageRoom((STAGE_ROOMS as Record<RoomId, StageRoomDefinition>).crystalAltar);
    }
    this.phase = "playing";
    return true;
  }

  /** DEV-only boss phase shortcut for deterministic visual and combat QA. */
  public setVelgranBossForQa(
    state: "awakening" | "active" | "stomp" | "roots" | "shards" | "forestRing" | "repel" | "core" | "defeat" | "seal",
    enraged = false,
  ): void {
    if (!import.meta.env.DEV || this.mode !== "stage") return;
    if (this.room?.id !== "crystalAltar") {
      this.configureStageRoom((STAGE_ROOMS as Record<RoomId, StageRoomDefinition>).crystalAltar);
    }
    this.phase = "playing";
    this.clearActiveCombatObjects();
    this.velgran.setForQa(state);
    if (enraged && (state === "active" || state === "stomp" || state === "roots" || state === "shards" || state === "forestRing" || state === "repel")) {
      this.velgran.hp = this.velgran.snapshot.maxHp / 2;
    }
    this.velgranRewardGranted = false;
    if (state === "awakening" || state === "active" || state === "stomp" || state === "roots" || state === "shards" || state === "forestRing" || state === "repel" || state === "core") this.beginStageCombat();
    else this.endStageCombat();
    this.placePartyAtRoomSpawn(state === "seal"
      ? {
          x: CRYSTAL_ALTAR.sealStone.x,
          y: CRYSTAL_ALTAR.sealStone.y + 52,
        }
      : {
          x: CRYSTAL_ALTAR.arenaCenter.x,
          y: this.velgran.pos.y + 80,
        });
    this.stageCamera?.snapTo(this.active.pos);
  }

  /** Hides companion field bodies again after a future stage-room battle. */
  public endStageCombat(): boolean {
    if (this.mode !== "stage" || !this.stageCombatActive) return false;
    this.stageCombatActive = false;
    this.collapseStageFormation();
    return true;
  }

  public damageCharacter(
    id: CharacterId,
    rawDamage: number,
    direction: Vec2 = { x: 0, y: 1 },
    ignoreInvulnerability = false,
    options: CharacterDamageOptions = {},
  ): boolean {
    const member = this.getMember(id);
    if (member.downed || (!ignoreInvulnerability && member.invulnerable > 0)) {
      return false;
    }

    const rearScale = id === this.activeId ? 1 : COMBAT.rearDamageTakenScale;
    const barrierScale = member.barrier > 0 ? 0.3 : 1;
    const damage = Math.max(1, Math.round(rawDamage * rearScale * barrierScale));
    member.hp = Math.max(0, member.hp - damage);
    member.invulnerable = options.invulnerability ?? COMBAT.invulnerability;
    member.hurtFlash = 0.14;
    member.velocity = scale(normalize(direction), options.knockback ?? 52);
    this.emitHit(member.pos, member.accent, options.hitParticleCount ?? 5);
    this.triggerImpact(options.impactStrength ?? 1.4);

    if (member.hp <= 0) this.downCharacter(member);
    return true;
  }

  public defeatEnemy(enemyId: number): boolean {
    const enemy = this.enemies.find((item) => item.id === enemyId);
    if (!enemy || !enemy.alive) return false;
    this.applyDamageToEnemy(enemy, enemy.hp + enemy.armor + 999, {
      breakArmor: enemy.armor,
      knockback: 0,
      direction: { x: 1, y: 0 },
      color: "#ffffff",
    });
    return true;
  }

  public retryArena(): void {
    const retainedExp = this.exp;
    restoreForRetry(this.party);
    if (this.mode === "stage") {
      this.stageCombatActive = false;
      if (this.room?.id === "mossRootRuins") {
        if (this.activeEncounterGroupId) {
          this.encounterStates[this.activeEncounterGroupId as EncounterGroupId] = "dormant";
        }
        this.activeEncounterGroupId = null;
        this.stageEncounter = "dormant";
        this.encounterDisengageTimer = 0;
        for (const group of MOSS_ROOT_ENCOUNTERS) this.encounterReengageCooldown[group.id] = 0;
        this.enemies = this.createMossRootRuinsEnemies();
        for (const group of MOSS_ROOT_ENCOUNTERS) {
          if (this.encounterStates[group.id] !== "cleared") continue;
          const ids = this.enemyIdsForEncounter(group.id);
          for (const enemy of this.enemies) {
            if (ids.includes(enemy.id)) enemy.alive = false;
          }
        }
      }
      this.placePartyAtRoomSpawn();
      this.stageCamera.snapTo(this.active.pos);
    }
    else this.resetPartyPositions();
    this.activeId = "kyle";
    if (this.mode === "arena") this.enemies = createArenaEnemies(this.wave);
    this.clearTransientState();
    this.exp = retainedExp;
    this.phase = "playing";
    this.showBanner(this.mode === "arena" ? "再挑戦"
      : this.room?.id === "ancientForest" ? "古の森へ戻った" : "転送広場へ戻った", 1.2);
  }

  private tickTechGauge(delta: number): void {
    for (const member of this.party) {
      const previous = member.techCharge;
      const next = Math.min(3, previous + delta / COMBAT.techSecondsPerSegment);
      // Frame-rate rounding must not leave a nominally full segment unusable.
      member.techCharge = Math.abs(next - Math.round(next)) < 1e-9
        ? Math.round(next)
        : next;
      if (member.id === this.activeId && previous < 3 && member.techCharge === 3) {

        this.emitAudio({ kind: "switch", character: member.id, position: { ...member.pos } });
      }
    }
  }

  private tickPartyTimers(delta: number): void {
    if (this.techFeedback) {
      this.techFeedback.timer -= delta;
      if (this.techFeedback.timer <= 0) this.techFeedback = null;
    }
    for (const member of this.party) {
      member.invulnerable = Math.max(0, member.invulnerable - delta);
      member.barrier = Math.max(0, member.barrier - delta);
      member.hurtFlash = Math.max(0, member.hurtFlash - delta);
      member.actionTimer = Math.max(0, member.actionTimer - delta);
      if (member.actionTimer <= 0) {
        member.actionKind = null;
        member.actionDuration = 0;
      }
      member.cooldowns.normal = Math.max(0, member.cooldowns.normal - delta);
      member.cooldowns.special = Math.max(0, member.cooldowns.special - delta);
      member.cooldowns.ultimate = Math.max(0, member.cooldowns.ultimate - delta);
      member.cooldowns.autoHeal = Math.max(0, member.cooldowns.autoHeal - delta);
      member.moveIntent = vec();
      member.velocity.x *= Math.pow(0.015, delta);
      member.velocity.y *= Math.pow(0.015, delta);
    }
  }

  private consumeBufferedInput(input: InputFrame): InputFrame {
    if (this.bufferedActions.size === 0) return input;
    const pressed = new Set<ActionName>([
      ...this.bufferedActions,
      ...input.pressed,
    ]);
    this.bufferedActions.clear();
    return { ...input, pressed };
  }

  private updateControlledCharacter(delta: number, input: InputFrame): void {
    const member = this.active;
    if (member.downed) return;
    const previous = { ...member.pos };
    const moveLength = length(input.move);
    if (moveLength > 0.05) {
      member.facing = normalize(input.move, member.facing);
      member.moveIntent = { ...member.facing };
      member.pos.x += member.facing.x * member.moveSpeed * delta;
      member.pos.y += member.facing.y * member.moveSpeed * delta;
    }
    member.pos.x += member.velocity.x * delta;
    member.pos.y += member.velocity.y * delta;
    member.pos = this.resolveCharacterMovement(previous, member.pos, member.radius);
  }

  private updateFollowers(delta: number): void {
    const leader = this.active;
    const followers = this.party.filter((member) => member.id !== this.activeId);
    const facingBlend = 1 - Math.exp(
      -PARTY_AI.formationRotationResponse * delta,
    );
    this.formationFacing = normalize(
      {
        x: this.formationFacing.x +
          (leader.facing.x - this.formationFacing.x) * facingBlend,
        y: this.formationFacing.y +
          (leader.facing.y - this.formationFacing.y) * facingBlend,
      },
      leader.facing,
    );
    leader.formationSlot = { ...leader.pos };
    leader.followerState = "formation";
    leader.followerTargetId = null;

    followers.forEach((member, index) => {
      if (member.downed) return;
      const sideSign = index === 0 ? -1 : 1;
      member.formationSlot = this.getFormationSlot(member, sideSign);
      const target = this.findNearestEnemy(member.formationSlot);
      const leaderGap = distance(member.pos, leader.pos);
      const chaseLimit = PARTY_AI.chaseLimit[member.id];
      let movementTarget = member.formationSlot;
      let movementSpeed = this.formationRebuildTimer > 0
        ? PARTY_AI.regroupSpeed
        : member.moveSpeed * PARTY_AI.followSpeedScale;
      const bodyRetreatUntil = this.followerBodyRetreatUntil.get(member.id) ?? 0;
      const bodyRetreatTarget = this.followerBodyRetreatTarget.get(member.id);
      const bodyRetreatActive = bodyRetreatUntil > this.time && bodyRetreatTarget;

      if (bodyRetreatActive) {
        member.followerState = "return";
        member.followerTargetId = null;
        movementTarget = bodyRetreatTarget;
        movementSpeed = PARTY_AI.regroupSpeed;
      }

      if (
        !bodyRetreatActive &&
        member.id === "kyle" &&
        target &&
        leaderGap <= chaseLimit &&
        distance(member.pos, target.pos) <= PARTY_AI.engageTrigger.kyle &&
        member.followerState !== "return"
      ) {
        member.followerState = "engage";
        member.followerTargetId = target.id;
      }

      if (!bodyRetreatActive && member.id === "kyle" && member.followerState === "engage") {
        const engageTarget = this.enemies.find(
          (enemy) => enemy.id === member.followerTargetId && enemy.alive,
        );
        if (!engageTarget || leaderGap > chaseLimit) {
          member.followerState = "return";
          member.followerTargetId = null;
        } else {
          const targetToSlot = normalize(
            sub(member.formationSlot, engageTarget.pos),
            scale(this.formationFacing, -1),
          );
          const flank = normalize(
            add(
              scale(targetToSlot, 0.76),
              scale(perpendicular(targetToSlot), sideSign * 0.62),
            ),
            targetToSlot,
          );
          movementTarget = clampToArena(
            add(
              engageTarget.pos,
              scale(flank, PARTY_AI.attackStandOff.kyle),
            ),
            member.radius,
          );
          movementSpeed = member.moveSpeed * 1.12;
          member.facing = normalize(
            sub(engageTarget.pos, member.pos),
            member.facing,
          );
          if (
            distance(member.pos, engageTarget.pos) <=
              COMBAT.autoAttackRange.kyle &&
            member.cooldowns.normal <= 0
          ) {
            this.performNormalAttack(member, COMBAT.rearDamageScale, true);
            member.followerState = "return";
            member.followerTargetId = null;
            movementTarget = member.formationSlot;
          }
        }
      } else if (!bodyRetreatActive && target) {
        member.facing = normalize(sub(target.pos, member.pos), member.facing);
        const nearSlot =
          distance(member.pos, member.formationSlot) <=
          PARTY_AI.slotTolerance * 2;
        const withinRange =
          distance(member.pos, target.pos) <=
          COMBAT.autoAttackRange[member.id];
        if (
          nearSlot &&
          withinRange &&
          leaderGap <= chaseLimit &&
          member.cooldowns.normal <= 0
        ) {
          this.performNormalAttack(member, COMBAT.rearDamageScale, true);
        }
      }

      const previous = { ...member.pos };
      this.moveCharacterToward(member, movementTarget, movementSpeed, delta);
      member.pos.x += member.velocity.x * delta;
      member.pos.y += member.velocity.y * delta;
      member.pos = this.resolveCharacterMovement(previous, member.pos, member.radius);

      if (
        !bodyRetreatActive &&
        member.followerState === "return" &&
        distance(member.pos, member.formationSlot) <= PARTY_AI.slotTolerance
      ) {
        member.followerState = "formation";
      }
    });
  }

  private getFormationSlot(
    member: CharacterState,
    sideSign: -1 | 1,
  ): Vec2 {
    const distanceFromLeader = PARTY_AI.formationDistance[member.id];
    const side = perpendicular(this.formationFacing);
    const rawSlot = add(
      add(
        this.active.pos,
        scale(
          this.formationFacing,
          -distanceFromLeader * PARTY_AI.formationBackFactor,
        ),
      ),
      scale(
        side,
        sideSign * distanceFromLeader * PARTY_AI.formationSideFactor,
      ),
    );
    const occupied = this.party
      .filter((item) => item.id !== member.id && !item.downed)
      .map((item) => ({ pos: item.pos, radius: item.radius }));
    const slot = this.findSafeFormationPosition(
      this.active.pos,
      rawSlot,
      member.radius,
      occupied,
    ) ?? { ...this.active.pos };
    if (this.mode === "arena") slot.x = Math.max(PARTY_AI.hudSafeLeft, slot.x);
    return slot;
  }

  private resolveFormationPosition(origin: Vec2, desired: Vec2, radius: number): Vec2 {
    if (this.mode === "stage" && this.room?.id === "ancientForest") {
      return resolveAncientForestMovement(origin, desired, radius, { villageExitOpen: this.forestSealStoneObtained });
    }
    if (this.mode === "stage" && this.room?.id === "mossRootRuins") {
      return resolveMossRootMovement(origin, desired, radius, this.mossRootCollisionOptions());
    }
    if (this.mode === "stage" && this.room?.id === "lightwingCrystalCavern") {
      return resolveLightwingMovement(origin, desired, radius, this.lightwingCollisionOptions());
    }
    if (this.mode === "stage" && this.room?.id === "spiritClothStonescaleDepths") {
      return resolveDepthsMovement(origin, desired, radius, this.depthsCollisionOptions());
    }
    if (this.mode === "stage" && this.room?.id === "crystalAltar") {
      return resolveCrystalAltarMovement(origin, desired, radius, this.crystalAltarCollisionOptions());
    }
    const collisionRoom = this.getCollisionRoom();
    return collisionRoom
      ? resolveRoomMovement(origin, desired, radius, collisionRoom)
      : clampToArena(desired, radius);
  }

  private isFormationPositionSafe(
    position: Vec2,
    radius: number,
    occupied: readonly { pos: Vec2; radius: number }[],
  ): boolean {
    if (
      this.mode === "stage" && this.room?.id === "ancientForest" &&
      !isAncientForestPositionWalkable(position, radius, { villageExitOpen: this.forestSealStoneObtained })
    ) return false;
    if (
      this.mode === "stage" &&
      this.room?.id === "mossRootRuins" &&
      !isMossRootPositionWalkable(position, radius, this.mossRootCollisionOptions())
    ) return false;
    if (
      this.mode === "stage" && this.room?.id === "lightwingCrystalCavern" &&
      !isLightwingPositionWalkable(position, radius, this.lightwingCollisionOptions())
    ) return false;
    if (
      this.mode === "stage" && this.room?.id === "spiritClothStonescaleDepths" &&
      !isDepthsPositionWalkable(position, radius, this.depthsCollisionOptions())
    ) return false;
    if (
      this.mode === "stage" && this.room?.id === "crystalAltar" &&
      !isCrystalAltarPositionWalkable(position, radius, this.crystalAltarCollisionOptions())
    ) return false;
    return occupied.every(
      (item) => distance(position, item.pos) >= radius + item.radius + 2,
    );
  }

  /** Uses the same resolver as movement, then falls back through compact and
   * column-shaped rings. This keeps stage companions inside the leader's
   * connected walkable component instead of merely clamping them to a wall. */
  private findSafeFormationPosition(
    origin: Vec2,
    desired: Vec2,
    radius: number,
    occupied: readonly { pos: Vec2; radius: number }[],
  ): Vec2 | null {
    const tryCandidate = (candidate: Vec2): Vec2 | null => {
      const resolved = this.resolveFormationPosition(origin, candidate, radius);
      return this.isFormationPositionSafe(resolved, radius, occupied) ? resolved : null;
    };
    const direct = tryCandidate(desired);
    if (direct) return direct;
    const back = scale(this.formationFacing, -1);
    const side = perpendicular(this.formationFacing);
    const preferred = [
      add(origin, scale(back, 22)),
      add(origin, scale(back, 34)),
      add(origin, add(scale(back, 22), scale(side, 14))),
      add(origin, add(scale(back, 34), scale(side, -14))),
      add(origin, scale(side, 18)),
      add(origin, scale(side, -18)),
    ];
    for (const candidate of preferred) {
      const safe = tryCandidate(candidate);
      if (safe) return safe;
    }
    for (const distanceFromLeader of [22, 32, 44, 58, 72]) {
      for (let step = 0; step < 16; step += 1) {
        const angle = Math.atan2(back.y, back.x) + (Math.PI * 2 * step) / 16;
        const safe = tryCandidate({
          x: origin.x + Math.cos(angle) * distanceFromLeader,
          y: origin.y + Math.sin(angle) * distanceFromLeader,
        });
        if (safe) return safe;
      }
    }
    return null;
  }

  private deployStageFormation(): void {
    const leader = this.active;
    this.formationFacing = normalize(leader.facing, { x: 0, y: -1 });
    leader.formationSlot = { ...leader.pos };
    leader.followerState = "formation";
    leader.followerTargetId = null;

    const occupied = [{ pos: leader.pos, radius: leader.radius }];
    const followers = this.party.filter((member) => member.id !== leader.id);
    followers.forEach((member, index) => {
      const sideSign: -1 | 1 = index === 0 ? -1 : 1;
      const back = scale(this.formationFacing, -1);
      const side = perpendicular(this.formationFacing);
      const offsets = [
        add(scale(back, 30), scale(side, sideSign * 24)),
        add(scale(back, 42), scale(side, sideSign * 22)),
        add(scale(back, 52), scale(side, sideSign * 10)),
        add(scale(back, 24), scale(side, sideSign * 38)),
        scale(side, sideSign * 42),
        scale(back, 52),
        add(scale(back, 18), scale(side, sideSign * 50)),
      ];
      const position = offsets
        .map((offset) => this.findSafeFormationPosition(
          leader.pos,
          add(leader.pos, offset),
          member.radius,
          occupied,
        ))
        .find((candidate): candidate is Vec2 => candidate !== null)
        ?? { ...leader.pos };
      member.pos = { ...position };
      member.formationSlot = { ...position };
      member.facing = { ...this.formationFacing };
      member.actionFacing = { ...this.formationFacing };
      member.velocity = vec();
      member.moveIntent = vec();
      member.followerState = "formation";
      member.followerTargetId = null;
      occupied.push({ pos: member.pos, radius: member.radius });
    });
    this.formationRebuildTimer = 0;
  }

  private collapseStageFormation(): void {
    const leader = this.active;
    for (const member of this.party) {
      if (member.id === leader.id) continue;
      member.pos = { ...leader.pos };
      member.formationSlot = { ...leader.pos };
      member.facing = { ...leader.facing };
      member.actionFacing = { ...leader.facing };
      member.velocity = vec();
      member.moveIntent = vec();
      member.followerState = "formation";
      member.followerTargetId = null;
    }
    this.formationFacing = { ...leader.facing };
    this.formationRebuildTimer = 0;
  }

  private moveCharacterToward(
    member: CharacterState,
    target: Vec2,
    maximumSpeed: number,
    delta: number,
  ): void {
    const offset = sub(target, member.pos);
    const gap = length(offset);
    if (gap <= PARTY_AI.slotTolerance * 0.45) return;
    const speed = Math.min(maximumSpeed, gap / Math.max(delta, 0.001));
    const direction = normalize(offset, member.facing);
    member.moveIntent = { ...direction };
    member.pos.x += direction.x * speed * delta;
    member.pos.y += direction.y * speed * delta;
  }

  private resolveCharacterMovement(
    previous: Vec2,
    desired: Vec2,
    radius: number,
  ): Vec2 {
    if (this.mode === "stage" && this.room?.id === "ancientForest") {
      return resolveAncientForestMovement(previous, desired, radius, { villageExitOpen: this.forestSealStoneObtained });
    }
    if (this.mode === "stage" && this.room?.id === "mossRootRuins") {
      return resolveMossRootMovement(previous, desired, radius, this.mossRootCollisionOptions());
    }
    if (this.mode === "stage" && this.room?.id === "lightwingCrystalCavern") {
      return resolveLightwingMovement(previous, desired, radius, this.lightwingCollisionOptions());
    }
    if (this.mode === "stage" && this.room?.id === "spiritClothStonescaleDepths") {
      return resolveDepthsMovement(previous, desired, radius, this.depthsCollisionOptions());
    }
    if (this.mode === "stage" && this.room?.id === "crystalAltar") {
      return resolveCrystalAltarMovement(previous, desired, radius, this.crystalAltarCollisionOptions());
    }
    return this.getCollisionRoom()
      ? resolveRoomMovement(previous, desired, radius, this.getCollisionRoom()!)
      : clampToArena(desired, radius);
  }

  private mossRootCollisionOptions() {
    return {
      gateOpen: this.northGateUnlocked,
      layerGateOpen: this.mossLayerGateUnlocked,
      solidProps: MOSS_ROOT_SOLID_PROPS,
    };
  }

  private lightwingCollisionOptions() {
    return {
      crystalPathUnlocked: this.crystalPathUnlocked,
      layerGateOpen: this.lightwingLayerGateUnlocked,
      solidProps: LIGHTWING_SOLID_PROPS,
    };
  }

  private depthsCollisionOptions() {
    return {
      centralGateOpen: this.depthsCentralGateOpened,
      solidProps: DEPTHS_SOLID_PROPS,
    };
  }

  private crystalAltarCollisionOptions() {
    return {
      sealStoneSolid: !this.forestSealStoneObtained && this.velgran.sealStoneVisible,
      peacefulGuardianSolid: this.forestSealStoneObtained,
    };
  }

  private settleVelgranForRevisit(): void {
    this.velgran.settleForRevisit();
    this.velgranResultDialogueShown = true;
    this.velgranRewardGranted = true;
    this.endStageCombat();
  }

  private relocatePartyOutsideCrystalAltarSeal(): void {
    const options = this.crystalAltarCollisionOptions();
    const safe = this.party.filter((member) =>
      isCrystalAltarPositionWalkable(member.pos, member.radius, options));
    const occupied = safe.map((member) => ({ pos: member.pos, radius: member.radius }));
    for (const member of this.party) {
      if (safe.includes(member)) continue;
      const origin = member.pos;
      let position: Vec2 | null = null;
      for (const distanceFromOrigin of [12, 18, 24, 32, 40, 52, 64, 80, 100, 128]) {
        for (let step = 0; step < 16; step += 1) {
          const angle = Math.PI / 2 + step * Math.PI / 8;
          const candidate = {
            x: origin.x + Math.cos(angle) * distanceFromOrigin,
            y: origin.y + Math.sin(angle) * distanceFromOrigin,
          };
          if (!isCrystalAltarPositionWalkable(candidate, member.radius, options)) continue;
          if (occupied.some((item) => distance(candidate, item.pos) < member.radius + item.radius + 2)) continue;
          position = candidate;
          break;
        }
        if (position) break;
      }
      if (!position) {
        const fallback = [
          CRYSTAL_ALTAR.spawn,
          { x: CRYSTAL_ALTAR.spawn.x - 30, y: CRYSTAL_ALTAR.spawn.y },
          { x: CRYSTAL_ALTAR.spawn.x + 30, y: CRYSTAL_ALTAR.spawn.y },
        ];
        position = fallback.find((candidate) =>
          isCrystalAltarPositionWalkable(candidate, member.radius, options) &&
          occupied.every((item) => distance(candidate, item.pos) >= member.radius + item.radius + 2)) ?? null;
      }
      if (!position) throw new Error("No safe floor found when the Forest Seal Stone formed");
      member.pos = { ...position };
      member.formationSlot = { ...position };
      member.velocity = vec();
      member.moveIntent = vec();
      occupied.push({ pos: member.pos, radius: member.radius });
    }
  }

  private interactWithStage(): void {
    if (!this.room) return;
    if (this.room.id === "crystalAltar") {
      if (this.forestSealStoneObtained && this.velgran.phase === "peaceful" &&
          distance(this.active.pos, this.velgran.pos) <= VELGRAN_REVISIT_RANGE) {
        this.openDialogue("velgranPeacefulRevisit", VELGRAN_REVISIT_PAGES);
        return;
      }
      if (!this.forestSealStoneObtained && this.velgran.phase === "sealReady" && distance(this.active.pos, CRYSTAL_ALTAR.sealStone) <= 72) {
        this.velgran.beginBlessing();
        this.sealCinematicPending = true;
      }
      return;
    }
    if (this.room.id === "spiritClothStonescaleDepths") {
      this.interactWithSpiritClothStonescaleDepths();
      return;
    }
    if (this.room.id === "lightwingCrystalCavern") {
      this.interactWithLightwingCrystalCavern();
      return;
    }
    if (this.room.id === "mossRootRuins") {
      if (this.stageEncounter === "active" || this.stageEncounter === "noticed") {
        return;
      }
      if (distance(this.active.pos, MOSS_ROOT_RUINS.crystal) <= 52) {
        if (!this.northGateUnlocked && this.gateUnlockTimer < 0) {
          this.openDialogue("mossCrystalActivate", [
            "クリスタルの奥で、強い光が脈打っている。",
            "光が遺跡の根へ流れ込んでいく……。",
          ]);
        } else {
          this.openDialogue("mossCrystalResult", [this.northGateUnlocked ? "クリスタルは穏やかな光をたたえている。" : "クリスタルが静かに脈打っている。"]);
        }
        return;
      }
      return;
    }
    if (this.room.id === "transferChamber") {
      if (distance(this.active.pos, { x: 320, y: 214 }) <= 36) {
        if (!this.northGateUnlocked && this.gateUnlockTimer < 0) {
          this.showBanner("「クリスタルの奥から、森の鼓動が聞こえる……」", 0.72);
          this.gateUnlockTimer = 0.68;
          this.effects.spawn({
            kind: "ring",
            pos: { x: 320, y: 214 },
            life: 0.58,
            size: 38,
            color: "#73ddd1",
            layer: "back",
          });
          this.emitAudio({
            kind: "pickup",
            pickup: "mana",
            position: { x: 320, y: 214 },
          });
          return;
        }
        this.showBanner(
          this.northGateUnlocked
            ? "北門は開いている。"
            : "クリスタルが静かに脈打っている。",
          1.2,
        );
        return;
      }
      if (this.isNearTransferNorthGate() && this.northGateUnlocked) {
        this.beginRoomTransition("mossCorridor");
        return;
      }
      if (this.isNearTransferNorthGate()) {
        this.showBanner("道を覆う根が、かすかに脈打っている。", 1.2);
      }
      return;
    }
    if (this.room.id !== "mossCorridor") return;
    if (this.stageEncounter === "active" || this.stageEncounter === "noticed") {
      this.showBanner("戦闘中は門を使えない。", 0.8);
      return;
    }
    if (this.isNearMossSouthGate()) {
      this.beginRoomTransition("transferChamber", { x: 320, y: 120 });
      return;
    }
    if (this.isNearMossNorthGate() && this.stageEncounter === "cleared") {
      this.showBanner("門の向こうで、小さな羽音が響いている。", 1.8);
    }
  }

  private interactWithSpiritClothStonescaleDepths(): void {
    const nearest = [
      { id: "lamp", pos: SPIRIT_CLOTH_STONESCALE_DEPTHS.spiritLamp, range: 54 },
      { id: "wedge", pos: SPIRIT_CLOTH_STONESCALE_DEPTHS.stoneWedge, range: 54 },
      { id: "restoration", pos: SPIRIT_CLOTH_STONESCALE_DEPTHS.restorationCrystal, range: 58 },
      { id: "boss", pos: SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoor, range: 68 },
    ].find((item) => distance(this.active.pos, item.pos) <= item.range);
    if (!nearest) return;
    if (this.stageCombatActive || this.stageEncounter === "active" || this.stageEncounter === "noticed") {
      this.showBanner(nearest.id === "restoration" ? "戦闘中は再生晶石を使えない" : "戦闘中は装置を利用できない", 0.85);
      return;
    }
    if (nearest.id === "restoration") {
      if (!this.depthsCentralGateOpened) this.showBanner("中央門の封印が晶石の力を遮っている", 1);
      else this.activateDepthsRestorationCrystal();
      return;
    }
    if (nearest.id === "lamp") {
      if (this.spiritLampActivated) this.openDialogue("depthsBossDoor", [
        `霊灯の石碑は点灯している。中央封印　${this.stoneWedgeActivated ? "2 / 2" : "1 / 2"}`,
        this.stoneWedgeActivated ? "中央門は開いている。" : "琥珀の光脈が、暗い岩盤の奥へ伸びている。",
      ]);
      else this.openDialogue("depthsSpiritLampActivate", ["石碑には、青い霊火と中央門を結ぶ紋様が刻まれている。", "石碑の奥で、小さな霊火が揺れている。"]);
      return;
    }
    if (nearest.id === "wedge") {
      if (this.stoneWedgeActivated) this.openDialogue("depthsBossDoor", [
        `石楔の晶石は作動している。中央封印　${this.spiritLampActivated ? "2 / 2" : "1 / 2"}`,
        this.spiritLampActivated ? "中央門は開いている。" : "青紫の光脈が、霧の奥へ伸びている。",
      ]);
      else this.openDialogue("depthsStoneWedgeActivate", ["晶石は、石の楔として岩盤へ打ち込まれている。", "岩の内側から、低い振動が伝わってくる。"]);
      return;
    }
    if (!this.depthsBossDoorExplained) {
      this.depthsBossDoorExplained = true;
      this.openDialogue("depthsBossDoor", ["巨大な気配が、門の向こうで静かに息づいている。", "この先に、森晶獣ヴェルグランがいる。"]);
    } else if (this.depthsCentralGateOpened) {
      this.showBanner("開いた洞窟の先から、巨大な息づかいが響いている。", 1.15);
    } else this.showBanner("門の向こうで、巨大な息づかいが響いている。", 1.15);
  }

  private activateDepthsSpiritLamp(): void {
    if (this.spiritLampActivated) return;
    this.spiritLampActivated = true;
    const pos = SPIRIT_CLOTH_STONESCALE_DEPTHS.spiritLamp;
    this.effects.spawn({ kind: "ring", pos, life: 0.58, size: 38, color: "#9d91e8", alpha: 0.54, layer: "back" });
    this.emitAudio({ kind: "depthsSpiritLamp", position: pos });
    if (this.stoneWedgeActivated) this.tryOpenDepthsCentralGate();
    else this.openDialogue("depthsSpiritLampActivate", ["霊灯の封印が解けた。残る封印はあと一つ。", "中央封印　1 / 2"]);
  }

  private activateDepthsStoneWedge(): void {
    if (this.stoneWedgeActivated) return;
    this.stoneWedgeActivated = true;
    const pos = SPIRIT_CLOTH_STONESCALE_DEPTHS.stoneWedge;
    this.effects.spawn({ kind: "dust", pos, velocity: { x: 0, y: -8 }, life: 0.52, size: 7, color: "#9a7947", alpha: 0.58, layer: "back" });
    this.emitAudio({ kind: "depthsStoneWedge", position: pos });
    if (this.spiritLampActivated) this.tryOpenDepthsCentralGate();
    else this.openDialogue("depthsStoneWedgeActivate", ["石楔の封印が解けた。残る封印はあと一つ。", "中央封印　1 / 2"]);
  }

  private activateDepthsRestorationCrystal(): void {
    if (this.room?.id !== "spiritClothStonescaleDepths" || !this.depthsCentralGateOpened ||
      this.restorationCrystalCooldown > 0 || this.stageCombatActive) return;
    this.restorationCrystalCooldown = DEPTHS_RESTORATION_CRYSTAL_COOLDOWN;
    this.restorePartyFully();
    this.collapseStageFormation();
    const crystal = SPIRIT_CLOTH_STONESCALE_DEPTHS.restorationCrystal;
    this.effects.spawn({ kind: "ring", pos: crystal, life: 0.62, size: 42, color: "#d6f7ff", alpha: 0.72, layer: "back" });
    this.effects.spawn({ kind: "ring", pos: { ...this.active.pos }, life: 0.48, size: 28, color: "#b8d8ff", alpha: 0.55, layer: "front" });
    for (let index = 0; index < 5; index += 1) {
      const angle = (Math.PI * 2 * index) / 5;
      this.effects.spawn({ kind: "spark", pos: crystal, velocity: { x: Math.cos(angle) * 13, y: -17 - index * 2 }, life: 0.55, size: 2, color: index % 2 ? "#c7b8ff" : "#d9ffff", alpha: 0.78, layer: "front" });
    }
    this.emitAudio({ kind: "depthsRestorationCrystal", position: crystal });
    this.showBanner("再生晶石の光で、仲間たちの力が満ちた。", 1.2);
  }

  private tryOpenDepthsCentralGate(): void {
    if (
      !this.spiritLampActivated || !this.stoneWedgeActivated ||
      this.depthsCentralGateOpened || this.depthsCentralGateUnlockTimer >= 0
    ) return;
    this.depthsCentralGateUnlockTimer = DEPTHS_CENTRAL_GATE_OPEN_DURATION;
    const pos = SPIRIT_CLOTH_STONESCALE_DEPTHS.centralGate;
    this.effects.spawn({ kind: "ring", pos, life: 0.88, size: 72, color: "#a5b9ad", alpha: 0.42, layer: "back" });
    this.emitAudio({ kind: "depthsCentralGate", position: pos });
    this.showBanner("二つの封印が共鳴し、中央門が動き始めた。", 1.2);
  }

  private interactWithLightwingCrystalCavern(): void {
    const blocked = this.stageEncounter === "active" || this.stageEncounter === "noticed";
    const nearest = [
      { id: "primary", pos: LIGHTWING_CRYSTAL_CAVERN.primaryCrystal, range: 54 },
      { id: "secondary", pos: LIGHTWING_CRYSTAL_CAVERN.secondaryCrystal, range: 54 },
      { id: "spring", pos: LIGHTWING_CRYSTAL_CAVERN.spring, range: 88 },
      { id: "gate", pos: LIGHTWING_CRYSTAL_CAVERN.layerGate, range: 62 },
    ].find((item) => distance(this.active.pos, item.pos) <= item.range);
    if (!nearest) return;
    if (blocked) {
      this.showBanner(nearest.id === "spring" ? "戦闘中は晶泉に集中できない。" : "戦闘中は装置を利用できない", 0.85);
      return;
    }
    if (nearest.id === "primary") {
      if (this.primaryCrystalActivated) this.openDialogue("lightwingPrimaryResult", ["主晶石から、淡い光の筋が洞窟の奥へ伸びている。"]);
      else if (this.primaryCrystalTimer < 0) this.openDialogue("lightwingPrimaryActivate", ["晶石の奥で、眠っていた光が目を覚ます。"]);
      return;
    }
    if (nearest.id === "secondary") {
      if (!this.primaryCrystalActivated) this.openDialogue("lightwingSecondaryLocked", ["晶石は冷たく、かすかな光だけが揺れている。"]);
      else if (this.secondaryCrystalTimer >= 0) this.openDialogue("lightwingPathRising", ["青い晶石が湖からせり上がり、橋がつながり始めている。"]);
      else if (this.secondaryCrystalActivated) this.openDialogue("lightwingPathResult", ["晶石の石畳の橋が、湖の対岸へ続いている。"]);
      else if (this.secondaryCrystalTimer < 0) this.openDialogue("lightwingSecondaryActivate", ["晶石の奥で、遠くの光に応えるような響きがした。"]);
      return;
    }
    if (nearest.id === "spring") {
      if (this.healingSpringPhase !== "idle" || this.springInteractionCooldown > 0) return;
      if (!this.lightwingSpringIntroductionShown) {
        this.openDialogue("lightwingSpringIntro", [
          "澄んだ晶光が、静かな水面へ降り注いでいる。",
          "この泉なら、傷ついた仲間たちを癒せそうだ。",
        ]);
      } else this.beginLightwingSpringHealing();
      return;
    }
    if (!this.lightwingLayerGateUnlocked) this.openDialogue("lightwingFloor3Gate", ["巣の奥から強い羽音が響いている。"]);
    else this.beginRoomTransition("spiritClothStonescaleDepths", { ...SPIRIT_CLOTH_STONESCALE_DEPTHS.spawn });
  }

  private beginMossCrystalActivation(): void {
    if (this.northGateUnlocked || this.gateUnlockTimer >= 0) return;
    this.gateUnlockTimer = ROOT_GATE_OPEN_DURATION;
    this.rootGateSoundStarted = false;
    this.rootGateDebrisStage = -1;
    for (const [life, size, color] of [[0.58, 38, "#73ddd1"], [0.48, 52, "#c5fff4"], [0.4, 66, "#63d7ca"]] as const) {
      this.effects.spawn({ kind: "ring", pos: MOSS_ROOT_RUINS.crystal, life, size, color, layer: "back" });
    }
    this.emitAudio({ kind: "crystalActivate", position: MOSS_ROOT_RUINS.crystal });
  }

  private beginLightwingPrimaryActivation(): void {
    if (this.primaryCrystalActivated || this.primaryCrystalTimer >= 0) return;
    this.primaryCrystalTimer = 1.5;
    this.effects.spawn({ kind: "ring", pos: LIGHTWING_CRYSTAL_CAVERN.primaryCrystal, life: 0.55, size: 48, color: "#90f6ff", layer: "back" });
    this.emitAudio({ kind: "crystalActivate", position: LIGHTWING_CRYSTAL_CAVERN.primaryCrystal });
  }

  private beginLightwingSecondaryActivation(): void {
    if (!this.primaryCrystalActivated || this.secondaryCrystalActivated || this.secondaryCrystalTimer >= 0) return;
    this.secondaryCrystalActivated = true;
    this.secondaryCrystalTimer = CRYSTAL_PLATFORM_RISE_DURATION;
    this.crystalPlatformSoundStep = 0;
    this.effects.spawn({ kind: "ring", pos: LIGHTWING_CRYSTAL_CAVERN.secondaryCrystal, life: 0.72, size: 62, color: "#c4b6ff", layer: "back" });
    this.emitAudio({ kind: "crystalActivate", position: LIGHTWING_CRYSTAL_CAVERN.secondaryCrystal });
  }

  private getHealingSpringProgress(): number {
    switch (this.healingSpringPhase) {
      case "charging":
        return Math.min(1, this.healingSpringPhaseTime / LIGHTWING_SPRING_CHARGING_DURATION);
      case "healing":
        return Math.min(1, this.healingSpringPhaseTime / LIGHTWING_SPRING_HEALING_DURATION);
      case "afterglow":
        return Math.min(1, this.healingSpringPhaseTime / LIGHTWING_SPRING_AFTERGLOW_DURATION);
      default:
        return 0;
    }
  }

  private beginLightwingSpringHealing(): void {
    if (this.room?.id !== "lightwingCrystalCavern" || this.healingSpringPhase !== "idle") return;
    this.healingSpringPhase = "charging";
    this.healingSpringPhaseTime = 0;
    this.springInteractionCooldown = LIGHTWING_SPRING_CHARGING_DURATION + LIGHTWING_SPRING_HEALING_DURATION + LIGHTWING_SPRING_AFTERGLOW_DURATION;
    this.emitAudio({ kind: "healingSpringActivate", position: LIGHTWING_CRYSTAL_CAVERN.spring });
    this.effects.spawn({ kind: "ring", pos: { ...LIGHTWING_CRYSTAL_CAVERN.spring }, life: 0.58, size: 54, color: "#78dfe8", alpha: 0.58, layer: "back" });
  }

  /** Runs only in Layer 2 and deliberately pauses all free movement during
   * the sanctuary's short, non-combat ritual. */
  private updateLightwingSpringHealing(delta: number): boolean {
    if (this.healingSpringPhase === "idle") return false;
    this.healingSpringPhaseTime += delta;
    if (this.healingSpringPhase === "charging" && this.healingSpringPhaseTime >= LIGHTWING_SPRING_CHARGING_DURATION) {
      this.healingSpringPhase = "healing";
      this.healingSpringPhaseTime = 0;
      this.restorePartyFully();
      this.emitAudio({ kind: "healingSpringComplete", position: LIGHTWING_CRYSTAL_CAVERN.spring });
      this.spawnLightwingSpringRecoveryEffects();
    } else if (this.healingSpringPhase === "healing" && this.healingSpringPhaseTime >= LIGHTWING_SPRING_HEALING_DURATION) {
      this.healingSpringPhase = "afterglow";
      this.healingSpringPhaseTime = 0;
      this.effects.spawn({ kind: "ring", pos: { ...LIGHTWING_CRYSTAL_CAVERN.spring }, life: 0.56, size: 82, color: "#9af4ef", alpha: 0.48, layer: "back" });
    } else if (this.healingSpringPhase === "afterglow" && this.healingSpringPhaseTime >= LIGHTWING_SPRING_AFTERGLOW_DURATION) {
      this.healingSpringPhase = "idle";
      this.healingSpringPhaseTime = 0;
      if (!this.lightwingSpringResultShown) {
        this.lightwingSpringResultShown = true;
        this.openDialogue("lightwingSpringResult", ["晶泉の力が満ち、仲間たちは完全に回復した。"]);
      } else this.showBanner("晶泉の力が満ち、仲間たちは完全に回復した。", 1.35);
    }
    return true;
  }

  private restorePartyFully(): void {
    for (const member of this.party) {
      member.downed = false;
      member.hp = member.maxHp;
      member.mp = member.maxMp;
      member.invulnerable = 0;
      member.barrier = 0;
      member.hurtFlash = 0;
      member.velocity = vec();
      member.moveIntent = vec();
      member.actionTimer = 0;
      member.actionKind = null;
      member.actionDuration = 0;
      member.actionFacing = { ...member.facing };
    }
  }

  private spawnLightwingSpringRecoveryEffects(): void {
    const spring = LIGHTWING_CRYSTAL_CAVERN.spring;
    // These are three safe stones along the shore/causeway, never points in
    // the inner lake collision. They represent the whole party receiving the
    // sanctuary light while exploration itself remains a solo formation.
    const targets = [
      { x: spring.x - 42, y: spring.y + 32 },
      { x: spring.x, y: spring.y + 48 },
      { x: spring.x + 42, y: spring.y + 32 },
    ];
    for (const [index, target] of targets.entries()) {
      this.effects.spawn({ kind: "ring", pos: target, life: 0.48, size: 16, color: index === 1 ? "#d5ffff" : "#8eece6", alpha: 0.68, layer: "back" });
      for (let particle = 0; particle < 4; particle += 1) {
        const angle = (Math.PI * 2 * particle) / 4 + index * 0.4;
        this.effects.spawn({ kind: "spark", pos: target, velocity: { x: Math.cos(angle) * 8, y: -16 - particle * 3 }, life: 0.52, size: 2, color: particle % 2 === 0 ? "#cafff6" : "#70d7d6", alpha: 0.72, layer: "front" });
      }
    }
  }

  private isNearTransferNorthGate(): boolean {
    return this.active.pos.x >= 244 &&
      this.active.pos.x <= 396 &&
      this.active.pos.y <= 124;
  }

  private isNearMossSouthGate(): boolean {
    return this.active.pos.x >= 240 &&
      this.active.pos.x <= 400 &&
      this.active.pos.y >= 282;
  }

  private isNearMossNorthGate(): boolean {
    return this.active.pos.x >= 238 &&
      this.active.pos.x <= 402 &&
      this.active.pos.y <= 118;
  }

  private getInteractionPrompt(): string | null {
    if (this.dialogue || this.velgranReturnChoicePending || this.bannerTimer > 0) return null;
    if (this.room?.id === "crystalAltar") {
      if (this.forestSealStoneObtained && this.velgran.phase === "peaceful" &&
          distance(this.active.pos, this.velgran.pos) <= VELGRAN_REVISIT_RANGE) {
        return "E　ヴェルグランに話しかける";
      }
      if (!this.forestSealStoneObtained && this.velgran.phase === "sealReady" && distance(this.active.pos, CRYSTAL_ALTAR.sealStone) <= 76) {
        return "E　森の封印石に触れる";
      }
      return null;
    }
    if (this.room?.id === "spiritClothStonescaleDepths") {
      if (this.stageEncounter === "active" || this.stageEncounter === "noticed") return null;
      const options = [
        { pos: SPIRIT_CLOTH_STONESCALE_DEPTHS.spiritLamp, range: 56, text: this.spiritLampActivated ? "E　霊灯を調べる" : "E　霊灯を調べる" },
        { pos: SPIRIT_CLOTH_STONESCALE_DEPTHS.stoneWedge, range: 56, text: this.stoneWedgeActivated ? "E　石楔を調べる" : "E　石楔を調べる" },
        ...(this.depthsCentralGateOpened && this.restorationCrystalCooldown <= 0
          ? [{ pos: SPIRIT_CLOTH_STONESCALE_DEPTHS.restorationCrystal, range: 60, text: "E　再生晶石に触れる" }]
          : []),
        { pos: SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoor, range: 68, text: "E　封印門を調べる" },
      ].map((option) => ({ ...option, distance: distance(this.active.pos, option.pos) }))
        .filter((option) => option.distance <= option.range).sort((a, b) => a.distance - b.distance);
      return options[0]?.text ?? null;
    }
    if (this.room?.id === "lightwingCrystalCavern") {
      if (this.stageEncounter === "active" || this.stageEncounter === "noticed" || this.healingSpringPhase !== "idle") return null;
      const options = [
        { pos: LIGHTWING_CRYSTAL_CAVERN.primaryCrystal, range: 56, text: this.primaryCrystalActivated ? "E　主結晶を調べる" : "E　主結晶に触れる" },
        { pos: LIGHTWING_CRYSTAL_CAVERN.secondaryCrystal, range: 56, text: this.primaryCrystalActivated ? "E　副結晶に触れる" : "副結晶は眠っている" },
        { pos: LIGHTWING_CRYSTAL_CAVERN.spring, range: 88, text: "E　回復の晶泉に触れる" },
        { pos: LIGHTWING_CRYSTAL_CAVERN.layerGate, range: 64, text: "E　第3層の門を調べる" },
      ].map((option) => ({ ...option, distance: distance(this.active.pos, option.pos) }))
        .filter((option) => option.distance <= option.range).sort((a, b) => a.distance - b.distance);
      return options[0]?.text ?? null;
    }
    if (
      this.room?.id !== "mossRootRuins" ||
      this.stageEncounter === "active" ||
      this.stageEncounter === "noticed" ||
      this.gateUnlockTimer >= 0
    ) return null;
    const options = [
      {
        distance: distance(this.active.pos, MOSS_ROOT_RUINS.crystal),
        range: 52,
        text: this.northGateUnlocked
          ? "E　クリスタルを調べる"
          : "E　クリスタルに触れる",
      },
    ].filter((option) => option.distance <= option.range);
    if (options.length === 0) return null;
    options.sort((left, right) => left.distance - right.distance);
    return options[0]!.text;
  }

  private updateStageContext(): void {
    if (!this.room) return;
    if (this.room.id === "mossRootRuins") {
      const interactionBlocked = this.stageEncounter === "active" || this.stageEncounter === "noticed";
      const crystalNearby = distance(this.active.pos, MOSS_ROOT_RUINS.crystal) <= 80;
      if (
        !interactionBlocked &&
        !this.northGateUnlocked &&
        crystalNearby &&
        !this.crystalProximityWasNear &&
        this.bannerTimer <= 0
      ) this.showBanner("クリスタルがまばゆい光を放っている", 1.2);
      this.crystalProximityWasNear = !interactionBlocked && crystalNearby;
      if (this.bannerTimer > 0 || interactionBlocked || this.dialogue) return;
      return;
    }
    this.crystalProximityWasNear = false;
    if (this.bannerTimer > 0 || this.dialogue) return;
    if (
      this.room.id === "transferChamber" &&
      this.northGateUnlocked &&
      this.isNearTransferNorthGate()
    ) {
      this.showBanner("苔の回廊へ", 0.18);
      return;
    }
    if (this.room.id !== "mossCorridor") return;
  }

  private getCollisionRoom(): StageRoomDefinition | null {
    if (!this.room) return null;
    if (this.room.id !== "transferChamber" || this.northGateUnlocked) {
      return this.room;
    }
    return {
      ...this.room,
      obstacles: [
        ...this.room.obstacles,
        TRANSFER_CHAMBER_NORTH_GATE_BLOCKER,
      ],
    };
  }

  private configureStageRoom(room: StageRoomDefinition, spawn?: Vec2, facing?: Vec2): void {
    this.room = room;
    this.roomId = room.id;
    this.roomName = room.name;
    this.stageId = "forestRuins01";
    this.stageCombatActive = false;
    this.encounterGrace = 0;
    this.encounterAlerted = false;
    this.stageEncounterNoticeEnemyId = null;

    this.stageCamera = new StageCamera(
      room.id === "ancientForest" ? ANCIENT_FOREST
        : room.id === "crystalAltar" ? CRYSTAL_ALTAR
        : room.id === "spiritClothStonescaleDepths" ? SPIRIT_CLOTH_STONESCALE_DEPTHS
        : room.id === "lightwingCrystalCavern" ? LIGHTWING_CRYSTAL_CAVERN
          : MOSS_ROOT_RUINS,
    );
    if (room.id === "ancientForest") {
      this.stageEncounter = null;
      this.activeEncounterGroupId = null;
      this.enemies = [];
    } else if (room.id === "mossRootRuins") {
      this.stageEncounter = "dormant";
      this.activeEncounterGroupId = null;
      this.encounterDisengageTimer = 0;
      if (!this.mossInitialized) {
        for (const group of MOSS_ROOT_ENCOUNTERS) {
          this.encounterStates[group.id] = "dormant";
          this.encounterReengageCooldown[group.id] = 0;
          this.mossRespawnAt[group.id] = -1;
        }
        this.mossEnemies = this.createMossRootRuinsEnemies();
        this.mossInitialized = true;
      }
      this.enemies = this.mossEnemies ?? this.createMossRootRuinsEnemies();
    } else if (room.id === "lightwingCrystalCavern") {
      this.stageEncounter = "dormant";
      this.activeEncounterGroupId = null;
      this.encounterDisengageTimer = 0;
      if (!this.lightwingInitialized) {
        for (const group of LIGHTWING_ENCOUNTERS) {
          this.lightwingEncounterStates[group.id] = "dormant";
          this.lightwingEncounterReengageCooldown[group.id] = 0;
        }
        this.lightwingEnemies = this.createLightwingCrystalCavernEnemies();
        this.enemies = this.lightwingEnemies;
        this.lightwingInitialized = true;
      } else this.enemies = this.lightwingEnemies ?? this.createLightwingCrystalCavernEnemies();
    } else if (room.id === "spiritClothStonescaleDepths") {
      this.stageEncounter = "dormant";
      this.activeEncounterGroupId = null;
      this.encounterDisengageTimer = 0;
      if (!this.depthsInitialized) {
        for (const group of DEPTHS_ENCOUNTERS) {
          this.depthsEncounterStates[group.id] = "dormant";
          this.depthsEncounterReengageCooldown[group.id] = 0;
          this.depthsRespawnAt[group.id] = -1;
        }
        this.depthsEnemies = this.createSpiritClothStonescaleDepthsEnemies();
        this.enemies = this.depthsEnemies;
        this.depthsInitialized = true;
      } else this.enemies = this.depthsEnemies ?? this.createSpiritClothStonescaleDepthsEnemies();
    } else if (room.id === "crystalAltar") {
      this.stageEncounter = null;
      this.enemies = [];
      if (this.forestSealStoneObtained) this.settleVelgranForRevisit();
      else {
        this.velgranResultDialogueShown = false;
        this.velgranRewardGranted = false;
        if (this.velgran.phase === "inactive" || this.velgran.phase === "cleared") this.velgran.resetForRetreat();
      }
    } else if (room.id === "mossCorridor") {
      if (this.mossEncounterCleared) {
        this.stageEncounter = "cleared";
        this.enemies = [];
      } else {
        this.stageEncounter = "dormant";
        this.enemies = this.createMossCorridorEncounterEnemies();
      }
    } else {
      this.stageEncounter = null;
      this.enemies = [];
    }
    this.enemyDirector.reset(this.enemies);
    this.validateStageEnemyOwnership();
    this.placePartyAtRoomSpawn(spawn ?? room.spawn, facing, (this.pendingForestReturn || this.pendingRevisitReturn) && room.id === "ancientForest");
    if (room.id === "ancientForest" || room.id === "mossRootRuins" || room.id === "lightwingCrystalCavern" || room.id === "spiritClothStonescaleDepths" || room.id === "crystalAltar") this.stageCamera.snapTo(this.active.pos);
    this.layerTransitionCooldown = 0.55;
  }

  private validateStageEnemyOwnership(): void {
    if (!import.meta.env.DEV) return;
    const allowed = this.room?.id === "lightwingCrystalCavern"
      ? new Set<EnemyState["kind"]>(["mossPlun", "lumibane"])
      : this.room?.id === "spiritClothStonescaleDepths"
        ? new Set<EnemyState["kind"]>(["utsurobou", "iwaUroko"])
        : null;
    if (!allowed) return;
    const invalid = this.enemies.filter((enemy) => !allowed.has(enemy.kind));
    if (invalid.length) console.warn(`[${this.room?.id}] unexpected enemy kinds`, invalid.map((enemy) => enemy.kind));
  }

  private createMossRootRuinsEnemies(): EnemyState[] {
    const enemies: EnemyState[] = [];
    let id = 1;
    for (const group of MOSS_ROOT_ENCOUNTERS) {
      for (const position of group.enemies) {
        const safePosition = findNearestMossRootWalkablePosition(
          position,
          ENEMY_TUNING.mossPlun.radius,
          this.mossRootCollisionOptions(),
        );
        if (!safePosition) throw new Error(`No safe moss-root spawn near ${position.x},${position.y}`);
        const moss = createEnemy(id, "mossPlun", safePosition.x, safePosition.y, this.wave);
        moss.facing = { x: 0, y: 1 };
        moss.idleAnchor = { ...safePosition };
        moss.idleTarget = { ...safePosition };
        moss.reservedPos = { ...safePosition };
        enemies.push(moss);
        id += 1;
      }
    }
    return enemies;
  }

  private createLightwingCrystalCavernEnemies(): EnemyState[] {
    const enemies: EnemyState[] = [];
    let id = 1;
    for (const group of LIGHTWING_ENCOUNTERS) {
      const homes = this.resolveLightwingEncounterHomes(group);
      for (const [index, entry] of group.enemies.entries()) {
        const home = homes[index]!;
        const enemy = createEnemy(id, entry.kind, home.x, home.y, this.wave);
        enemy.facing = { x: 0, y: 1 };
        enemy.idleAnchor = { ...home };
        enemy.idleTarget = { ...home };
        enemy.reservedPos = { ...home };
        enemies.push(enemy);
        id += 1;
      }
    }
    return enemies;
  }

  private createSpiritClothStonescaleDepthsEnemies(): EnemyState[] {
    const enemies: EnemyState[] = [];
    let id = 1;
    for (const group of DEPTHS_ENCOUNTERS) {
      const homes = this.resolveDepthsEncounterHomes(group);
      for (const [index, entry] of group.enemies.entries()) {
        const home = homes[index]!;
        const enemy = createEnemy(id, entry.kind, home.x, home.y, this.wave);
        enemy.facing = { x: 0, y: 1 };
        enemy.idleAnchor = { ...home };
        enemy.idleTarget = { ...home };
        enemy.reservedPos = { ...home };
        enemies.push(enemy);
        id += 1;
      }
    }
    return enemies;
  }

  /** Resolve authored homes once per group so both first creation and every
   * respawn use the exact same safe floor positions. */
  private resolveLightwingEncounterHomes(group: LightwingEncounterDefinition): Vec2[] {
    const homes: Vec2[] = [];
    const occupied: { pos: Vec2; radius: number }[] = [];
    const reachable = lightwingReachableTiles({
      crystalPathUnlocked: this.crystalPathUnlocked || group.id === "lightwingNest",
      layerGateOpen: this.lightwingLayerGateUnlocked,
    });
    for (const entry of group.enemies) {
      const radius = ENEMY_TUNING[entry.kind].radius;
      const home = findNearestSafeLightwingEnemySpawn(entry.pos, radius, entry.kind, occupied, reachable)
        ?? findNearestSafeLightwingEnemySpawn(LIGHTWING_SAFE_GROUP_ANCHORS[group.id], radius, entry.kind, occupied, reachable);
      if (!home) {
        throw new Error(`[Layer2] no reachable safe spawn for ${group.id}:${entry.kind}`);
      }
      homes.push(home);
      occupied.push({ pos: home, radius });
    }
    return homes;
  }

  private resolveDepthsEncounterHomes(group: DepthsEncounterDefinition): Vec2[] {
    const homes: Vec2[] = [];
    const occupied: { pos: Vec2; radius: number }[] = [];
    const reachable = depthsReachableTiles(this.depthsCentralGateOpened);
    for (const entry of group.enemies) {
      const radius = ENEMY_TUNING[entry.kind].radius;
      const home = findNearestSafeDepthsEnemySpawn(entry.pos, radius, entry.kind, occupied, reachable)
        ?? findNearestSafeDepthsEnemySpawn(DEPTHS_SAFE_GROUP_ANCHORS[group.id], radius, entry.kind, occupied, reachable);
      if (!home) {
        throw new Error(`[Layer3] no reachable safe spawn for ${group.id}:${entry.kind}`);
      }
      homes.push(home);
      occupied.push({ pos: home, radius });
    }
    return homes;
  }

  private enemyIdsForEncounter(groupId: EncounterGroupId): number[] {
    return [...MOSS_ROOT_ENEMY_GROUP.entries()]
      .filter(([, value]) => value === groupId)
      .map(([id]) => id);
  }

  private enemyIdsForLightwingEncounter(groupId: LightwingEncounterGroupId): number[] {
    return [...LIGHTWING_ENEMY_GROUP.entries()].filter(([, value]) => value === groupId).map(([id]) => id);
  }

  private enemyIdsForDepthsEncounter(groupId: DepthsEncounterGroupId): number[] {
    return [...DEPTHS_ENEMY_GROUP.entries()].filter(([, value]) => value === groupId).map(([id]) => id);
  }

  private currentEncounterDefinitions(): readonly {
    id: StageEncounterGroupId;
    detectionRadius: number;
  }[] {
    if (this.room?.id === "ancientForest" || this.room?.id === "crystalAltar") return [];
    if (this.room?.id === "spiritClothStonescaleDepths") return DEPTHS_ENCOUNTERS;
    if (this.room?.id === "lightwingCrystalCavern") return LIGHTWING_ENCOUNTERS;
    return MOSS_ROOT_ENCOUNTERS;
  }

  private enemyIdsForEncounterGroup(groupId: StageEncounterGroupId): number[] {
    if (this.room?.id === "spiritClothStonescaleDepths") {
      return this.enemyIdsForDepthsEncounter(groupId as DepthsEncounterGroupId);
    }
    if (this.room?.id === "lightwingCrystalCavern") {
      return this.enemyIdsForLightwingEncounter(groupId as LightwingEncounterGroupId);
    }
    return this.enemyIdsForEncounter(groupId as EncounterGroupId);
  }

  private encounterGroupForEnemy(enemyId: number): StageEncounterGroupId | null {
    if (this.room?.id === "spiritClothStonescaleDepths") {
      return DEPTHS_ENEMY_GROUP.get(enemyId) ?? null;
    }
    if (this.room?.id === "lightwingCrystalCavern") {
      return LIGHTWING_ENEMY_GROUP.get(enemyId) ?? null;
    }
    return MOSS_ROOT_ENEMY_GROUP.get(enemyId) ?? null;
  }

  private encounterGroupState(groupId: StageEncounterGroupId): EncounterGroupState {
    if (this.room?.id === "spiritClothStonescaleDepths") {
      return this.depthsEncounterStates[groupId as DepthsEncounterGroupId];
    }
    if (this.room?.id === "lightwingCrystalCavern") {
      return this.lightwingEncounterStates[groupId as LightwingEncounterGroupId];
    }
    return this.encounterStates[groupId as EncounterGroupId];
  }

  private setEncounterGroupState(groupId: StageEncounterGroupId, state: EncounterGroupState): void {
    if (this.room?.id === "spiritClothStonescaleDepths") {
      this.depthsEncounterStates[groupId as DepthsEncounterGroupId] = state;
    } else if (this.room?.id === "lightwingCrystalCavern") {
      this.lightwingEncounterStates[groupId as LightwingEncounterGroupId] = state;
    } else {
      this.encounterStates[groupId as EncounterGroupId] = state;
    }
  }

  private getEncounterRespawnAt(groupId: StageEncounterGroupId): number {
    if (this.room?.id === "spiritClothStonescaleDepths") {
      return this.depthsRespawnAt[groupId as DepthsEncounterGroupId];
    }
    if (this.room?.id === "lightwingCrystalCavern") {
      return this.lightwingRespawnAt[groupId as LightwingEncounterGroupId];
    }
    return this.mossRespawnAt[groupId as EncounterGroupId];
  }

  private setEncounterRespawnAt(groupId: StageEncounterGroupId, value: number): void {
    if (this.room?.id === "spiritClothStonescaleDepths") {
      this.depthsRespawnAt[groupId as DepthsEncounterGroupId] = value;
    } else if (this.room?.id === "lightwingCrystalCavern") {
      this.lightwingRespawnAt[groupId as LightwingEncounterGroupId] = value;
    } else {
      this.mossRespawnAt[groupId as EncounterGroupId] = value;
    }
  }

  private scheduleFieldEnemyRespawnFromDefeat(enemyId: number): void {
    if (
      this.mode !== "stage" ||
      this.stageEncounter !== "active" ||
      (this.room?.id !== "mossRootRuins" &&
        this.room?.id !== "lightwingCrystalCavern" &&
        this.room?.id !== "spiritClothStonescaleDepths")
    ) return;
    const groupId = this.encounterGroupForEnemy(enemyId);
    if (!groupId) return;
    // Every additional defeat restarts the seven-second minimum. Combat and
    // camera/event gates still have to clear before an actual rebuild.
    this.setEncounterRespawnAt(groupId, this.time + ENCOUNTER_RESPAWN_DELAY);
    this.encounterRespawnOffscreenTime.delete(groupId);
  }

  private isEnemyInActiveEncounter(enemyId: number): boolean {
    const groupId = this.encounterGroupForEnemy(enemyId);
    return groupId !== null && this.activeEncounterGroupIds.has(groupId);
  }

  private enemyIdsForActiveEncounter(): number[] {
    const ids = new Set<number>();
    for (const groupId of this.activeEncounterGroupIds) {
      for (const enemyId of this.enemyIdsForEncounterGroup(groupId)) ids.add(enemyId);
    }
    return [...ids];
  }

  private getReengageCooldown(groupId: EncounterGroupId | LightwingEncounterGroupId | DepthsEncounterGroupId): number {
    return this.room?.id === "spiritClothStonescaleDepths"
      ? this.depthsEncounterReengageCooldown[groupId as DepthsEncounterGroupId]
      : this.room?.id === "lightwingCrystalCavern"
      ? this.lightwingEncounterReengageCooldown[groupId as LightwingEncounterGroupId]
      : this.encounterReengageCooldown[groupId as EncounterGroupId];
  }

  private addNearbyDormantEncounterGroups(state: "noticed" | "active"): number {
    if (this.mode !== "stage" || this.stageEncounterDetectionSuppressed) return 0;
    let added = 0;
    for (const group of this.currentEncounterDefinitions()) {
      if (
        this.activeEncounterGroupIds.has(group.id) ||
        this.encounterGroupState(group.id) !== "dormant" ||
        this.getReengageCooldown(group.id) > 0
      ) continue;
      const ids = this.enemyIdsForEncounterGroup(group.id);
      const inRange = this.enemies.some(
        (enemy) => enemy.alive && ids.includes(enemy.id) &&
          distance(this.active.pos, enemy.pos) <= group.detectionRadius,
      );
      if (!inRange) continue;
      this.activeEncounterGroupIds.add(group.id);
      this.setEncounterGroupState(group.id, state);
      if (state === "active") this.activateEncounterGroupEnemies(group.id);
      added += 1;
    }
    return added;
  }

  private activateEncounterGroupEnemies(groupId: StageEncounterGroupId): void {
    const ids = new Set(this.enemyIdsForEncounterGroup(groupId));
    for (const enemy of this.enemies) {
      if (!enemy.alive || !ids.has(enemy.id)) continue;
      enemy.aware = true;
      enemy.noticeDelay = 0;
      this.setEnemyState(enemy, "reposition", 0.12);
    }
  }

  private joinNearbyDormantEncounterGroups(): void {
    if (this.stageEncounter !== "active") return;
    const added = this.addNearbyDormantEncounterGroups("active");
    if (added > 0) {
      this.encounterClearTimer = -1;
      this.encounterDisengageTimer = 0;
      this.showBanner("近くの敵群が戦闘へ加わった", 0.72);
    }
  }

  private setEncounterReengageCooldown(groupId: StageEncounterGroupId, value: number): void {
    if (this.room?.id === "spiritClothStonescaleDepths") {
      this.depthsEncounterReengageCooldown[groupId as DepthsEncounterGroupId] = value;
    } else if (this.room?.id === "lightwingCrystalCavern") {
      this.lightwingEncounterReengageCooldown[groupId as LightwingEncounterGroupId] = value;
    } else {
      this.encounterReengageCooldown[groupId as EncounterGroupId] = value;
    }
  }

  private markEncounterGroupCleared(groupId: StageEncounterGroupId): void {
    if (this.encounterGroupState(groupId) === "cleared") return;
    this.setEncounterGroupState(groupId, "cleared");
    this.disengagedEncounterResetPending.delete(groupId);
    this.encounterRespawnOffscreenTime.delete(groupId);
    if (this.room?.id === "spiritClothStonescaleDepths") {
      this.depthsRespawnAt[groupId as DepthsEncounterGroupId] = this.time + ENCOUNTER_RESPAWN_DELAY;
    } else if (this.room?.id === "lightwingCrystalCavern") {
      const id = groupId as LightwingEncounterGroupId;
      if (id === "lightwingNest") this.lightwingLayerGateUnlocked = true;
      this.lightwingRespawnAt[id] = this.time + ENCOUNTER_RESPAWN_DELAY;
    } else {
      const id = groupId as EncounterGroupId;
      if (id === "mossGate") this.mossLayerGateUnlocked = true;
      this.mossRespawnAt[id] = this.time + ENCOUNTER_RESPAWN_DELAY;
    }
  }

  private createMossCorridorEncounterEnemies(): EnemyState[] {
    const positions = [
      { x: 320, y: 154 },
      { x: 220, y: 190 },
      { x: 430, y: 202 },
    ] as const;
    return positions.map((position, index) => {
      const moss = createEnemy(index + 1, "mossPlun", position.x, position.y, this.wave);
      moss.facing = { x: 0, y: 1 };
      moss.idleAnchor = { ...moss.pos };
      moss.idleTarget = { ...moss.pos };
      return moss;
    });
  }

  private beginRoomTransition(targetId: RoomId, spawn?: Vec2, facing?: Vec2): void {
    if (this.mode !== "stage" || this.roomTransitionPhase !== "none") return;
    const target = (STAGE_ROOMS as Partial<Record<RoomId, StageRoomDefinition>>)[
      targetId
    ];
    if (!target || target.id === this.room?.id) return;

    const departureLayer = this.room?.id;
    this.pendingLayer1Anomaly = this.layer1AnomalyEnabled && !this.layer1AnomalySeen &&
      departureLayer === "ancientForest" && targetId === "mossRootRuins";
    this.pendingRespawnLayer = departureLayer === "mossRootRuins" || departureLayer === "lightwingCrystalCavern" || departureLayer === "spiritClothStonescaleDepths"
      ? departureLayer
      : null;
    this.pendingLayerArrivalDialogue = departureLayer === "mossRootRuins" && targetId === "lightwingCrystalCavern";
    this.clearActiveCombatObjects();
    this.pickups.length = 0;
    this.effects.clear();
    this.banner = "";
    this.bannerTimer = 0;
    this.roomTransitionPhase = "out";
    this.roomTransitionTimer = 0.22;
    this.roomTransitionOpacity = 0;
    this.pendingRoomId = targetId;
    this.pendingRoomSpawn = spawn ? { ...spawn } : null;
    this.pendingRoomFacing = { ...(facing ?? this.active.facing) };
  }

  private updateLayerBoundaryTransition(input: InputFrame): boolean {
    if (
      this.roomTransitionPhase !== "none" ||
      this.layerTransitionCooldown > 0 ||
      this.stageEncounter === "active" || this.stageEncounter === "noticed" ||
      this.dialogue
    ) return false;
    if (this.room?.id === "ancientForest") {
      const source = ancientForestWorldToSource(this.active.pos);
      if (source.y <= ANCIENT_FOREST.caveEntrySourceY &&
        Math.abs(this.active.pos.x - ANCIENT_FOREST.caveEntry.x) <= ANCIENT_FOREST.caveEntryHalfWidth &&
        input.move.y < -0.15 &&
        isAncientForestPositionWalkable(this.active.pos, this.active.radius, { villageExitOpen: this.forestSealStoneObtained })) {
        this.beginRoomTransition("mossRootRuins", { ...MOSS_ROOT_RUINS.spawn });
        return true;
      }
      if (this.forestSealStoneObtained && source.y >= ANCIENT_FOREST_BACKDROP_TRANSFORM.sourceHeight - 3 && input.move.y > 0.15 &&
          isAncientForestPositionWalkable(this.active.pos, this.active.radius, { villageExitOpen: true })) {
        this.titleReturnPending = true;
        this.clearActiveCombatObjects();
        return true;
      }
      if (!this.forestSealStoneObtained && source.y >= ANCIENT_FOREST.villageControlSourceY - 5 &&
        input.move.y > 0.15 && !this.forestVillageHintShown) {
        this.forestVillageHintShown = true;
        this.showBanner("まずは森の奥の洞窟を調べよう", 2.2);
        return true;
      }
    }
    if (
      this.room?.id === "mossRootRuins" &&
      !this.stageCombatActive &&
      this.active.pos.y >= MOSS_ROOT_RUINS.southExit.y &&
      Math.abs(this.active.pos.x - MOSS_ROOT_RUINS.southExit.x) <= MOSS_ROOT_RUINS.southExitHalfWidth &&
      input.move.y > 0.15 &&
      isMossRootPositionWalkable(this.active.pos, this.active.radius, this.mossRootCollisionOptions())
    ) {
      this.beginRoomTransition("ancientForest", { ...ANCIENT_FOREST.caveReturnSpawn }, { x: 0, y: 1 });
      return true;
    }
    if (
      this.room?.id === "mossRootRuins" &&
      this.mossLayerGateUnlocked &&
      this.active.pos.y <= MOSS_ROOT_RUINS.layerGate.y + 20 &&
      Math.abs(this.active.pos.x - MOSS_ROOT_RUINS.layerGate.x) <= MOSS_ROOT_RUINS.layerGateHalfWidth &&
      input.move.y < -0.15
    ) {
      if (!this.layer2ExitExplained) {
        this.layer2ExitExplained = true;
        this.openDialogue("mossLayerExit", ["根の門の先から、涼しい風と羽音が流れてくる。", "第2層「光羽の晶洞」へ進もう。"]);
      } else this.beginRoomTransition("lightwingCrystalCavern", { ...LIGHTWING_CRYSTAL_CAVERN.returnGateInnerSpawn });
      return true;
    }
    if (
      this.room?.id === "lightwingCrystalCavern" &&
      this.lightwingLayerGateUnlocked &&
      this.active.pos.y <= LIGHTWING_CRYSTAL_CAVERN.layerGate.y + 20 &&
      Math.abs(this.active.pos.x - LIGHTWING_CRYSTAL_CAVERN.layerGate.x) <=
        LIGHTWING_CRYSTAL_CAVERN.layerGateHalfWidth &&
      input.move.y < -0.15
    ) {
      this.beginRoomTransition("spiritClothStonescaleDepths", { ...SPIRIT_CLOTH_STONESCALE_DEPTHS.returnGateInnerSpawn });
      return true;
    }
    if (
      this.room?.id === "lightwingCrystalCavern" &&
      this.active.pos.y >= LIGHTWING_CRYSTAL_CAVERN.returnGate.y - 18 &&
      Math.abs(this.active.pos.x - LIGHTWING_CRYSTAL_CAVERN.returnGate.x) <= LIGHTWING_CRYSTAL_CAVERN.returnGateHalfWidth &&
      input.move.y > 0.15
    ) {
      this.beginRoomTransition("mossRootRuins", { ...MOSS_ROOT_RUINS.layerGateInnerSpawn });
      return true;
    }
    if (
      this.room?.id === "spiritClothStonescaleDepths" &&
      this.depthsCentralGateOpened &&
      this.active.pos.y <= SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoor.y + 20 &&
      Math.abs(this.active.pos.x - SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoor.x) <= SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoorHalfWidth &&
      input.move.y < -0.15
    ) {
      this.beginRoomTransition("crystalAltar", { ...CRYSTAL_ALTAR.spawn });
      return true;
    }
    if (
      this.room?.id === "crystalAltar" &&
      this.active.pos.y >= CRYSTAL_ALTAR.retreatY - 24 &&
      input.move.y > 0.15
    ) {
      this.velgran.resetForRetreat();
      this.clearActiveCombatObjects();
      this.endStageCombat();
      this.beginRoomTransition("spiritClothStonescaleDepths", {
        ...SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoorInnerSpawn,
      });
      return true;
    }
    if (
      this.room?.id === "spiritClothStonescaleDepths" &&
      this.active.pos.y >= SPIRIT_CLOTH_STONESCALE_DEPTHS.returnGate.y - 18 &&
      Math.abs(this.active.pos.x - SPIRIT_CLOTH_STONESCALE_DEPTHS.returnGate.x) <=
        SPIRIT_CLOTH_STONESCALE_DEPTHS.returnGateHalfWidth &&
      input.move.y > 0.15
    ) {
      this.beginRoomTransition(
        "lightwingCrystalCavern",
        { ...LIGHTWING_CRYSTAL_CAVERN.layerGateInnerSpawn },
      );
      return true;
    }
    return false;
  }

  private resetPendingDepartureLayer(): void {
    const layer = this.pendingRespawnLayer;
    this.pendingRespawnLayer = null;
    if (layer === "mossRootRuins") this.resetAllMossRootGroupsForRespawn();
    if (layer === "lightwingCrystalCavern") this.resetAllLightwingGroupsForRespawn();
    if (layer === "spiritClothStonescaleDepths") this.resetAllDepthsGroupsForRespawn();
  }

  /** Returns true while an exclusive stage transition or encounter cue is active. */
  private updateStageEvents(delta: number): boolean {
    if (this.room?.id === "lightwingCrystalCavern") {
      if (this.updateLightwingSpringHealing(delta)) return true;
      if (this.primaryCrystalTimer >= 0) {
        this.primaryCrystalTimer -= delta;
        if (this.primaryCrystalTimer <= 0) {
          this.primaryCrystalTimer = -1;
          this.primaryCrystalActivated = true;
          this.openDialogue("lightwingPrimaryResult", ["主晶石の光が、洞窟の奥にある別の晶石へ流れ込んだ。", "二つの晶石を共鳴させれば、湖の道が現れそうだ。"]);
        }
      }
      if (this.secondaryCrystalTimer >= 0) {
        const elapsed = CRYSTAL_PLATFORM_RISE_DURATION - this.secondaryCrystalTimer;
        const nextStep = Math.min(4, Math.floor(elapsed / CRYSTAL_PLATFORM_RISE_INTERVAL));
        // Emit at most one rise cue per update.  A dropped frame must not turn
        // five visible platforms into one indistinct stack of impact sounds.
        if (this.crystalPlatformSoundStep >= 0 && this.crystalPlatformSoundStep <= nextStep) {
          const step = this.crystalPlatformSoundStep;
          this.emitAudio({ kind: "crystalPlatformRise", position: LIGHTWING_PLATFORM_RISE_STEPS[step]!, variant: step });
          this.crystalPlatformSoundStep += 1;
        }
        this.secondaryCrystalTimer = Math.max(0, this.secondaryCrystalTimer - delta);
        // A stalled tab may make several steps due at once. Keep them queued
        // so every stone still gets its own visual arrival and impact sound.
        if (this.secondaryCrystalTimer <= 0 && this.crystalPlatformSoundStep >= 5) {
          this.secondaryCrystalTimer = -1;
          this.secondaryCrystalActivated = true;
          this.crystalPathUnlocked = true;
          this.crystalPlatformSoundStep = -1;
          this.effects.spawn({ kind: "ring", pos: LIGHTWING_PLATFORM_RISE_STEPS[2]!, life: 0.7, size: 112, color: "#a8ecff", layer: "back" });
          this.emitAudio({ kind: "crystalPathComplete", position: LIGHTWING_PLATFORM_RISE_STEPS[2]! });
          this.openDialogue("lightwingPathResult", ["青い晶石が湖からせり上がり、石畳の橋が対岸までつながった。"]);
        }
      }
    }
    if (this.gateUnlockTimer >= 0) {
      const elapsed = ROOT_GATE_OPEN_DURATION - this.gateUnlockTimer;
      if (
        this.room?.id === "mossRootRuins" &&
        !this.rootGateSoundStarted &&
        elapsed >= ROOT_GATE_SOUND_START
      ) {
        this.rootGateSoundStarted = true;
        this.emitAudio({ kind: "rootGateOpen", position: MOSS_ROOT_LANDMARKS.rootGate });
      }
      this.gateUnlockTimer -= delta;
      if (this.room?.id === "mossRootRuins" && this.gateUnlockTimer > 0) {
        const progress = Math.max(0, Math.min(1, (ROOT_GATE_OPEN_DURATION - this.gateUnlockTimer - ROOT_GATE_SOUND_START) /
          (ROOT_GATE_OPEN_DURATION - ROOT_GATE_SOUND_START)));
        const debrisStage = Math.min(2, Math.floor(progress * 3));
        if (progress > 0 && debrisStage > this.rootGateDebrisStage) {
          this.rootGateDebrisStage += 1;
          const side = this.rootGateDebrisStage % 2 === 0 ? -1 : 1;
          const pos = MOSS_ROOT_GATE_TRANSFORM.center;
          const tangent = MOSS_ROOT_GATE_TRANSFORM.tangent;
          this.effects.spawn({
            kind: "dust",
            pos: { x: pos.x + tangent.x * side * 22, y: pos.y + tangent.y * side * 22 + 10 },
            velocity: { x: tangent.x * side * 19, y: tangent.y * side * 19 - 7 },
            life: 0.42,
            size: 5,
            color: "#6f6647",
            alpha: 0.58,
            layer: "back",
          });
          this.effects.spawn({
            kind: "leaf",
            pos: { x: pos.x + tangent.x * side * 15, y: pos.y + tangent.y * side * 15 + 4 },
            velocity: { x: tangent.x * side * 14, y: tangent.y * side * 14 - 11 },
            life: 0.48,
            size: 2.5,
            color: "#718044",
            alpha: 0.72,
            layer: "back",
          });
        }
      }
      if (this.gateUnlockTimer <= 0) {
        this.gateUnlockTimer = -1;
        this.northGateUnlocked = true;
        for (let index = 0; index < 6; index += 1) {
          const angle = (Math.PI * 2 * index) / 6;
          this.effects.spawn({
            kind: index % 2 === 0 ? "leaf" : "dust",
            pos: this.room?.id === "mossRootRuins" ? MOSS_ROOT_LANDMARKS.rootGate : { x: 320, y: 100 },
            velocity: { x: Math.cos(angle) * 24, y: Math.sin(angle) * 17 },
            life: 0.5 + (index % 2) * 0.1,
            size: 2.5,
            color: index % 2 === 0 ? "#789c56" : "#71684c",
            alpha: 0.7,
            layer: "back",
          });
        }
        if (this.room?.id === "mossRootRuins") this.openDialogue("mossCrystalResult", ["絡み合っていた大きな根がほどけ、奥への道が開いた。"]);
        else this.showBanner("北門の封印が解けた", 1.25);
      }
    }

    if (this.depthsCentralGateUnlockTimer >= 0) {
      this.depthsCentralGateUnlockTimer = Math.max(
        0,
        this.depthsCentralGateUnlockTimer - delta,
      );
      if (this.depthsCentralGateUnlockTimer <= 0) {
        this.depthsCentralGateUnlockTimer = -1;
        this.depthsCentralGateOpened = true;
        this.openDialogue("depthsBossDoor", [
          "二つの封印が共鳴し、中央門が開いた。",
          "守護者の前室へ続く道が現れた。",
        ]);
      }
    }

    if (this.roomTransitionPhase !== "none") {
      this.roomTransitionTimer -= delta;
      if (this.roomTransitionPhase === "out") {
        this.roomTransitionOpacity = Math.min(1, 1 - this.roomTransitionTimer / 0.22);
        if (this.roomTransitionTimer <= 0) {
          const target = this.pendingRoomId
            ? (STAGE_ROOMS as Partial<Record<RoomId, StageRoomDefinition>>)[
                this.pendingRoomId
              ]
            : null;
          if (target) this.configureStageRoom(
            target,
            this.pendingRoomSpawn ?? undefined,
            this.pendingRoomFacing ?? undefined,
          );
          // Keep fade-in at black while the standalone cave guide is open.
          if (this.pendingLayer1Anomaly && target?.id === "mossRootRuins") this.caveGuidePending = true;
          // The destination now owns `this.enemies`, so this cannot make a
          // defeated enemy reappear while the departure room is still visible.
          this.resetPendingDepartureLayer();
          this.roomTransitionPhase = "in";
          this.roomTransitionTimer = 0.22;
          this.roomTransitionOpacity = 1;
        }
      } else {
        this.roomTransitionOpacity = Math.max(0, this.roomTransitionTimer / 0.22);
        if (this.roomTransitionTimer <= 0) {
          this.roomTransitionPhase = "none";
          this.roomTransitionOpacity = 0;
          this.pendingRoomId = null;
          this.pendingRoomSpawn = null;
          this.pendingRoomFacing = null;
          if (this.room && this.room.id !== "ancientForest" && this.room.id !== "mossRootRuins" &&
            this.room.id !== "lightwingCrystalCavern" &&
            this.room.id !== "spiritClothStonescaleDepths" &&
            this.room.id !== "crystalAltar") this.showBanner(this.room.name, 1.1);
          if (this.pendingLayerArrivalDialogue && this.room?.id === "lightwingCrystalCavern" && !this.layer2ReturnRouteExplained) {
            this.layer2ReturnRouteExplained = true;
            this.openDialogue("lightwingReturnRoute", ["後ろの道を戻れば、第1層へ引き返せそうだ。"]);
          }
          this.pendingLayerArrivalDialogue = false;
          if (this.pendingLayer1Anomaly && this.room?.id === "mossRootRuins") {
            this.layer1AnomalySeen = true;
            this.layer1AnomalyPending = true;
          }
          this.pendingLayer1Anomaly = false;
          if (this.pendingForestReturn && this.roomId === "ancientForest") {
            this.pendingForestReturn = false;
            this.forestReturnCinematicPending = true;
          }
          if (this.pendingRevisitReturn && this.roomId === "ancientForest") this.pendingRevisitReturn = false;
        }
      }
      return true;
    }

    this.updateEncounterRespawns(delta);

    if (this.room?.id === "mossRootRuins") {
      return this.updateMossRootEncounterEvents(delta);
    }
    if (this.room?.id === "lightwingCrystalCavern") return this.updateLightwingEncounterEvents(delta);
    if (this.room?.id === "spiritClothStonescaleDepths") return this.updateDepthsEncounterEvents(delta);

    if (this.stageEncounter === "noticed") {
      this.encounterNoticeTimer -= delta;
      if (this.encounterNoticeTimer <= 0) this.activateMossEncounter();
      return true;
    }

    if (this.room?.id === "mossCorridor" && this.stageEncounter === "dormant") {
      const moss = this.enemies.find((enemy) => enemy.alive && enemy.kind === "mossPlun");
      if (moss && distance(this.active.pos, moss.pos) <= 115) {
        moss.attackDirection = normalize(sub(this.active.pos, moss.pos), moss.facing);
        moss.facing = { ...moss.attackDirection };
        this.stageEncounter = "noticed";
        this.stageEncounterNoticeEnemyId = moss.id;
        this.encounterNoticeTimer = 0.16;
        this.hitStop = Math.max(this.hitStop, 0.08);
        return true;
      }
    }
    return false;
  }

  private updateLightwingEncounterEvents(delta: number): boolean {
    if (this.stageEncounter === "active" && this.activeEncounterGroupId) {
      this.joinNearbyDormantEncounterGroups();
      this.updateLightwingDisengage(delta);
      return false;
    }
    if (this.stageEncounter === "noticed" && this.activeEncounterGroupId) {
      this.encounterNoticeTimer -= delta;
      if (this.encounterNoticeTimer <= 0) this.activateLightwingEncounter();
      return true;
    }
    if (this.stageEncounterDetectionSuppressed || this.activeEncounterGroupId || this.partyPresence === "formation") return false;
    let detected: { groupId: LightwingEncounterGroupId; enemy: EnemyState; gap: number } | null = null;
    for (const group of LIGHTWING_ENCOUNTERS) {
      if (this.lightwingEncounterStates[group.id] !== "dormant" || this.lightwingEncounterReengageCooldown[group.id] > 0) continue;
      const ids = this.enemyIdsForLightwingEncounter(group.id);
      for (const enemy of this.enemies) {
        if (!enemy.alive || !ids.includes(enemy.id)) continue;
        const gap = distance(this.active.pos, enemy.pos);
        if (gap <= group.detectionRadius && (!detected || gap < detected.gap)) detected = { groupId: group.id, enemy, gap };
      }
    }
    if (!detected) return false;
    this.activeEncounterGroupId = detected.groupId;
    this.lightwingEncounterStates[detected.groupId] = "noticed";
    this.addNearbyDormantEncounterGroups("noticed");
    this.stageEncounter = "noticed";
    detected.enemy.attackDirection = normalize(sub(this.active.pos, detected.enemy.pos), detected.enemy.facing);
    detected.enemy.facing = { ...detected.enemy.attackDirection };
    this.stageEncounterNoticeEnemyId = detected.enemy.id;
    this.encounterNoticeTimer = 0.16;
    this.hitStop = Math.max(this.hitStop, 0.08);
    return true;
  }

  private updateLightwingDisengage(delta: number): void {
    const ids = this.enemyIdsForActiveEncounter();
    const living = this.enemies.filter((enemy) => enemy.alive && ids.includes(enemy.id));
    if (!living.length) return;
    this.encounterDisengageTimer = living.every((enemy) => distance(this.active.pos, enemy.pos) >= STAGE_ENCOUNTER.disengageDistance)
      ? this.encounterDisengageTimer + delta : 0;
    if (this.encounterDisengageTimer < STAGE_ENCOUNTER.disengageHold || !this.activeEncounterGroupId) return;
    this.finishStageEncounterDisengage();
  }

  private updateDepthsEncounterEvents(delta: number): boolean {
    if (this.stageEncounter === "active" && this.activeEncounterGroupId) {
      this.joinNearbyDormantEncounterGroups();
      this.updateDepthsDisengage(delta);
      return false;
    }
    if (this.stageEncounter === "noticed" && this.activeEncounterGroupId) {
      this.encounterNoticeTimer -= delta;
      if (this.encounterNoticeTimer <= 0) this.activateDepthsEncounter();
      return true;
    }
    if (this.stageEncounterDetectionSuppressed || this.activeEncounterGroupId || this.partyPresence === "formation") return false;
    let detected: { groupId: DepthsEncounterGroupId; enemy: EnemyState; gap: number } | null = null;
    for (const group of DEPTHS_ENCOUNTERS) {
      if (this.depthsEncounterStates[group.id] !== "dormant" || this.depthsEncounterReengageCooldown[group.id] > 0) continue;
      const ids = this.enemyIdsForDepthsEncounter(group.id);
      for (const enemy of this.enemies) {
        if (!enemy.alive || !ids.includes(enemy.id)) continue;
        const gap = distance(this.active.pos, enemy.pos);
        if (gap <= group.detectionRadius && (!detected || gap < detected.gap)) detected = { groupId: group.id, enemy, gap };
      }
    }
    if (!detected) return false;
    this.activeEncounterGroupId = detected.groupId;
    this.depthsEncounterStates[detected.groupId] = "noticed";
    this.addNearbyDormantEncounterGroups("noticed");
    this.stageEncounter = "noticed";
    detected.enemy.attackDirection = normalize(sub(this.active.pos, detected.enemy.pos), detected.enemy.facing);
    detected.enemy.facing = { ...detected.enemy.attackDirection };
    this.stageEncounterNoticeEnemyId = detected.enemy.id;
    this.encounterNoticeTimer = 0.16;
    this.hitStop = Math.max(this.hitStop, 0.08);
    return true;
  }

  private updateDepthsDisengage(delta: number): void {
    const ids = this.enemyIdsForActiveEncounter();
    const living = this.enemies.filter((enemy) => enemy.alive && ids.includes(enemy.id));
    if (!living.length) return;
    this.encounterDisengageTimer = living.every((enemy) => distance(this.active.pos, enemy.pos) >= STAGE_ENCOUNTER.disengageDistance)
      ? this.encounterDisengageTimer + delta : 0;
    if (this.encounterDisengageTimer < STAGE_ENCOUNTER.disengageHold || !this.activeEncounterGroupId) return;
    this.finishStageEncounterDisengage();
  }

  private resetDepthsEncounterGroupWithReward(
    groupId: DepthsEncounterGroupId,
    preserveExpReward: boolean,
    enemies: EnemyState[] = this.enemies,
  ): void {
    const group = DEPTHS_ENCOUNTERS.find((item) => item.id === groupId);
    if (!group) return;
    const ids = this.enemyIdsForDepthsEncounter(groupId);
    const homes = this.resolveDepthsEncounterHomes(group);
    group.enemies.forEach((entry, index) => {
      const enemy = enemies.find((item) => item.id === ids[index]);
      if (!enemy) return;
      const expGranted = preserveExpReward ? enemy.expGranted : false;
      const home = homes[index]!;
      const reset = createEnemy(enemy.id, entry.kind, home.x, home.y, this.wave);
      reset.facing = { x: 0, y: 1 };
      reset.idleAnchor = { ...home };
      reset.idleTarget = { ...home };
      reset.reservedPos = { ...home };
      reset.expGranted = expGranted;
      Object.assign(enemy, reset);
    });
  }

  private activateDepthsEncounter(): void {
    if (this.stageEncounter !== "noticed") return;
    this.addNearbyDormantEncounterGroups("noticed");
    this.stageEncounter = "active";
    for (const groupId of this.activeEncounterGroupIds) {
      this.setEncounterGroupState(groupId, "active");
      this.activateEncounterGroupEnemies(groupId);
    }
    this.stageEncounterNoticeEnemyId = null;
    this.beginStageCombat();
    this.encounterGrace = 0.75;
    this.showBanner("深層の魔物が現れた", 0.8);
  }

  private resetLightwingEncounterGroupWithReward(
    groupId: LightwingEncounterGroupId,
    preserveExpReward: boolean,
    enemies: EnemyState[] = this.enemies,
  ): void {
    const group = LIGHTWING_ENCOUNTERS.find((item) => item.id === groupId);
    if (!group) return;
    const ids = this.enemyIdsForLightwingEncounter(groupId);
    const homes = this.resolveLightwingEncounterHomes(group);
    group.enemies.forEach((entry, index) => {
      const enemy = enemies.find((item) => item.id === ids[index]);
      if (!enemy) return;
      const expGranted = preserveExpReward ? enemy.expGranted : false;
      const home = homes[index]!;
      const reset = createEnemy(enemy.id, entry.kind, home.x, home.y, this.wave);
      reset.facing = { x: 0, y: 1 };
      reset.idleAnchor = { ...home };
      reset.idleTarget = { ...home };
      reset.reservedPos = { ...home };
      reset.expGranted = expGranted;
      Object.assign(enemy, reset);
    });
  }

  private activateLightwingEncounter(): void {
    if (this.stageEncounter !== "noticed") return;
    this.addNearbyDormantEncounterGroups("noticed");
    this.stageEncounter = "active";
    for (const groupId of this.activeEncounterGroupIds) {
      this.setEncounterGroupState(groupId, "active");
      this.activateEncounterGroupEnemies(groupId);
    }
    this.stageEncounterNoticeEnemyId = null;
    this.beginStageCombat();
    this.encounterGrace = 0.75;
    this.showBanner("光羽の群れが現れた", 1.8);
  }

  private updateMossRootEncounterEvents(delta: number): boolean {
    if (this.stageEncounter === "active" && this.activeEncounterGroupId) {
      this.joinNearbyDormantEncounterGroups();
      this.updateMossRootDisengage(delta);
      return false;
    }
    if (this.stageEncounter === "noticed" && this.activeEncounterGroupId) {
      this.encounterNoticeTimer -= delta;
      if (this.encounterNoticeTimer <= 0) this.activateMossEncounter();
      return true;
    }
    if (
      this.stageEncounterDetectionSuppressed ||
      this.activeEncounterGroupId ||
      this.partyPresence === "formation"
    ) return false;

    let detected: { groupId: EncounterGroupId; enemy: EnemyState; gap: number } | null = null;
    for (const group of MOSS_ROOT_ENCOUNTERS) {
      if (
        this.encounterStates[group.id] !== "dormant" ||
        this.encounterReengageCooldown[group.id] > 0
      ) continue;
      const ids = this.enemyIdsForEncounter(group.id);
      for (const enemy of this.enemies) {
        if (!enemy.alive || !ids.includes(enemy.id)) continue;
        const gap = distance(this.active.pos, enemy.pos);
        if (gap <= group.detectionRadius && (!detected || gap < detected.gap)) {
          detected = { groupId: group.id, enemy, gap };
        }
      }
    }
    if (!detected) return false;

    this.activeEncounterGroupId = detected.groupId;
    this.encounterStates[detected.groupId] = "noticed";
    this.addNearbyDormantEncounterGroups("noticed");
    this.stageEncounter = "noticed";
    detected.enemy.attackDirection = normalize(
      sub(this.active.pos, detected.enemy.pos),
      detected.enemy.facing,
    );
    detected.enemy.facing = { ...detected.enemy.attackDirection };
    this.stageEncounterNoticeEnemyId = detected.enemy.id;
    this.encounterNoticeTimer = 0.16;
    this.hitStop = Math.max(this.hitStop, 0.08);
    return true;
  }

  private tickEncounterReengageCooldown(delta: number): void {
    for (const group of MOSS_ROOT_ENCOUNTERS) {
      this.encounterReengageCooldown[group.id] = Math.max(
        0,
        this.encounterReengageCooldown[group.id] - delta,
      );
    }
    for (const group of LIGHTWING_ENCOUNTERS) {
      this.lightwingEncounterReengageCooldown[group.id] = Math.max(0, this.lightwingEncounterReengageCooldown[group.id] - delta);
    }
    for (const group of DEPTHS_ENCOUNTERS) {
      this.depthsEncounterReengageCooldown[group.id] = Math.max(0, this.depthsEncounterReengageCooldown[group.id] - delta);
    }
  }

  private updateMossRootDisengage(delta: number): void {
    if (!this.activeEncounterGroupId) {
      this.encounterDisengageTimer = 0;
      return;
    }
    const activeIds = this.enemyIdsForActiveEncounter();
    const livingEnemies = this.enemies.filter(
      (enemy) => enemy.alive && activeIds.includes(enemy.id),
    );
    if (livingEnemies.length === 0) {
      this.encounterDisengageTimer = 0;
      return;
    }
    const safelySeparated = livingEnemies.every(
      (enemy) => distance(this.active.pos, enemy.pos) >= STAGE_ENCOUNTER.disengageDistance,
    );
    this.encounterDisengageTimer = safelySeparated
      ? this.encounterDisengageTimer + delta
      : 0;
    if (this.encounterDisengageTimer < STAGE_ENCOUNTER.disengageHold) return;
    this.finishStageEncounterDisengage();
  }

  /**
   * Combat ownership ends immediately, but rebuilding the enemies is deferred
   * until neither their current bodies nor their authored homes can be seen.
   */
  private finishStageEncounterDisengage(): void {
    this.clearActiveCombatObjects();
    for (const groupId of [...this.activeEncounterGroupIds]) {
      if (this.encounterGroupState(groupId) === "cleared") continue;
      this.disengagedEncounterResetPending.add(groupId);
      if (this.getEncounterRespawnAt(groupId) < 0) {
        this.setEncounterRespawnAt(groupId, this.time + ENCOUNTER_RESPAWN_DELAY);
      }
      this.setEncounterGroupState(groupId, "dormant");
      this.setEncounterReengageCooldown(groupId, STAGE_ENCOUNTER.reengageCooldown);
    }
    this.activeEncounterGroupId = null;
    this.stageEncounter = "dormant";
    this.stageEncounterNoticeEnemyId = null;
    this.encounterNoticeTimer = -1;
    this.encounterClearTimer = -1;
    this.encounterDisengageTimer = 0;
    this.encounterGrace = 0;
    this.endStageCombat();
    this.enemyDirector.reset(this.enemies);
    this.resetNonCombatStageEnemies([]);
    this.showBanner("戦闘から離脱した", 1.05);
  }

  private resetMossRootEncounterGroupWithReward(
    groupId: EncounterGroupId,
    preserveExpReward: boolean,
    enemies: EnemyState[] = this.enemies,
  ): void {
    const group = MOSS_ROOT_ENCOUNTERS.find((candidate) => candidate.id === groupId);
    if (!group) return;
    const ids = this.enemyIdsForEncounter(groupId);
    group.enemies.forEach((position, index) => {
      const enemy = enemies.find((candidate) => candidate.id === ids[index]);
      if (!enemy) return;
      const safePosition = findNearestMossRootWalkablePosition(
        position,
        ENEMY_TUNING.mossPlun.radius,
        this.mossRootCollisionOptions(),
      );
      if (!safePosition) throw new Error(`No safe moss-root respawn near ${position.x},${position.y}`);
      const expGranted = preserveExpReward ? enemy.expGranted : false;
      const reset = createEnemy(enemy.id, "mossPlun", safePosition.x, safePosition.y, this.wave);
      reset.facing = { x: 0, y: 1 };
      reset.idleAnchor = { ...safePosition };
      reset.idleTarget = { ...safePosition };
      reset.reservedPos = { ...safePosition };
      reset.expGranted = expGranted;
      Object.assign(enemy, reset);
    });
  }

  private resetAllMossRootGroupsForRespawn(): void {
    if (!this.mossEnemies) return;
    for (const group of MOSS_ROOT_ENCOUNTERS) {
      this.resetMossRootEncounterGroupWithReward(group.id, false, this.mossEnemies);
      this.encounterStates[group.id] = "dormant";
      this.encounterReengageCooldown[group.id] = 0;
      this.mossRespawnAt[group.id] = -1;
      this.encounterRespawnOffscreenTime.delete(group.id);
      this.disengagedEncounterResetPending.delete(group.id);
    }
    this.stageEncounter = "dormant";
    this.activeEncounterGroupId = null;
  }

  private resetAllLightwingGroupsForRespawn(): void {
    if (!this.lightwingEnemies) return;
    for (const group of LIGHTWING_ENCOUNTERS) {
      this.resetLightwingEncounterGroupWithReward(group.id, false, this.lightwingEnemies);
      this.lightwingEncounterStates[group.id] = "dormant";
      this.lightwingEncounterReengageCooldown[group.id] = 0;
      this.lightwingRespawnAt[group.id] = -1;
      this.encounterRespawnOffscreenTime.delete(group.id);
      this.disengagedEncounterResetPending.delete(group.id);
    }
    this.stageEncounter = "dormant";
    this.activeEncounterGroupId = null;
  }

  private resetAllDepthsGroupsForRespawn(): void {
    if (!this.depthsEnemies) return;
    for (const group of DEPTHS_ENCOUNTERS) {
      this.resetDepthsEncounterGroupWithReward(group.id, false, this.depthsEnemies);
      this.depthsEncounterStates[group.id] = "dormant";
      this.depthsEncounterReengageCooldown[group.id] = 0;
      this.depthsRespawnAt[group.id] = -1;
      this.encounterRespawnOffscreenTime.delete(group.id);
      this.disengagedEncounterResetPending.delete(group.id);
    }
    this.stageEncounter = "dormant";
    this.activeEncounterGroupId = null;
  }

  private resetLightwingForDevWarp(): void {
    this.primaryCrystalActivated = false;
    this.secondaryCrystalActivated = false;
    this.crystalPathUnlocked = false;
    this.primaryCrystalTimer = -1;
    this.secondaryCrystalTimer = -1;
    this.crystalPlatformSoundStep = -1;
    this.resetAllLightwingGroupsForRespawn();
  }

  private resetDepthsForDevWarp(): void {
    this.spiritLampActivated = false;
    this.stoneWedgeActivated = false;
    this.depthsCentralGateOpened = false;
    this.depthsCentralGateUnlockTimer = -1;
    this.restorationCrystalCooldown = 0;
    this.depthsBossDoorExplained = false;
    this.resetAllDepthsGroupsForRespawn();
  }

  /**
   * Tie platform visibility to the cue queue rather than raw elapsed time.
   * A slow frame can therefore never reveal all five stones before their
   * individual impact sounds have been emitted on later frames.
   */
  private getCrystalPlatformAnimationProgress(): number {
    if (this.crystalPlatformSoundStep <= 0) return 0;
    const elapsed = CRYSTAL_PLATFORM_RISE_DURATION - this.secondaryCrystalTimer;
    const activeStep = this.crystalPlatformSoundStep - 1;
    const rise = Math.min(
      0.999,
      Math.max(0, elapsed - activeStep * CRYSTAL_PLATFORM_RISE_INTERVAL) /
        CRYSTAL_PLATFORM_RISE_LIFT_DURATION,
    );
    return Math.min(0.999, (activeStep + rise) / 5);
  }

  private updateEncounterRespawns(delta: number): void {
    if (this.isFieldEnemyRespawnBlocked()) return;
    if (this.room?.id === "mossRootRuins") {
      for (const group of MOSS_ROOT_ENCOUNTERS) {
        const disengaged = this.disengagedEncounterResetPending.has(group.id);
        if ((this.encounterStates[group.id] !== "cleared" && !disengaged) || this.mossRespawnAt[group.id] < 0) continue;
        if (!this.canRespawnGroup(group.id, this.mossRespawnAt[group.id], delta)) continue;
        this.resetMossRootEncounterGroupWithReward(group.id, disengaged);
        this.encounterStates[group.id] = "dormant";
        this.mossRespawnAt[group.id] = -1;
        this.encounterRespawnOffscreenTime.delete(group.id);
        this.disengagedEncounterResetPending.delete(group.id);
        this.stageEncounter = "dormant";
      }
    } else if (this.room?.id === "lightwingCrystalCavern") {
      for (const group of LIGHTWING_ENCOUNTERS) {
        const disengaged = this.disengagedEncounterResetPending.has(group.id);
        if ((this.lightwingEncounterStates[group.id] !== "cleared" && !disengaged) || this.lightwingRespawnAt[group.id] < 0) continue;
        if (!this.canRespawnGroup(group.id, this.lightwingRespawnAt[group.id], delta)) continue;
        this.resetLightwingEncounterGroupWithReward(group.id, disengaged);
        this.lightwingEncounterStates[group.id] = "dormant";
        this.lightwingRespawnAt[group.id] = -1;
        this.encounterRespawnOffscreenTime.delete(group.id);
        this.disengagedEncounterResetPending.delete(group.id);
        this.stageEncounter = "dormant";
      }
    } else if (this.room?.id === "spiritClothStonescaleDepths") {
      for (const group of DEPTHS_ENCOUNTERS) {
        const disengaged = this.disengagedEncounterResetPending.has(group.id);
        if ((this.depthsEncounterStates[group.id] !== "cleared" && !disengaged) || this.depthsRespawnAt[group.id] < 0) continue;
        if (!this.canRespawnGroup(group.id, this.depthsRespawnAt[group.id], delta)) continue;
        this.resetDepthsEncounterGroupWithReward(group.id, disengaged);
        this.depthsEncounterStates[group.id] = "dormant";
        this.depthsRespawnAt[group.id] = -1;
        this.encounterRespawnOffscreenTime.delete(group.id);
        this.disengagedEncounterResetPending.delete(group.id);
        this.stageEncounter = "dormant";
      }
    }
  }

  private canRespawnGroup(
    groupId: StageEncounterGroupId,
    readyAt: number,
    delta: number,
  ): boolean {
    if (this.time < readyAt) {
      this.encounterRespawnOffscreenTime.delete(groupId);
      return false;
    }
    const points = this.respawnPresentationPoints(groupId);
    if (
      points.length === 0 ||
      points.some((point) => !this.isEnemyPositionWalkable(point.pos, point.radius)) ||
      !isFieldEnemyGroupOutsideExpandedCamera(points, this.stageCamera.snapshot)
    ) {
      this.encounterRespawnOffscreenTime.delete(groupId);
      return false;
    }
    const offscreenTime = (this.encounterRespawnOffscreenTime.get(groupId) ?? 0) + delta;
    this.encounterRespawnOffscreenTime.set(groupId, offscreenTime);
    return offscreenTime >= FIELD_ENEMY_RESPAWN_OFFSCREEN_HOLD;
  }

  private respawnPresentationPoints(groupId: StageEncounterGroupId): FieldEnemyRespawnPoint[] {
    const ids = new Set(this.enemyIdsForEncounterGroup(groupId));
    const points: FieldEnemyRespawnPoint[] = [];
    for (const enemy of this.enemies) {
      if (!ids.has(enemy.id)) continue;
      points.push({ pos: { ...enemy.idleAnchor }, radius: enemy.radius });
      // A surviving enemy may have chased far from home. It must also be fully
      // offscreen before resetting, otherwise it visibly teleports home.
      if (enemy.alive && distance(enemy.pos, enemy.idleAnchor) > 0.5) {
        points.push({ pos: { ...enemy.pos }, radius: enemy.radius });
      }
    }
    return points;
  }

  private isFieldEnemyRespawnBlocked(): boolean {
    return this.stageCombatActive ||
      this.stageEncounter === "active" || this.stageEncounter === "noticed" ||
      this.roomTransitionPhase !== "none" || this.dialogue !== null ||
      this.isNearLayerTransitionBoundary() ||
      this.gateUnlockTimer >= 0 ||
      this.primaryCrystalTimer >= 0 || this.secondaryCrystalTimer >= 0 ||
      this.healingSpringPhase !== "idle" ||
      this.depthsCentralGateUnlockTimer >= 0;
  }

  /** Prevent a group from becoming visible during the frame that starts a layer fade. */
  private isNearLayerTransitionBoundary(): boolean {
    const position = this.active.pos;
    const approachMargin = 96;
    if (this.room?.id === "mossRootRuins") {
      return position.y <= MOSS_ROOT_RUINS.layerGate.y + approachMargin &&
        Math.abs(position.x - MOSS_ROOT_RUINS.layerGate.x) <= MOSS_ROOT_RUINS.layerGateHalfWidth + 64;
    }
    if (this.room?.id === "lightwingCrystalCavern") {
      const nearNorth = position.y <= LIGHTWING_CRYSTAL_CAVERN.layerGate.y + approachMargin &&
        Math.abs(position.x - LIGHTWING_CRYSTAL_CAVERN.layerGate.x) <= LIGHTWING_CRYSTAL_CAVERN.layerGateHalfWidth + 64;
      const nearSouth = position.y >= LIGHTWING_CRYSTAL_CAVERN.returnGate.y - approachMargin &&
        Math.abs(position.x - LIGHTWING_CRYSTAL_CAVERN.returnGate.x) <= LIGHTWING_CRYSTAL_CAVERN.returnGateHalfWidth + 64;
      return nearNorth || nearSouth;
    }
    if (this.room?.id === "spiritClothStonescaleDepths") {
      const nearNorth = position.y <= SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoor.y + approachMargin &&
        Math.abs(position.x - SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoor.x) <= SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoorHalfWidth + 64;
      const nearSouth = position.y >= SPIRIT_CLOTH_STONESCALE_DEPTHS.returnGate.y - approachMargin &&
        Math.abs(position.x - SPIRIT_CLOTH_STONESCALE_DEPTHS.returnGate.x) <= SPIRIT_CLOTH_STONESCALE_DEPTHS.returnGateHalfWidth + 64;
      return nearNorth || nearSouth;
    }
    return false;
  }

  private activateMossEncounter(): void {
    if (this.stageEncounter !== "noticed") return;
    this.addNearbyDormantEncounterGroups("noticed");
    this.stageEncounter = "active";
    this.encounterDisengageTimer = 0;
    for (const groupId of this.activeEncounterGroupIds) {
      this.setEncounterGroupState(groupId, "active");
      this.activateEncounterGroupEnemies(groupId);
    }
    this.stageEncounterNoticeEnemyId = null;
    this.beginStageCombat();
    this.encounterGrace = 0.75;
    this.showBanner("モスプルンの群れが現れた", 1.8);
  }

  private updateStageEncounterClear(delta: number): void {
    if (this.stageEncounter !== "active") return;
    this.joinNearbyDormantEncounterGroups();
    const activeIds = this.activeEncounterGroupIds.size > 0
      ? this.enemyIdsForActiveEncounter()
      : this.enemies.map((enemy) => enemy.id);
    for (const groupId of this.activeEncounterGroupIds) {
      const groupIds = this.enemyIdsForEncounterGroup(groupId);
      if (!this.enemies.some((enemy) => enemy.alive && groupIds.includes(enemy.id))) {
        this.markEncounterGroupCleared(groupId);
      }
    }
    if (this.enemies.some((enemy) => enemy.alive && activeIds.includes(enemy.id))) {
      this.encounterClearTimer = -1;
      return;
    }
    if (this.encounterClearTimer < 0) this.encounterClearTimer = 0.72;
    this.encounterClearTimer -= delta;
    if (this.encounterClearTimer > 0) return;
    this.encounterClearTimer = -1;
    this.encounterDisengageTimer = 0;
    this.enemyDirector.reset(this.enemies);

    if (this.room?.id === "mossCorridor") this.mossEncounterCleared = true;
    this.stageEncounter = "cleared";
    this.encounterGrace = 0;
    this.clearActiveCombatObjects();
    this.endStageCombat();
    this.showBanner("戦闘終了", 1.1);
    this.activeEncounterGroupId = null;
  }

  /** Development-only entry point; invoked only by query-gated setup in main.ts. */
  public setStageEncounterForQa(state: "dormant" | "noticed" | "active" | "cleared"): void {
    if (this.mode === "stage" && this.room?.id === "mossRootRuins") {
      this.setMossRootEncounterForQa("mossIntro", state);
      return;
    }
    if (this.mode !== "stage" || this.room?.id !== "mossCorridor") return;
    this.encounterNoticeTimer = -1;
    this.encounterClearTimer = -1;
    this.mossEncounterCleared = state === "cleared";
    if (state === "cleared") {
      this.stageEncounter = "cleared";
      this.enemies = [];
      this.endStageCombat();
      return;
    }
    if (this.enemies.filter((enemy) => enemy.kind === "mossPlun").length !== 3) {
      this.enemies = this.createMossCorridorEncounterEnemies();
    }
    if (state === "active") {
      this.stageEncounter = "noticed";
      this.activateMossEncounter();
    } else if (state === "noticed") {
      this.stageEncounter = "noticed";
      this.stageEncounterNoticeEnemyId = 1;
      this.encounterNoticeTimer = Number.POSITIVE_INFINITY;
      this.beginStageCombat();
    } else {
      this.stageEncounter = state;
      this.endStageCombat();
    }
  }

  /** Development-only deterministic encounter setup for scrolling-stage QA. */
  public setMossRootEncounterForQa(
    groupId: EncounterGroupId,
    state: EncounterGroupState,
  ): void {
    if (this.mode !== "stage" || this.room?.id !== "mossRootRuins") return;
    this.encounterNoticeTimer = -1;
    this.encounterClearTimer = -1;
    this.encounterDisengageTimer = 0;
    this.encounterReengageCooldown[groupId] = 0;
    this.activeEncounterGroupId = null;
    this.stageEncounterNoticeEnemyId = null;
    this.endStageCombat();
    const ids = this.enemyIdsForEncounter(groupId);
    this.encounterStates[groupId] = state;
    for (const enemy of this.enemies) {
      if (!ids.includes(enemy.id)) continue;
      enemy.alive = state !== "cleared";
      enemy.aware = false;
      enemy.aiState = "idle";
      enemy.stateAge = 0;
      enemy.stateTimer = 0;
      enemy.hasAttackToken = false;
    }
    if (state === "active" || state === "noticed") {
      const qaPosition: Record<EncounterGroupId, Vec2> = {
        mossIntro: MOSS_ROOT_LANDMARKS.introPlaza,
        mossFork: MOSS_ROOT_LANDMARKS.centralPlaza,
        mossDeadEnd: MOSS_ROOT_LANDMARKS.rightPlaza,
        mossGate: MOSS_ROOT_LANDMARKS.finalPlaza,
      };
      this.placePartyAtRoomSpawn(qaPosition[groupId]);
      this.stageCamera.snapTo(this.active.pos);
      this.activeEncounterGroupId = groupId;
      this.stageEncounter = "noticed";
      this.stageEncounterNoticeEnemyId = ids[0] ?? null;
      if (state === "active") this.activateMossEncounter();
      else {
        this.encounterNoticeTimer = Number.POSITIVE_INFINITY;
        this.beginStageCombat();
      }
    } else {
      this.stageEncounter = state;
      this.enemyDirector.reset(this.enemies);
    }
  }

  /** Development-only deterministic Layer 2 encounter setup.  Keeping this
   * alongside the Layer 1 helper makes it possible to verify that encounter
   * ownership, formation, and battle music stay in sync on every layer. */
  public setLightwingEncounterForQa(
    groupId: LightwingEncounterGroupId,
    state: LightwingEncounterGroupState,
  ): void {
    if (this.mode !== "stage" || this.room?.id !== "lightwingCrystalCavern") return;
    this.stageEncounterDetectionSuppressed = true;
    this.encounterNoticeTimer = -1;
    this.encounterClearTimer = -1;
    this.encounterDisengageTimer = 0;
    this.lightwingEncounterReengageCooldown[groupId] = 0;
    this.activeEncounterGroupId = null;
    this.stageEncounterNoticeEnemyId = null;
    this.endStageCombat();
    const ids = this.enemyIdsForLightwingEncounter(groupId);
    this.lightwingEncounterStates[groupId] = state;
    for (const enemy of this.enemies) {
      if (!ids.includes(enemy.id)) continue;
      enemy.alive = state !== "cleared";
      enemy.aware = false;
      enemy.aiState = "idle";
      enemy.stateAge = 0;
      enemy.stateTimer = 0;
      enemy.hasAttackToken = false;
    }
    if (state === "active" || state === "noticed") {
      this.placePartyAtRoomSpawn(LIGHTWING_SAFE_GROUP_ANCHORS[groupId]);
      this.stageCamera.snapTo(this.active.pos);
      this.activeEncounterGroupId = groupId;
      this.stageEncounter = "noticed";
      this.stageEncounterNoticeEnemyId = ids[0] ?? null;
      if (state === "active") this.activateLightwingEncounter();
      else {
        this.encounterNoticeTimer = Number.POSITIVE_INFINITY;
        this.beginStageCombat();
      }
    } else {
      this.stageEncounter = state;
      this.enemyDirector.reset(this.enemies);
    }
  }

  /** Development-only deterministic Layer 3 encounter setup.  This does not
   * alter authored homes or encounter rules; it only gives visual and manual
   * QA a stable way to inspect active-group combat. */
  public setDepthsEncounterForQa(
    groupId: DepthsEncounterGroupId,
    state: DepthsEncounterGroupState,
  ): void {
    if (this.mode !== "stage" || this.room?.id !== "spiritClothStonescaleDepths") return;
    this.stageEncounterDetectionSuppressed = true;
    this.encounterNoticeTimer = -1;
    this.encounterClearTimer = -1;
    this.encounterDisengageTimer = 0;
    this.depthsEncounterReengageCooldown[groupId] = 0;
    this.activeEncounterGroupId = null;
    this.stageEncounterNoticeEnemyId = null;
    this.endStageCombat();
    const ids = this.enemyIdsForDepthsEncounter(groupId);
    this.depthsEncounterStates[groupId] = state;
    for (const enemy of this.enemies) {
      if (!ids.includes(enemy.id)) continue;
      enemy.alive = state !== "cleared";
      enemy.aware = false;
      enemy.aiState = "idle";
      enemy.stateAge = 0;
      enemy.stateTimer = 0;
      enemy.hasAttackToken = false;
    }
    if (state === "active" || state === "noticed") {
      this.placePartyAtRoomSpawn(DEPTHS_SAFE_GROUP_ANCHORS[groupId]);
      this.stageCamera.snapTo(this.active.pos);
      this.activeEncounterGroupId = groupId;
      this.stageEncounter = "noticed";
      this.stageEncounterNoticeEnemyId = ids[0] ?? null;
      if (state === "active") this.activateDepthsEncounter();
      else {
        this.encounterNoticeTimer = Number.POSITIVE_INFINITY;
        this.beginStageCombat();
      }
    } else {
      this.stageEncounter = state;
      this.enemyDirector.reset(this.enemies);
    }
  }

  /** Development-only setup for validating simultaneous nearby groups. */
  public setDepthsMultiEncounterForQa(
    primary: DepthsEncounterGroupId,
    secondary: DepthsEncounterGroupId,
  ): void {
    this.setDepthsEncounterForQa(primary, "active");
    if (this.room?.id !== "spiritClothStonescaleDepths" || primary === secondary) return;
    this.stageEncounterDetectionSuppressed = false;
    this.depthsEncounterStates[secondary] = "dormant";
    this.depthsEncounterReengageCooldown[secondary] = 0;
    const ids = this.enemyIdsForDepthsEncounter(secondary);
    const occupied = this.enemies
      .filter((enemy) => enemy.alive && !ids.includes(enemy.id))
      .map((enemy) => ({ pos: enemy.pos, radius: enemy.radius }));
    const reachable = depthsReachableTiles(this.depthsCentralGateOpened);
    ids.forEach((enemyId, index) => {
      const enemy = this.enemies.find((candidate) => candidate.id === enemyId);
      if (!enemy) return;
      const desired = {
        x: this.active.pos.x + 88 + index * 28,
        y: this.active.pos.y + (index % 2 === 0 ? -34 : 34),
      };
      const safe = findNearestSafeDepthsEnemySpawn(
        desired,
        enemy.radius,
        enemy.kind,
        occupied,
        reachable,
      );
      if (!safe) return;
      enemy.pos = { ...safe };
      enemy.idleAnchor = { ...safe };
      enemy.idleTarget = { ...safe };
      enemy.reservedPos = { ...safe };
      enemy.aware = false;
      this.setEnemyState(enemy, "idle", 0);
      occupied.push({ pos: safe, radius: enemy.radius });
    });
  }

  /** Development/test-only gate animation trigger.  Normal play reaches the
   * same path exclusively through the two authored devices. */
  public tryOpenDepthsCentralGateForQa(): void {
    if (this.mode !== "stage" || this.room?.id !== "spiritClothStonescaleDepths") return;
    this.tryOpenDepthsCentralGate();
  }

  /** Development-only camera/interaction setup for Layer 2 visual QA. */
  public setLightwingCrystalCavernForQa(area: string): void {
    if (this.mode !== "stage" || this.room?.id !== "lightwingCrystalCavern") return;
    const positions: Record<string, Vec2> = {
      arrival: LIGHTWING_CRYSTAL_CAVERN.spawn,
      "intro-battle": lightwingSourceToWorld({ x: 470, y: 760 }),
      "primary-crystal": lightwingSourceToWorld({ x: 338, y: 205 }),
      "dead-end": lightwingSourceToWorld({ x: 300, y: 195 }),
      "mixed-battle": lightwingSourceToWorld({ x: 155, y: 600 }),
      "healing-spring": lightwingSourceToWorld({ x: 570, y: 431 }),
      "secondary-crystal": lightwingSourceToWorld({ x: 204, y: 638 }),
      "platforms-locked": lightwingSourceToWorld({ x: 760, y: 395 }),
      "platforms-open": lightwingSourceToWorld({ x: 1000, y: 380 }),
      "final-battle": lightwingSourceToWorld({ x: 1415, y: 245 }),
      "floor3-gate": { ...LIGHTWING_CRYSTAL_CAVERN.layerGateInnerSpawn },
      "outer-boundary": lightwingSourceToWorld({ x: 782, y: 415 }),
    };
    const target = positions[area];
    if (!target) return;
    if (area === "platforms-open" || area === "final-battle" || area === "floor3-gate") {
      this.primaryCrystalActivated = true;
      this.secondaryCrystalActivated = true;
      this.crystalPathUnlocked = true;
    }
    if (area === "floor3-gate") {
      this.lightwingEncounterStates.lightwingNest = "cleared";
      this.lightwingLayerGateUnlocked = true;
    }
    this.placePartyAtRoomSpawn(target);
    this.stageCamera.snapTo(this.active.pos);
  }

  /** Development-only Layer 3 travel points. They suppress encounters so
   * renderer and collision QA can inspect each authored zone in isolation. */
  public setSpiritClothStonescaleDepthsForQa(area: string): void {
    if (this.mode !== "stage" || this.room?.id !== "spiritClothStonescaleDepths") return;
    this.stageEncounterDetectionSuppressed = true;
    const positions: Record<string, Vec2> = {
      arrival: SPIRIT_CLOTH_STONESCALE_DEPTHS.spawn,
      "spirit-entry": depthsSourceToWorld({ x: 480, y: 560 }),
      "spirit-lamp": depthsSourceToWorld({ x: 205, y: 285 }),
      "stone-passage": depthsSourceToWorld({ x: 1150, y: 680 }),
      "stone-wedge": depthsSourceToWorld({ x: 1445, y: 260 }),
      "central-gate": depthsSourceToWorld({ x: 835, y: 375 }),
      antechamber: { ...SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoorInnerSpawn },
      "restoration-crystal": depthsSourceToWorld({ x: 930, y: 145 }),
      "narrow-formation": depthsSourceToWorld({ x: 835, y: 390 }),
    };
    const target = positions[area];
    if (!target) return;
    if (area === "antechamber" || area === "restoration-crystal") {
      this.spiritLampActivated = true;
      this.stoneWedgeActivated = true;
      this.depthsCentralGateOpened = true;
    }
    this.placePartyAtRoomSpawn(target);
    this.collapseStageFormation();
    this.stageCamera.snapTo(this.active.pos);
  }

  /** Development-only spawn review: keeps all fourteen authored homes alive
   * and suppresses encounter activation while QA scrolls between groups. */
  public setLightwingSpawnQaAll(): void {
    if (this.mode !== "stage" || this.room?.id !== "lightwingCrystalCavern") return;
    this.stageEncounterDetectionSuppressed = true;
    for (const group of LIGHTWING_ENCOUNTERS) {
      this.lightwingEncounterStates[group.id] = "dormant";
      this.lightwingEncounterReengageCooldown[group.id] = 0;
    }
    this.placePartyAtRoomSpawn({ ...LIGHTWING_CRYSTAL_CAVERN.spawn });
    this.collapseStageFormation();
    this.stageCamera.snapTo(this.active.pos);
  }

  /** Development-only sanctuary states. The party remains outside the solid
   * pool so collision and foreground overlap can be inspected honestly. */
  public setLightwingSpringForQa(
    state: "idle" | "charging" | "healing" | "afterglow" | "damaged-party" | "downed-member" | "context",
  ): void {
    if (this.mode !== "stage" || this.room?.id !== "lightwingCrystalCavern") return;
    this.stageEncounterDetectionSuppressed = true;
    this.placePartyAtRoomSpawn(state === "context"
      ? lightwingSourceToWorld({ x: 650, y: 450 })
      : lightwingSourceToWorld({ x: 570, y: 431 }));
    this.collapseStageFormation();
    const kyle = this.getMember("kyle");
    const nadi = this.getMember("nadi");
    const meru = this.getMember("meru");
    if (state === "damaged-party" || state === "downed-member") {
      kyle.hp = Math.max(1, Math.floor(kyle.maxHp * 0.35));
      nadi.hp = state === "downed-member" ? 0 : Math.max(1, Math.floor(nadi.maxHp * 0.45));
      nadi.downed = state === "downed-member";
      meru.hp = Math.max(1, Math.floor(meru.maxHp * 0.5));
      meru.mp = 4;
    }
    const phase = state === "damaged-party" || state === "downed-member" || state === "context" ? "idle" : state;
    this.healingSpringPhase = phase;
    this.healingSpringPhaseTime = phase === "idle" ? 0 : phase === "charging"
      ? LIGHTWING_SPRING_CHARGING_DURATION * 0.55
      : phase === "healing" ? LIGHTWING_SPRING_HEALING_DURATION * 0.55
      : LIGHTWING_SPRING_AFTERGLOW_DURATION * 0.35;
    this.springInteractionCooldown = 0;
    this.stageCamera.snapTo(this.active.pos);
  }

  /** Development-only retreat setup: starts an encounter, then places the leader beyond escape range. */
  public setMossRootDisengageForQa(groupId: EncounterGroupId): void {
    this.setMossRootEncounterForQa(groupId, "active");
    if (this.activeEncounterGroupId !== groupId) return;
    const retreatPositions: Record<EncounterGroupId, Vec2> = {
      mossIntro: MOSS_ROOT_LANDMARKS.centralPlaza,
      mossFork: MOSS_ROOT_LANDMARKS.transferPlaza,
      mossDeadEnd: MOSS_ROOT_LANDMARKS.centralPlaza,
      mossGate: MOSS_ROOT_LANDMARKS.transferPlaza,
    };
    this.active.pos = findNearestMossRootWalkablePosition(
      retreatPositions[groupId],
      this.active.radius,
      this.mossRootCollisionOptions(),
    ) ?? { ...MOSS_ROOT_RUINS.spawn };
    this.active.formationSlot = { ...this.active.pos };
    this.active.velocity = vec();
    this.stageCamera.snapTo(this.active.pos);
    this.encounterDisengageTimer = 0;
  }

  /** Development-only all-cleared state used by the layer overview QA. */
  public clearAllMossRootEncountersForQa(): void {
    if (this.mode !== "stage" || this.room?.id !== "mossRootRuins") return;
    for (const group of MOSS_ROOT_ENCOUNTERS) this.encounterStates[group.id] = "cleared";
    for (const enemy of this.enemies) enemy.alive = false;
    this.activeEncounterGroupId = null;
    this.stageEncounter = "cleared";
    this.encounterDisengageTimer = 0;
    this.endStageCombat();
    this.enemyDirector.reset(this.enemies);
  }

  /** Development-only camera landmark positioning. */
  public setStageCameraQa(
    position:
      | "start"
      | "center"
      | "top"
      | "left-intro"
      | "water-ruins"
      | "left-junction"
      | "crossing"
      | "crystal-bridge"
      | "right-battle"
      | "root-maze"
      | "former-spring"
      | "nav-water"
      | "waterfall"
      | "nav-dark-lower"
      | "nav-dark-upper"
      | "final",
  ): void {
    if (this.mode !== "stage" || this.room?.id !== "mossRootRuins") return;
    this.stageEncounterDetectionSuppressed = true;
    const positions = {
      start: MOSS_ROOT_RUINS.spawn,
      center: MOSS_ROOT_LANDMARKS.centralPlaza,
      top: MOSS_ROOT_RUINS.layerGateInnerSpawn,
      "left-intro": MOSS_ROOT_LANDMARKS.introPlaza,
      "water-ruins": MOSS_ROOT_LANDMARKS.waterRuins,
      "left-junction": MOSS_ROOT_LANDMARKS.centralPlaza,
      crossing: MOSS_ROOT_LANDMARKS.crossing,
      "crystal-bridge": mossRootBackdropSourceToWorld({ x: 1015, y: 548 }),
      "right-battle": MOSS_ROOT_LANDMARKS.rightPlaza,
      "root-maze": MOSS_ROOT_LANDMARKS.rootMaze,
      "former-spring": MOSS_ROOT_LANDMARKS.waterRuins,
      "nav-water": mossRootBackdropSourceToWorld({ x: 850, y: 570 }),
      waterfall: mossRootBackdropSourceToWorld({ x: 850, y: 460 }),
      "nav-dark-lower": mossRootBackdropSourceToWorld({ x: 650, y: 930 }),
      "nav-dark-upper": mossRootBackdropSourceToWorld({ x: 690, y: 790 }),
      final: MOSS_ROOT_LANDMARKS.finalPlaza,
    } as const;
    const target = positions[position];
    this.placePartyAtRoomSpawn(target);
    this.collapseStageFormation();
    this.stageCamera.snapTo(
      position === "crossing"
        ? { x: MOSS_ROOT_LANDMARKS.crossing.x, y: MOSS_ROOT_LANDMARKS.crossing.y - 120 }
        : position === "nav-water" || position === "waterfall"
          ? target
          : this.active.pos,
    );
  }

  /** Development-only landmark states used by the interaction visual QA. */
  public setMossRootLandmarkForQa(
    state:
      | "crystal-near"
      | "crystal-touch"
      | "root-gate-closed"
      | "root-gate-open",
  ): void {
    if (this.mode !== "stage" || this.room?.id !== "mossRootRuins") return;
    this.stageEncounterDetectionSuppressed = true;
    this.gateUnlockTimer = -1;
    this.northGateUnlocked = false;
    const positions = {
      "crystal-near": { x: MOSS_ROOT_RUINS.crystal.x - 74, y: MOSS_ROOT_RUINS.crystal.y + 4 },
      "crystal-touch": { x: MOSS_ROOT_RUINS.crystal.x - 46, y: MOSS_ROOT_RUINS.crystal.y + 4 },
      "root-gate-closed": MOSS_ROOT_GATE_TRANSFORM.approach,
      "root-gate-open": MOSS_ROOT_GATE_TRANSFORM.approach,
    } as const;
    if (state === "crystal-near") {
      this.showBanner("クリスタルがまばゆい光を放っている", 1.2);
    }
    if (state === "crystal-touch") {
      this.gateUnlockTimer = ROOT_GATE_OPEN_DURATION - 0.38;
      this.showBanner("クリスタルの光が根へ流れはじめた", 0.78);
    }
    if (state === "root-gate-open") this.northGateUnlocked = true;
    this.placePartyAtRoomSpawn(positions[state]);
    this.collapseStageFormation();
    this.stageCamera.snapTo(this.active.pos);
  }

  /** Development-only fixed-dialogue states for visual QA. */
  public setDialogueForQa(source: string): void {
    if (this.mode !== "stage") return;
    this.stageEncounterDetectionSuppressed = true;
    const dialogueQa: Record<string, { room: RoomId; pos: Vec2; id: DialogueSourceId; pages: readonly string[] }> = {
      "crystal-touch": { room: "mossRootRuins", pos: { x: MOSS_ROOT_RUINS.crystal.x - 46, y: MOSS_ROOT_RUINS.crystal.y }, id: "mossCrystalActivate", pages: ["クリスタルの奥で、強い光が脈打っている。", "光が遺跡の根へ流れ込んでいく……。"] },
      "root-open-result": { room: "mossRootRuins", pos: { ...MOSS_ROOT_GATE_TRANSFORM.approach }, id: "mossCrystalResult", pages: ["絡み合っていた大きな根がほどけ、奥への道が開いた。"] },
      "primary-crystal": { room: "lightwingCrystalCavern", pos: lightwingSourceToWorld({ x: 338, y: 205 }), id: "lightwingPrimaryActivate", pages: ["晶石の奥で、眠っていた光が目を覚ます。"] },
      "platform-complete": { room: "lightwingCrystalCavern", pos: lightwingSourceToWorld({ x: 760, y: 395 }), id: "lightwingPathResult", pages: ["石畳の橋が湖上に現れ、対岸へ渡れるようになった。"] },
    };
    const entry = dialogueQa[source];
    if (!entry) return;
    if (source === "root-open-result") this.northGateUnlocked = true;
    if (this.room?.id !== entry.room) this.configureStageRoom((STAGE_ROOMS as Record<RoomId, StageRoomDefinition>)[entry.room], entry.pos);
    else this.placePartyAtRoomSpawn(entry.pos);
    this.stageCamera.snapTo(this.active.pos);
    this.openDialogue(entry.id, entry.pages);
  }

  /** Development-only deterministic edge transition state. */
  public setLayerTransitionForQa(
    direction:
      | "to-layer2"
      | "to-layer1"
      | "arrival"
      | "to-layer3"
      | "to-layer2-from-layer3"
      | "to-boss"
      | "to-depths",
  ): void {
    if (this.mode !== "stage") return;
    this.stageEncounterDetectionSuppressed = true;
    if (direction === "to-layer2") {
      this.mossLayerGateUnlocked = true;
      if (this.room?.id !== "mossRootRuins") this.configureStageRoom(MOSS_ROOT_RUINS_ROOM);
      this.placePartyAtRoomSpawn({ x: MOSS_ROOT_RUINS.layerGate.x, y: 24 });
    } else if (direction === "to-layer1" || direction === "arrival") {
      const room = (STAGE_ROOMS as Record<RoomId, StageRoomDefinition>).lightwingCrystalCavern;
      if (this.room?.id !== "lightwingCrystalCavern") this.configureStageRoom(room);
      this.placePartyAtRoomSpawn(direction === "arrival"
        ? { ...LIGHTWING_CRYSTAL_CAVERN.returnGateInnerSpawn }
        : { x: LIGHTWING_CRYSTAL_CAVERN.returnGate.x, y: LIGHTWING_CRYSTAL_CAVERN.height - 24 });
    } else if (direction === "to-layer3") {
      const room = (STAGE_ROOMS as Record<RoomId, StageRoomDefinition>).lightwingCrystalCavern;
      if (this.room?.id !== "lightwingCrystalCavern") this.configureStageRoom(room);
      this.primaryCrystalActivated = true;
      this.secondaryCrystalActivated = true;
      this.crystalPathUnlocked = true;
      this.lightwingEncounterStates.lightwingNest = "cleared";
      this.lightwingLayerGateUnlocked = true;
      this.placePartyAtRoomSpawn({ ...LIGHTWING_CRYSTAL_CAVERN.layerGate });
    } else if (direction === "to-layer2-from-layer3") {
      const room = (STAGE_ROOMS as Record<RoomId, StageRoomDefinition>).spiritClothStonescaleDepths;
      if (this.room?.id !== "spiritClothStonescaleDepths") this.configureStageRoom(room);
      this.placePartyAtRoomSpawn({
        x: SPIRIT_CLOTH_STONESCALE_DEPTHS.returnGate.x,
        y: SPIRIT_CLOTH_STONESCALE_DEPTHS.height - 24,
      }, { x: 0, y: 1 });
    } else if (direction === "to-boss") {
      const room = (STAGE_ROOMS as Record<RoomId, StageRoomDefinition>).spiritClothStonescaleDepths;
      if (this.room?.id !== "spiritClothStonescaleDepths") this.configureStageRoom(room);
      this.spiritLampActivated = true;
      this.stoneWedgeActivated = true;
      this.depthsCentralGateOpened = true;
      this.placePartyAtRoomSpawn({ x: SPIRIT_CLOTH_STONESCALE_DEPTHS.bossDoor.x, y: 24 });
    } else {
      const room = (STAGE_ROOMS as Record<RoomId, StageRoomDefinition>).crystalAltar;
      if (this.room?.id !== "crystalAltar") this.configureStageRoom(room);
      this.velgran.resetForRetreat();
      this.placePartyAtRoomSpawn({ x: CRYSTAL_ALTAR.spawn.x, y: CRYSTAL_ALTAR.retreatY - 24 }, { x: 0, y: 1 });
    }
    this.stageCamera.snapTo(this.active.pos);
    this.layerTransitionCooldown = 0;
  }

  /** Development-only deterministic cleared group used by respawn QA/tests. */
  public setFieldEnemyRespawnForQa(groupId: StageEncounterGroupId, cameraFocus: Vec2): void {
    if (
      this.mode !== "stage" ||
      (this.room?.id !== "mossRootRuins" && this.room?.id !== "lightwingCrystalCavern" && this.room?.id !== "spiritClothStonescaleDepths") ||
      !this.currentEncounterDefinitions().some((group) => group.id === groupId)
    ) return;
    this.stageEncounterDetectionSuppressed = true;
    this.clearActiveCombatObjects();
    this.endStageCombat();
    this.activeEncounterGroupId = null;
    this.stageEncounter = "cleared";
    this.setEncounterGroupState(groupId, "cleared");
    this.disengagedEncounterResetPending.delete(groupId);
    this.encounterRespawnOffscreenTime.delete(groupId);
    if (this.room?.id === "spiritClothStonescaleDepths") {
      this.depthsRespawnAt[groupId as DepthsEncounterGroupId] = this.time;
    } else if (this.room?.id === "lightwingCrystalCavern") {
      this.lightwingRespawnAt[groupId as LightwingEncounterGroupId] = this.time;
    } else {
      this.mossRespawnAt[groupId as EncounterGroupId] = this.time;
    }
    const ids = new Set(this.enemyIdsForEncounterGroup(groupId));
    for (const enemy of this.enemies) {
      if (!ids.has(enemy.id)) continue;
      enemy.hp = 0;
      enemy.alive = false;
      enemy.aware = false;
      enemy.hasAttackToken = false;
    }
    this.placePartyAtRoomSpawn(cameraFocus);
    this.stageCamera.snapTo(this.active.pos);
  }

  /** Development-only Layer 1 visual state at a visible edge or safely far away. */
  public setMossRootRespawnForQa(mode: "edge" | "far" = "far"): void {
    if (this.mode !== "stage" || this.room?.id !== "mossRootRuins") return;
    this.setFieldEnemyRespawnForQa(
      "mossIntro",
      mode === "edge" ? mossRootBackdropSourceToWorld({ x: 648, y: 1200 }) : { ...MOSS_ROOT_LANDMARKS.centralPlaza },
    );
  }

  /** Development-only partial-defeat path using the real disengage update. */
  public setFieldEnemyPartialDisengageForQa(
    groupId: StageEncounterGroupId,
    cameraFocus: Vec2,
  ): void {
    if (this.mode !== "stage") return;
    if (this.room?.id === "spiritClothStonescaleDepths") {
      this.setDepthsEncounterForQa(groupId as DepthsEncounterGroupId, "active");
    } else if (this.room?.id === "lightwingCrystalCavern") {
      this.setLightwingEncounterForQa(groupId as LightwingEncounterGroupId, "active");
    } else if (this.room?.id === "mossRootRuins") {
      this.setMossRootEncounterForQa(groupId as EncounterGroupId, "active");
    } else return;
    const firstEnemyId = this.enemyIdsForEncounterGroup(groupId)[0];
    if (firstEnemyId !== undefined) this.defeatEnemy(firstEnemyId);
    this.placePartyAtRoomSpawn(cameraFocus);
    this.stageCamera.snapTo(this.active.pos);
    this.encounterDisengageTimer = 0;
  }

  public setMossRootPartialDisengageForQa(mode: "edge" | "far" = "far"): void {
    if (this.room?.id !== "mossRootRuins") return;
    this.setFieldEnemyPartialDisengageForQa(
      "mossIntro",
      mode === "edge" ? mossRootBackdropSourceToWorld({ x: 648, y: 1200 }) : { ...MOSS_ROOT_LANDMARKS.centralPlaza },
    );
  }

  /** Move only the camera focus; useful for proving the continuous hold reset. */
  public setMossRootRespawnViewForQa(mode: "edge" | "far"): void {
    if (this.room?.id !== "mossRootRuins") return;
    this.placePartyAtRoomSpawn(
      mode === "edge" ? mossRootBackdropSourceToWorld({ x: 648, y: 1200 }) : { ...MOSS_ROOT_LANDMARKS.centralPlaza },
    );
    this.stageCamera.snapTo(this.active.pos);
  }

  private handlePlayerActions(input: InputFrame): void {
    const member = this.active;
    if (member.downed) return;
    if (this.mode === "stage" && input.pressed.has("interact")) {
      this.interactWithStage();
    }
    if (input.pressed.has("switch")) this.switchCharacter();
    if (input.held.has("attack")) this.performNormalAttack(this.active, 1, false);
    if (input.pressed.has("special")) this.performSpecial(this.active);
    if (input.pressed.has("ultimate")) this.performUltimate(this.active);
  }

  private updateAutoHeal(): void {
    if (!canMeruAutoHeal(this.party, this.activeId)) return;
    const meru = this.getMember("meru");
    const target = lowestHealthMember(this.party);
    if (!target) return;

    meru.mp -= COMBAT.autoHeal.mpCost;
    meru.cooldowns.autoHeal = COMBAT.autoHeal.cooldown;
    this.beginCharacterAction(meru, "special", 0.38);
    this.healMember(target, COMBAT.autoHeal.amount);
    this.emitAbilityAudio(meru, "special", true);
    this.spawnHealingEffects(target.pos, 13);
  }

  private updateVelgranCompanionAttacks(): void {
    for (const member of this.party) {
      if (member.id === this.activeId || member.downed || member.cooldowns.normal > 0) continue;
      const gap = distance(member.pos, this.velgran.pos);
      const range = member.id === "kyle" ? 62 : 176;
      if (gap > range) continue;
      member.facing = normalize(sub(this.velgran.pos, member.pos), member.facing);
      this.performNormalAttack(member, 0.5, true);
    }
  }

  private performNormalAttack(
    member: CharacterState,
    damageScale: number,
    automatic: boolean,
  ): boolean {
    if (member.cooldowns.normal > 0 || member.downed) return false;
    member.cooldowns.normal = COMBAT.normalCooldown[member.id];
    this.beginCharacterAction(member, "normal", 0.18);
    this.emitAbilityAudio(member, "normal", automatic);
    const tuning = CHARACTER_TUNING[member.id];


    if (member.id === "kyle") {
      const hitPos = add(member.pos, scale(member.facing, 17));
      this.spawnArea({
        owner: member.id,
        team: "party",
        pos: hitPos,
        direction: member.facing,
        radius: 25,
        arc: Math.PI * 0.82,
        damage: tuning.attackDamage,
        damageScale,
        knockback: 20,
        color: "#e7fff6",
        impactStyle: "kyleNormal",
      });
      this.effects.spawn({
        kind: "bladeArc",
        pos: hitPos,
        life: NORMAL_ATTACK_EFFECTS.kyle.slashLife,
        size: NORMAL_ATTACK_EFFECTS.kyle.slashSize,
        color: NORMAL_ATTACK_EFFECTS.kyle.outerColor,
        alpha: 0.86,
        rotation: Math.atan2(member.facing.y, member.facing.x),
      });
      return true;
    }

    if (member.id === "nadi") {
      const releasePos = add(member.pos, scale(member.facing, 11));
      this.spawnProjectile({
        kind: "moonBlade",
        owner: member.id,
        pos: releasePos,
        direction: member.facing,
        speed: 154,
        radius: 7,
        damage: tuning.attackDamage,
        life: 0.92,
        damageScale,
      });
      this.effects.spawn({
        kind: "impactRing",
        pos: releasePos,
        life: NORMAL_ATTACK_EFFECTS.nadi.launchLife,
        size: NORMAL_ATTACK_EFFECTS.nadi.launchSize,
        color: "#9cebe7",
        alpha: 0.82,
      });
      return true;
    }

    const releasePos = add(member.pos, scale(member.facing, 10));
    this.spawnProjectile({
      kind: "phosphor",
      owner: member.id,
      pos: releasePos,
      direction: member.facing,
      speed: 122,
      radius: 4,
      damage: tuning.attackDamage,
      life: 1.25,
      damageScale,
    });
    this.effects.spawn({
      kind: "impactRing",
      pos: releasePos,
      life: NORMAL_ATTACK_EFFECTS.meru.launchLife,
      size: NORMAL_ATTACK_EFFECTS.meru.launchSize,
      color: "#54d4b9",
      alpha: 0.8,
    });
    return true;
  }

  private performSpecial(member: CharacterState): boolean {
    if (member.cooldowns.special > 0 || member.downed) return false;
    if (member.techCharge < 1) {
      this.techFeedback = { character: member.id, required: 1, timer: 0.8 };
      this.emitAudio({ kind: "switch", character: member.id, position: { ...member.pos } });
      return false;
    }
    const tuning = CHARACTER_TUNING[member.id];

    if (member.id === "kyle") {
      member.techCharge -= 1;
      member.cooldowns.special = COMBAT.specialCooldown.kyle;
      const thrustDirection = this.resolveHajinThrustDirection(member);
      member.facing = { ...thrustDirection };
      this.beginCharacterAction(member, "special", 0.28);
      const start = { ...member.pos };
      member.pos = this.resolveCharacterMovement(
        start,
        add(start, scale(thrustDirection, KYLE_HAJIN_THRUST.dashDistance)),
        member.radius,
      );
      const sweepStart = add(start, scale(thrustDirection, KYLE_HAJIN_THRUST.sweepStartOffset));
      const sweepEnd = { ...member.pos };
      this.spawnArea({
        owner: member.id,
        team: "party",
        pos: sweepEnd,
        direction: thrustDirection,
        radius: KYLE_HAJIN_THRUST.sweepRadius,
        terminalRadius: KYLE_HAJIN_THRUST.terminalRadius,
        sweepStart,
        sweepEnd,
        sweepCollisionRadius: KYLE_HAJIN_THRUST.collisionRadius,
        // Attack-area life starts counting during its startup delay, so retain
        // the full authored active window after the spear reaches its frame.
        life: KYLE_HAJIN_THRUST.hitDelay + KYLE_HAJIN_THRUST.hitLifetime,
        delay: KYLE_HAJIN_THRUST.hitDelay,
        activationEffect: "kyleHajin",
        damage: tuning.specialDamage,
        breakArmor: 26,
        knockback: 44,
        color: "#42e0d1",
      });
      this.emitAbilityAudio(member, "special", false);
      return true;
    }

    if (member.id === "nadi") {
      member.techCharge -= 1;
      member.cooldowns.special = COMBAT.specialCooldown.nadi;
      this.beginCharacterAction(member, "special", 0.34);
      this.spawnArea({
        owner: member.id,
        team: "party",
        pos: member.pos,
        radius: 53,
        innerRadius: 7,
        damage: tuning.specialDamage,
        knockback: 32,
        color: "#9cf8f2",
      });
      this.effects.spawn({
        kind: "ring",
        pos: member.pos,
        life: 0.38,
        size: 58,
        color: "#aefcf7",
      });
      this.emitAbilityAudio(member, "special", false);
      return true;
    }

    member.techCharge -= 1;
    member.cooldowns.special = COMBAT.specialCooldown.meru;
    this.beginCharacterAction(member, "special", 0.38);
    for (const target of this.party) {
      if (
        !target.downed &&
        distance(member.pos, target.pos) <= COMBAT.manualHeal.radius
      ) {
        this.healMember(target, COMBAT.manualHeal.amount);
      }
    }
    this.spawnHealingEffects(member.pos, 20);
    this.emitAbilityAudio(member, "special", false);
    return true;
  }

  private performUltimate(member: CharacterState): boolean {
    if (member.cooldowns.ultimate > 0 || member.downed) return false;
    if (member.techCharge < 3) {
      this.techFeedback = { character: member.id, required: 3, timer: 0.8 };
      this.emitAudio({ kind: "switch", character: member.id, position: { ...member.pos } });
      return false;
    }
    member.techCharge -= 3;
    const tuning = CHARACTER_TUNING[member.id];
    member.cooldowns.ultimate = COMBAT.ultimateCooldown[member.id];
    const actionDuration =
      member.id === "nadi" ? 1.04 : member.id === "meru" ? 1.12 : 0.5;
    this.beginCharacterAction(member, "ultimate", actionDuration);
    this.emitAbilityAudio(member, "ultimate", false);

    if (member.id === "kyle") {
      this.spawnProjectile({
        kind: "windBlade",
        owner: member.id,
        pos: add(member.pos, scale(member.facing, 14)),
        direction: member.facing,
        speed: 180,
        radius: 14,
        damage: tuning.ultimateDamage,
        life: 1.3,
        damageScale: 1,
      });
      for (let index = 0; index < 5; index += 1) {
        this.effects.spawn({
          kind: "wind",
          pos: add(member.pos, scale(member.facing, 8 + index * 7)),
          velocity: scale(member.facing, 30 + index * 8),
          life: 0.52,
          size: 22 + index * 4,
          color: index % 2 ? "#dffff9" : "#46dcca",
          rotation: Math.atan2(member.facing.y, member.facing.x),
        });
      }
      return true;
    }

    if (member.id === "nadi") {
      this.sequences.push({
        owner: member.id,
        kind: "moonDance",
        elapsed: 0,
        stage: 0,
        target: { ...member.pos },
        damageScale: 1,
      });
      return true;
    }

    const target = this.findNearestEnemy(member.pos);
    const targetPos = target
      ? { ...target.pos }
      : clampToArena(add(member.pos, scale(member.facing, 92)), 24);
    this.sequences.push({
      owner: member.id,
      kind: "crystalFall",
      elapsed: 0,
      stage: 0,
      target: targetPos,
      damageScale: 1,
    });
    this.effects.spawn({
      kind: "ring",
      pos: targetPos,
      life: 0.7,
      size: 38,
      color: "#79e7cf",
      layer: "back",
    });
    return true;
  }

  private performSwitchAttack(member: CharacterState): void {
    this.beginCharacterAction(member, "switch", 0.35);
    if (member.id === "kyle") {
      const pos = add(member.pos, scale(member.facing, 19));
      this.spawnArea({
        owner: member.id,
        team: "party",
        pos,
        direction: member.facing,
        radius: 34,
        arc: Math.PI * 0.7,
        damage: 26,
        knockback: 32,
        color: "#6be3dc",
      });
      this.effects.spawn({
        kind: "slash",
        pos,
        life: 0.27,
        size: 37,
        color: "#72e7dc",
        rotation: Math.atan2(member.facing.y, member.facing.x),
      });
      return;
    }

    if (member.id === "nadi") {
      const pos = add(member.pos, scale(member.facing, 15));
      this.spawnArea({
        owner: member.id,
        team: "party",
        pos,
        direction: member.facing,
        radius: 44,
        arc: Math.PI * 1.08,
        damage: 24,
        knockback: 28,
        color: "#b4f8f3",
      });
      this.effects.spawn({
        kind: "slash",
        pos,
        life: 0.3,
        size: 48,
        color: "#c6ffff",
        rotation: Math.atan2(member.facing.y, member.facing.x),
      });
      return;
    }

    member.barrier = 2.2;
    member.invulnerable = 0.32;
    this.effects.spawn({
      kind: "barrier",
      pos: member.pos,
      life: 2.2,
      size: 19,
      color: "#7ce7d0",
    });
  }

  private updateEnemies(delta: number): void {
    const combatEnemies = this.getCombatEnemies();
    this.resetNonCombatStageEnemies(combatEnemies);
    if (combatEnemies.length === 0) return;
    this.keepMossCorridorAttackOrder();
    this.encounterAlerted ||= combatEnemies.some(
      (enemy) => enemy.alive && (enemy.aware || enemy.aiState === "notice"),
    );
    this.enemyDirector.update(delta, combatEnemies);
    for (const enemy of combatEnemies) {
      if (
        enemy.kind === "iwaUroko" &&
        enemy.hasAttackToken &&
        (this.iwaChargeRetryUntil.get(enemy.id) ?? 0) > this.time
      ) {
        this.enemyDirector.release(enemy.id);
        enemy.hasAttackToken = false;
      }
    }
    this.updateEnemyReservations(combatEnemies);

    for (const enemy of combatEnemies) {
      if (!enemy.alive) continue;
      const behavior = ENEMY_AI.behavior[enemy.archetype];
      const target = this.active.downed
        ? this.findNearestLivingMember(enemy.pos)
        : this.active;
      if (!target) continue;
      if (enemy.kind === "iwaUroko") {
        if (enemy.aiState === "idle" && enemy.stateAge === 0) {
          this.iwaChargeRetryUntil.delete(enemy.id);
          this.iwaChargeBlockedDirection.delete(enemy.id);
          this.iwaChargeRepositionTarget.delete(enemy.id);
          this.iwaChargeRepositionAttempts.delete(enemy.id);
          this.iwaCombatEngagedAt.delete(enemy.id);
          this.iwaLastAttackAt.delete(enemy.id);
        }
        if (!this.iwaCombatEngagedAt.has(enemy.id)) {
          this.iwaCombatEngagedAt.set(enemy.id, this.time);
        }
      }
      if (this.tryForceIwaUrokoAttack(enemy, target)) continue;
      const updateStartPos = { ...enemy.pos };

      enemy.stateAge += delta;
      enemy.stateTimer = Math.max(0, enemy.stateTimer - delta);
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta);
      enemy.hurtFlash = Math.max(0, enemy.hurtFlash - delta);
      enemy.knockback.x *= Math.pow(0.02, delta);
      enemy.knockback.y *= Math.pow(0.02, delta);
      enemy.pos = this.resolveEnemySweptMovement(
        updateStartPos,
        {
          x: updateStartPos.x + enemy.knockback.x * delta,
          y: updateStartPos.y + enemy.knockback.y * delta,
        },
        enemy.radius,
      );

      switch (enemy.aiState) {
        case "idle":
          this.updateIdleEnemy(enemy, target, delta);
          break;
        case "notice":
          enemy.facing = normalize(sub(target.pos, enemy.pos), enemy.facing);
          if (enemy.stateTimer <= 0) {
            enemy.aware = true;
            this.setEnemyState(enemy, "reposition", 0.2);
          }
          break;
        case "approach":
          if (!enemy.hasAttackToken) {
            this.setEnemyState(
              enemy,
              "reposition",
              behavior.repositionDuration,
            );
            break;
          }
          this.moveEnemyToward(
            enemy,
            enemy.reservedPos,
            this.active.moveSpeed * behavior.normalSpeedRatio,
            delta,
          );
          enemy.facing = normalize(sub(target.pos, enemy.pos), enemy.facing);
          if (
            distance(enemy.pos, enemy.reservedPos) <= 7 &&
            enemy.attackCooldown <= 0
          ) {
            if (enemy.kind === "iwaUroko") {
              enemy.attackDirection = normalize(sub(target.pos, enemy.pos), enemy.facing);
              const retrying = (this.iwaChargeRetryUntil.get(enemy.id) ?? 0) > this.time;
              if (
                retrying ||
                !this.isIwaUrokoChargePathClear(
                  enemy.pos,
                  enemy.attackDirection,
                  enemy.radius,
                )
              ) {
                this.deferIwaUrokoCharge(enemy, target);
                break;
              }
            }
            if (!this.canBeginStageMossAttack(enemy)) {
              this.enemyDirector.release(enemy.id);
              enemy.hasAttackToken = false;
              this.setEnemyState(enemy, "reposition", 0.18);
              break;
            }
            const windupDuration = enemy.kind === "iwaUroko"
              ? IWAUROKO_ROCK_ARMOR_CHARGE.windupDuration
              : behavior.windupDuration;
            enemy.attackStyle = "default";
            enemy.telegraph = enemy.kind === "iwaUroko" ? 0 : windupDuration;
            enemy.telegraphDuration = windupDuration;
            enemy.telegraphTarget = { ...target.pos };
            enemy.attackDirection = normalize(
              sub(target.pos, enemy.pos),
              enemy.facing,
            );
            this.setEnemyState(
              enemy,
              "windup",
              windupDuration,
            );
          }
          break;
        case "windup":
          enemy.telegraph = enemy.kind === "iwaUroko" ? 0 : enemy.stateTimer;
          enemy.facing = enemy.kind === "iwaUroko"
            ? { ...enemy.attackDirection }
            : normalize(sub(target.pos, enemy.pos), enemy.facing);
          if (
            enemy.kind === "iwaUroko" &&
            enemy.stateTimer <= 0.18 &&
            enemy.stateTimer + delta > 0.18
          ) {
            this.emitIwaUrokoWindupDust(enemy);
          }
          if (enemy.stateTimer <= 0) {
            if (enemy.kind === "iwaUroko" && enemy.attackStyle === "iwaTailSweep") {
              this.beginIwaUrokoTailSweep(enemy);
            } else {
              this.beginEnemyAttack(enemy, target);
            }
          }
          break;
        case "attack":
          this.updateEnemyAttack(enemy, delta);
          break;
        case "recover":
          enemy.telegraph = 0;
          enemy.pos = this.resolveEnemyMovement(
            enemy.pos,
            add(
              enemy.pos,
              scale(
                enemy.attackDirection,
                -this.active.moveSpeed *
                  behavior.retreatSpeedRatio *
                  delta,
              ),
            ),
            enemy.radius,
          );
          if (enemy.stateTimer <= 0) {
            enemy.attackStyle = "default";
            if (enemy.kind === "iwaUroko") this.iwaChargeRepositionAttempts.delete(enemy.id);
            this.setEnemyState(
              enemy,
              "reposition",
              behavior.repositionDuration,
            );
          }
          break;
        case "reposition":
          enemy.telegraph = 0;
          if (enemy.hasAttackToken) {
            this.setEnemyState(enemy, "approach");
            break;
          }
          this.moveEnemyToward(
            enemy,
            enemy.reservedPos,
            this.active.moveSpeed * behavior.normalSpeedRatio,
            delta,
          );
          enemy.facing = normalize(sub(target.pos, enemy.pos), enemy.facing);
          break;
      }
      if (!this.isEnemyPositionWalkable(enemy.pos, enemy.radius)) {
        enemy.pos = this.isEnemyPositionWalkable(updateStartPos, enemy.radius)
          ? updateStartPos
          : this.resolveEnemyMovement(updateStartPos, enemy.idleAnchor, enemy.radius);
      }
    }
    this.resolveEnemySeparation(delta);
    this.keepMossCorridorAttackOrder();
  }

  /** In stage play, only a formally active encounter is allowed to run
   * combat AI. The renderer may still show dormant enemies, but they cannot
   * reserve a token, approach, attack, or create damage areas. */
  private getCombatEnemies(): EnemyState[] {
    if (this.mode !== "stage") return this.enemies;
    if (this.stageEncounter !== "active" || this.activeEncounterGroupIds.size === 0) return [];
    const ids = new Set(this.enemyIdsForActiveEncounter());
    return this.enemies.filter((enemy) => enemy.alive && ids.has(enemy.id));
  }

  /** Party damage and targeting share the same encounter ownership rule as
   * enemy AI. A visible dormant group is scenery until it is formally handed
   * off; stray projectiles and large player areas may not pre-damage it. */
  private isEnemyCombatTarget(enemy: EnemyState): boolean {
    if (!enemy.alive) return false;
    if (this.mode !== "stage") return true;
    if (this.stageEncounter !== "active" || this.activeEncounterGroupIds.size === 0) return false;
    return this.isEnemyInActiveEncounter(enemy.id);
  }

  private isEnemyAllowedToDamage(enemyId: number): boolean {
    if (this.mode !== "stage") return this.enemies.some(
      (enemy) => enemy.id === enemyId && enemy.alive,
    );
    return this.stageEncounter === "active" &&
      this.encounterGrace <= 0 &&
      this.getCombatEnemies().some((enemy) => enemy.id === enemyId);
  }

  private resetNonCombatStageEnemies(combatEnemies: readonly EnemyState[]): void {
    if (this.mode !== "stage") return;
    const activeIds = new Set(combatEnemies.map((enemy) => enemy.id));
    for (const enemy of this.enemies) {
      if (!enemy.alive || activeIds.has(enemy.id)) continue;
      this.enemyDirector.release(enemy.id);
      enemy.aware = false;
      enemy.hasAttackToken = false;
      enemy.isReadySlot = false;
      enemy.tokenAge = 0;
      enemy.telegraph = 0;
      enemy.attackStyle = "default";
      this.iwaChargeRepositionAttempts.delete(enemy.id);
      this.iwaCombatEngagedAt.delete(enemy.id);
      this.iwaLastAttackAt.delete(enemy.id);
      if (enemy.aiState !== "idle") this.setEnemyState(enemy, "idle", 0);
    }
  }

  /**
   * The shared director remains the authority for tokens.  This room-level
   * safeguard only clears a stale second windup/attack state before it can
   * turn the introductory three-enemy encounter into a simultaneous rush.
   */
  private keepMossCorridorAttackOrder(): void {
    if (this.mode !== "stage" || this.stageEncounter !== "active") return;
    const attacking = this.getCombatEnemies().filter(
      (enemy) =>
        enemy.alive &&
        (enemy.aiState === "windup" || enemy.aiState === "attack"),
    );
    if (attacking.length <= 1) return;
    const primary = attacking.find((enemy) => enemy.hasAttackToken) ?? attacking[0]!;
    const waiting = attacking.filter((enemy) => enemy.id !== primary.id);
    for (const enemy of waiting) {
      this.enemyDirector.release(enemy.id);
      enemy.hasAttackToken = false;
      enemy.telegraph = 0;
      enemy.aiState = "reposition";
      enemy.stateAge = 0;
      enemy.stateTimer = 0.18;
    }
  }

  private canBeginStageMossAttack(candidate: EnemyState): boolean {
    if (this.mode !== "stage" || this.stageEncounter !== "active") return true;
    return !this.getCombatEnemies().some(
      (enemy) =>
        enemy.id !== candidate.id &&
        enemy.alive &&
        (enemy.aiState === "windup" || enemy.aiState === "attack"),
    );
  }

  private updateIdleEnemy(
    enemy: EnemyState,
    target: CharacterState,
    delta: number,
  ): void {
    const behavior = ENEMY_AI.behavior[enemy.archetype];
    if (
      this.encounterGrace <= 0 &&
      distance(enemy.pos, target.pos) <=
        behavior.detectionRadius *
          (this.encounterAlerted ? ENEMY_AI.alertRadiusMultiplier : 1)
    ) {
      enemy.noticeDelay = Math.max(0, enemy.noticeDelay - delta);
      if (enemy.noticeDelay <= 0) {
        const noticeDuration =
          ENEMY_AI.noticeDurationMin +
          (ENEMY_AI.noticeDurationMax - ENEMY_AI.noticeDurationMin) *
            ((enemy.id * 0.37) % 1);
        this.setEnemyState(enemy, "notice", noticeDuration);
        return;
      }
    }

    if (enemy.stateTimer <= 0) {
      const angle = enemy.id * 2.1 + this.time * 0.31;
      const radius = 10 + (enemy.id % 3) * 4;
      enemy.idleTarget = this.resolveEnemyMovement(
        enemy.pos,
        add(enemy.idleAnchor, {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius * 0.7,
        }),
        enemy.radius,
      );
      enemy.stateTimer = 1.1 + enemy.id * 0.16;
    }
    this.moveEnemyToward(
      enemy,
      enemy.idleTarget,
      this.active.moveSpeed * behavior.idleSpeedRatio,
      delta,
    );
  }

  private updateEnemyReservations(enemies: readonly EnemyState[] = this.enemies): void {
    const target = this.active;
    const aware = enemies
      .filter((enemy) => enemy.alive && enemy.aware)
      .sort((a, b) => a.id - b.id);
    const usedAngles: number[] = [];

    for (const enemy of aware) {
      const forcedChargePosition = enemy.kind === "iwaUroko"
        ? this.iwaChargeRepositionTarget.get(enemy.id)
        : undefined;
      if (forcedChargePosition) {
        if (distance(enemy.pos, forcedChargePosition) <= 6) {
          this.iwaChargeRepositionTarget.delete(enemy.id);
        } else {
          enemy.reservedPos = { ...forcedChargePosition };
          enemy.reservedAngle = Math.atan2(
            forcedChargePosition.y - target.pos.y,
            forcedChargePosition.x - target.pos.x,
          );
          usedAngles.push(enemy.reservedAngle);
          continue;
        }
      }
      const behavior = ENEMY_AI.behavior[enemy.archetype];
      let angle = enemy.reservedAngle;
      let radius: number;

      if (enemy.hasAttackToken) {
        radius = behavior.optimalDistance;
      } else if (enemy.isReadySlot) {
        radius = behavior.readyDistance;
      } else {
        const distanceMix = ((enemy.id * 0.43) % 1);
        radius =
          behavior.waitingDistanceMin +
          (behavior.waitingDistanceMax - behavior.waitingDistanceMin) *
            distanceMix;
        angle +=
          Math.sin(this.time * ENEMY_AI.orbitAngularSpeed + enemy.id * 1.7) *
          0.32;
      }

      angle = this.findOpenReservationAngle(
        angle,
        usedAngles,
        radius,
        target.pos,
      );
      usedAngles.push(angle);
      enemy.reservedPos = this.resolveEnemyMovement(
        enemy.pos,
        {
          x: target.pos.x + Math.cos(angle) * radius,
          y: target.pos.y + Math.sin(angle) * radius,
        },
        enemy.radius,
      );
    }
  }

  private findOpenReservationAngle(
    preferred: number,
    usedAngles: readonly number[],
    radius: number,
    target: Vec2,
  ): number {
    const increments = [
      0,
      Math.PI / 3,
      -Math.PI / 3,
      Math.PI * 0.66,
      -Math.PI * 0.66,
      Math.PI,
    ];
    for (const increment of increments) {
      const candidate = preferred + increment;
      const angleOpen = usedAngles.every((used) => {
        const difference = Math.atan2(
          Math.sin(candidate - used),
          Math.cos(candidate - used),
        );
        return Math.abs(difference) >= Math.PI / 3.4;
      });
      const candidatePosition = this.resolveEnemyMovement(
        target,
        {
          x: target.x + Math.cos(candidate) * radius,
          y: target.y + Math.sin(candidate) * radius,
        },
        12,
      );
      const allyOpen = this.party.every(
        (member) =>
          member.downed ||
          member.id === this.activeId ||
          (
            distance(candidatePosition, member.pos) >=
              ENEMY_AI.reservationAllyClearance &&
            distance(candidatePosition, member.formationSlot) >=
              ENEMY_AI.reservationAllyClearance
          ),
      );
      if (angleOpen && allyOpen) return candidate;
    }
    return preferred + Math.PI;
  }

  private moveEnemyToward(
    enemy: EnemyState,
    target: Vec2,
    speed: number,
    delta: number,
  ): void {
    const offset = sub(target, enemy.pos);
    if (length(offset) <= 2) return;
    const direction = normalize(offset, enemy.facing);
    enemy.facing = direction;
    enemy.moveSpeed = speed;
    const previous = { ...enemy.pos };
    const desired = add(enemy.pos, scale(direction, speed * delta));
    enemy.pos = this.resolveEnemyMovement(previous, desired, enemy.radius);
  }

  private resolveEnemyMovement(previous: Vec2, desired: Vec2, radius: number): Vec2 {
    if (this.mode === "stage" && this.room?.id === "ancientForest") {
      return resolveAncientForestMovement(previous, desired, radius, { villageExitOpen: this.forestSealStoneObtained });
    }
    if (this.mode === "stage" && this.room?.id === "mossRootRuins") {
      return resolveMossRootMovement(previous, desired, radius, this.mossRootCollisionOptions());
    }
    if (this.mode === "stage" && this.room?.id === "lightwingCrystalCavern") {
      return resolveLightwingMovement(previous, desired, radius, this.lightwingCollisionOptions());
    }
    if (this.mode === "stage" && this.room?.id === "spiritClothStonescaleDepths") {
      return resolveDepthsMovement(previous, desired, radius, this.depthsCollisionOptions());
    }
    const collisionRoom = this.getCollisionRoom();
    return collisionRoom
      ? resolveRoomMovement(previous, desired, radius, collisionRoom)
      : clampToArena(desired, radius);
  }

  private isEnemyPositionWalkable(position: Vec2, radius: number): boolean {
    if (this.mode === "stage" && this.room?.id === "ancientForest") {
      return isAncientForestPositionWalkable(position, radius, { villageExitOpen: this.forestSealStoneObtained });
    }
    if (this.mode === "stage" && this.room?.id === "mossRootRuins") {
      return isMossRootPositionWalkable(position, radius, this.mossRootCollisionOptions());
    }
    if (this.mode === "stage" && this.room?.id === "lightwingCrystalCavern") {
      return isLightwingPositionWalkable(position, radius, this.lightwingCollisionOptions());
    }
    if (this.mode === "stage" && this.room?.id === "spiritClothStonescaleDepths") {
      return isDepthsPositionWalkable(position, radius, this.depthsCollisionOptions());
    }
    const clamped = clampToArena(position, radius);
    return distance(clamped, position) <= 0.01;
  }

  private resolveEnemySweptMovement(previous: Vec2, desired: Vec2, radius: number): Vec2 {
    const travel = distance(previous, desired);
    if (travel <= 0.001) return this.resolveEnemyMovement(previous, desired, radius);
    const steps = Math.max(1, Math.ceil(travel / Math.max(3, radius * 0.35)));
    let result = { ...previous };
    for (let step = 1; step <= steps; step += 1) {
      const next = {
        x: previous.x + ((desired.x - previous.x) * step) / steps,
        y: previous.y + ((desired.y - previous.y) * step) / steps,
      };
      const resolved = this.resolveEnemyMovement(result, next, radius);
      if (!this.isEnemyPositionWalkable(resolved, radius)) break;
      result = resolved;
      if (distance(resolved, next) > 0.75) break;
    }
    return result;
  }

  private isIwaUrokoChargePathClear(
    origin: Vec2,
    direction: Vec2,
    radius: number,
    distanceToCheck = IWAUROKO_ROCK_ARMOR_CHARGE.minimumClearDistance,
  ): boolean {
    const normalizedDirection = normalize(direction, { x: 1, y: 0 });
    const steps = Math.max(1, Math.ceil(distanceToCheck / Math.max(3, radius * 0.3)));
    for (let step = 1; step <= steps; step += 1) {
      const point = add(origin, scale(normalizedDirection, (distanceToCheck * step) / steps));
      if (!this.isEnemyPositionWalkable(point, radius)) return false;
    }
    return true;
  }

  private findIwaUrokoChargePosition(enemy: EnemyState, target: CharacterState): Vec2 | null {
    const blocked = this.iwaChargeBlockedDirection.get(enemy.id);
    const baseAngle = Math.atan2(enemy.pos.y - target.pos.y, enemy.pos.x - target.pos.x);
    const angleOffsets = [0, Math.PI / 8, -Math.PI / 8, Math.PI / 4, -Math.PI / 4, Math.PI * 3 / 8, -Math.PI * 3 / 8, Math.PI / 2, -Math.PI / 2, Math.PI * 3 / 4, -Math.PI * 3 / 4, Math.PI];
    let best: { position: Vec2; score: number } | null = null;
    for (const radiusFromTarget of [88, 104, 120, 138, 154]) {
      for (const angleOffset of angleOffsets) {
        const angle = baseAngle + angleOffset;
        const position = {
          x: target.pos.x + Math.cos(angle) * radiusFromTarget,
          y: target.pos.y + Math.sin(angle) * radiusFromTarget,
        };
        if (!this.isEnemyPositionWalkable(position, enemy.radius)) continue;
        const reachable = this.resolveEnemySweptMovement(enemy.pos, position, enemy.radius);
        if (distance(reachable, position) > 2) continue;
        const chargeDirection = normalize(sub(target.pos, position), enemy.facing);
        if (!this.isIwaUrokoChargePathClear(position, chargeDirection, enemy.radius)) continue;
        const repeatedDirectionPenalty = blocked &&
          blocked.x * chargeDirection.x + blocked.y * chargeDirection.y > 0.9
          ? 480
          : 0;
        const score = distance(enemy.pos, position) + repeatedDirectionPenalty + Math.abs(angleOffset) * 8;
        if (!best || score < best.score) best = { position, score };
      }
    }
    return best?.position ?? null;
  }

  private deferIwaUrokoCharge(enemy: EnemyState, target: CharacterState): void {
    const repositionAttempts = this.iwaChargeRepositionAttempts.get(enemy.id) ?? 0;
    const repositionTarget = this.findIwaUrokoChargePosition(enemy, target);
    if (repositionAttempts >= 1 || !repositionTarget) {
      this.beginIwaUrokoTailSweepWindup(enemy, target);
      return;
    }
    this.iwaChargeRepositionAttempts.set(enemy.id, repositionAttempts + 1);
    this.iwaChargeRetryUntil.set(
      enemy.id,
      this.time + IWAUROKO_ROCK_ARMOR_CHARGE.retryDelay,
    );
    this.iwaChargeBlockedDirection.set(enemy.id, { ...enemy.attackDirection });
    this.iwaChargeRepositionTarget.set(enemy.id, repositionTarget);
    this.enemyDirector.release(enemy.id);
    enemy.hasAttackToken = false;
    enemy.telegraph = 0;
    this.setEnemyState(enemy, "reposition", ENEMY_AI.behavior.heavyCharge.repositionDuration);
  }

  private beginIwaUrokoTailSweepWindup(enemy: EnemyState, target: CharacterState): void {
    enemy.attackStyle = "iwaTailSweep";
    enemy.attackConnected = false;
    enemy.attackDirection = normalize(sub(target.pos, enemy.pos), enemy.facing);
    enemy.facing = { ...enemy.attackDirection };
    enemy.telegraph = 0;
    enemy.telegraphDuration = IWAUROKO_ROCK_ARMOR_CHARGE.tailSweep.windupDuration;
    this.iwaChargeRetryUntil.delete(enemy.id);
    this.iwaChargeBlockedDirection.delete(enemy.id);
    this.iwaChargeRepositionTarget.delete(enemy.id);
    this.setEnemyState(
      enemy,
      "windup",
      IWAUROKO_ROCK_ARMOR_CHARGE.tailSweep.windupDuration,
    );
  }

  private beginIwaUrokoTailSweep(enemy: EnemyState): void {
    enemy.attackConnected = false;
    this.iwaLastAttackAt.set(enemy.id, this.time);
    this.setEnemyState(
      enemy,
      "attack",
      IWAUROKO_ROCK_ARMOR_CHARGE.tailSweep.attackDuration,
    );
  }

  private tryForceIwaUrokoAttack(enemy: EnemyState, target: CharacterState): boolean {
    if (
      enemy.kind !== "iwaUroko" ||
      !enemy.aware ||
      !enemy.hasAttackToken ||
      (enemy.aiState !== "approach" && enemy.aiState !== "reposition")
    ) {
      return false;
    }
    const engagedAt = this.iwaCombatEngagedAt.get(enemy.id) ?? this.time;
    const lastAttackAt = this.iwaLastAttackAt.get(enemy.id);
    const overdue = lastAttackAt === undefined
      ? this.time - engagedAt >= 3.2
      : this.time - lastAttackAt >= 5.1;
    if (!overdue) return false;

    enemy.attackDirection = normalize(sub(target.pos, enemy.pos), enemy.facing);
    if (this.isIwaUrokoChargePathClear(enemy.pos, enemy.attackDirection, enemy.radius)) {
      this.beginEnemyAttack(enemy, target);
    } else {
      this.beginIwaUrokoTailSweepWindup(enemy, target);
    }
    return true;
  }

  private beginEnemyAttack(
    enemy: EnemyState,
    target: CharacterState,
  ): void {
    const behavior = ENEMY_AI.behavior[enemy.archetype];
    enemy.telegraph = 0;
    enemy.attackConnected = false;
    if (enemy.kind === "iwaUroko") {
      enemy.attackStyle = "default";
      const currentTargetDirection = normalize(
        sub(target.pos, enemy.pos),
        enemy.facing,
      );
      enemy.attackDirection = rotateDirectionToward(
        enemy.attackDirection,
        currentTargetDirection,
        IWAUROKO_ROCK_ARMOR_CHARGE.maxAimCorrectionRadians,
      );
      enemy.facing = { ...enemy.attackDirection };
      if (!this.isIwaUrokoChargePathClear(
        enemy.pos,
        enemy.attackDirection,
        enemy.radius,
      )) {
        this.deferIwaUrokoCharge(enemy, target);
        return;
      }
      this.iwaChargeRetryUntil.delete(enemy.id);
      this.iwaChargeBlockedDirection.delete(enemy.id);
      this.iwaChargeRepositionTarget.delete(enemy.id);
      this.iwaChargeRepositionAttempts.delete(enemy.id);
      this.iwaLastAttackAt.set(enemy.id, this.time);
    } else if (
      enemy.kind !== "mossPlun" &&
      enemy.kind !== "lumibane" &&
      enemy.kind !== "garacrow" &&
      enemy.kind !== "utsurobou"
    ) {
      enemy.attackDirection = normalize(
        sub(target.pos, enemy.pos),
        enemy.facing,
      );
    }
    const attackDuration =
      enemy.kind === "mossPlun"
        ? MOSS_PLUN_JUMP_SLAM.attackDuration
        : enemy.kind === "lumibane"
          ? LUMIBANE_LUMINOUS_DASH.attackDuration
          : enemy.kind === "garacrow"
            ? GARACROW_DIVE_STRIKE.attackDuration
            : enemy.kind === "utsurobou"
              ? UTSUROBOU_MASK_CURSE_WAVE.attackDuration
              : enemy.kind === "iwaUroko"
                ? IWAUROKO_ROCK_ARMOR_CHARGE.attackDuration
                : behavior.attackDuration;
    this.setEnemyState(enemy, "attack", attackDuration);

    if (
      enemy.archetype !== "heavyCharge" &&
      enemy.kind !== "mossPlun" &&
      enemy.kind !== "lumibane" &&
      enemy.kind !== "garacrow" &&
      enemy.kind !== "utsurobou"
    ) {
      this.performMeleeEnemyStrike(enemy);
    }
  }

  private performMeleeEnemyStrike(enemy: EnemyState): void {
    const tuning = ENEMY_TUNING[enemy.kind];
    const impact = add(enemy.pos, scale(enemy.attackDirection, 16));
    this.spawnArea({
      owner: "enemy",
      team: "enemy",
      sourceEnemyId: enemy.id,
      pos: impact,
      radius: 25,
      damage: tuning.damage,
      knockback: 38,
      color: "#d8aa5a",
    });
    if (enemy.kind === "mossPlun") {
      this.emitMossPlunLandingEffects(enemy.pos);
      return;
    }
    if (enemy.kind === "lumibane") {
      this.emitLumibaneDashEffects(enemy, impact);
      return;
    }
    for (let index = 0; index < 5; index += 1) {
      this.effects.spawn({
        kind: "dust",
        pos: impact,
        velocity: {
          x: (this.random() - 0.5) * 48,
          y: (this.random() - 0.5) * 32,
        },
        life: 0.4,
        size: 2 + this.random() * 2,
        color: "#a8ba62",
      });
    }
  }

  private emitMossPlunLandingEffects(position: Vec2): void {
    this.effects.spawn({
      kind: "impactRing",
      pos: position,
      life: MOSS_PLUN_JUMP_SLAM.impactRing.life,
      size: MOSS_PLUN_JUMP_SLAM.impactRing.size,
      color: MOSS_PLUN_JUMP_SLAM.impactRing.color,
      alpha: 0.82,
      layer: "back",
    });
    for (
      let index = 0;
      index < MOSS_PLUN_JUMP_SLAM.leafCount;
      index += 1
    ) {
      const angle =
        (index / MOSS_PLUN_JUMP_SLAM.leafCount) * Math.PI * 2 +
        (this.random() - 0.5) * 0.38;
      const speed = 24 + this.random() * 18;
      this.effects.spawn({
        kind: "leaf",
        pos: position,
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed * 0.62 - 5,
        },
        life: 0.38 + this.random() * 0.14,
        size: 1.7 + this.random() * 1.1,
        color: index % 2 === 0 ? "#78a94e" : "#bedb70",
      });
    }
    for (
      let index = 0;
      index < MOSS_PLUN_JUMP_SLAM.dustCount;
      index += 1
    ) {
      const side = index % 2 === 0 ? -1 : 1;
      this.effects.spawn({
        kind: "dust",
        pos: {
          x: position.x + side * (3 + this.random() * 4),
          y: position.y + 1 + this.random() * 2,
        },
        velocity: {
          x: side * (22 + this.random() * 24),
          y: (this.random() - 0.5) * 10,
        },
        life: 0.3 + this.random() * 0.1,
        size: 2 + this.random() * 1.5,
        color: index % 2 === 0 ? "#8b8459" : "#afa16a",
        alpha: 0.72,
        layer: "back",
      });
    }
  }

  private emitLumibaneDashEffects(
    enemy: EnemyState,
    impact: Vec2,
  ): void {
    this.effects.spawn({
      kind: "impactRing",
      pos: impact,
      life: LUMIBANE_LUMINOUS_DASH.impactRing.life,
      size: LUMIBANE_LUMINOUS_DASH.impactRing.size,
      color: LUMIBANE_LUMINOUS_DASH.impactRing.color,
      alpha: 0.78,
    });
    const side = perpendicular(enemy.attackDirection);
    for (
      let index = 0;
      index < LUMIBANE_LUMINOUS_DASH.windCount;
      index += 1
    ) {
      const sideOffset = index === 0 ? -3 : 3;
      this.effects.spawn({
        kind: "wind",
        pos: add(
          add(enemy.pos, scale(enemy.attackDirection, -4 - index * 3)),
          scale(side, sideOffset),
        ),
        velocity: add(
          scale(enemy.attackDirection, 50 + index * 12),
          scale(side, sideOffset * 1.5),
        ),
        life: 0.2 + index * 0.03,
        size: 10 + index * 2,
        color: "#65dccc",
        alpha: 0.68,
        rotation: Math.atan2(
          enemy.attackDirection.y,
          enemy.attackDirection.x,
        ),
        layer: "back",
      });
    }
    for (
      let index = 0;
      index < LUMIBANE_LUMINOUS_DASH.sparkCount;
      index += 1
    ) {
      const spread = (index - 1) * 0.34 + (this.random() - 0.5) * 0.14;
      const direction = normalize({
        x:
          enemy.attackDirection.x * Math.cos(spread) -
          enemy.attackDirection.y * Math.sin(spread),
        y:
          enemy.attackDirection.x * Math.sin(spread) +
          enemy.attackDirection.y * Math.cos(spread),
      });
      this.effects.spawn({
        kind: "spark",
        pos: impact,
        velocity: scale(direction, 28 + this.random() * 18),
        life: 0.16 + this.random() * 0.06,
        size: 1.5 + this.random(),
        color: index % 2 === 0 ? "#b8fff6" : "#65dccc",
        alpha: 0.82,
      });
    }
  }

  private performGaracrowDiveStrike(enemy: EnemyState): void {
    const impact = add(
      enemy.pos,
      scale(
        enemy.attackDirection,
        GARACROW_DIVE_STRIKE.impactOffset,
      ),
    );
    this.spawnArea({
      owner: "enemy",
      team: "enemy",
      sourceEnemyId: enemy.id,
      pos: impact,
      radius: GARACROW_DIVE_STRIKE.impactRadius,
      damage: ENEMY_TUNING.garacrow.damage,
      knockback: GARACROW_DIVE_STRIKE.knockback,
      color: GARACROW_DIVE_STRIKE.impactRing.color,
    });
    this.emitGaracrowDiveEffects(enemy, impact);
  }

  private emitGaracrowDiveEffects(
    enemy: EnemyState,
    impact: Vec2,
  ): void {
    this.effects.spawn({
      kind: "impactRing",
      pos: impact,
      life: GARACROW_DIVE_STRIKE.impactRing.life,
      size: GARACROW_DIVE_STRIKE.impactRing.size,
      color: GARACROW_DIVE_STRIKE.impactRing.color,
      alpha: 0.8,
    });
    const side = perpendicular(enemy.attackDirection);
    for (
      let index = 0;
      index < GARACROW_DIVE_STRIKE.windCount;
      index += 1
    ) {
      const sideOffset = (index - 1) * 5;
      this.effects.spawn({
        kind: "wind",
        pos: add(
          add(enemy.pos, scale(enemy.attackDirection, -5 - index * 4)),
          scale(side, sideOffset),
        ),
        velocity: add(
          scale(enemy.attackDirection, 42 + index * 11),
          scale(side, sideOffset * 1.2),
        ),
        life: 0.26 + index * 0.03,
        size: 14 + index * 2,
        color: index % 2 === 0 ? "#4d9f9a" : "#72d9cf",
        alpha: 0.68,
        rotation: Math.atan2(
          enemy.attackDirection.y,
          enemy.attackDirection.x,
        ),
        layer: "back",
      });
    }
    for (
      let index = 0;
      index < GARACROW_DIVE_STRIKE.sparkCount;
      index += 1
    ) {
      const spread = (index - 1) * 0.3 +
        (this.random() - 0.5) * 0.12;
      const direction = normalize({
        x:
          enemy.attackDirection.x * Math.cos(spread) -
          enemy.attackDirection.y * Math.sin(spread),
        y:
          enemy.attackDirection.x * Math.sin(spread) +
          enemy.attackDirection.y * Math.cos(spread),
      });
      this.effects.spawn({
        kind: "spark",
        pos: impact,
        velocity: scale(direction, 34 + this.random() * 18),
        life: 0.18 + this.random() * 0.08,
        size: 1.8 + this.random() * 1.2,
        color: index % 2 === 0 ? "#a9f6ee" : "#55c9c0",
        alpha: 0.84,
      });
    }
  }

  private performUtsurobouCurseWave(enemy: EnemyState): void {
    this.spawnArea({
      owner: "enemy",
      team: "enemy",
      sourceEnemyId: enemy.id,
      pos: enemy.pos,
      radius: UTSUROBOU_MASK_CURSE_WAVE.radius,
      damage: ENEMY_TUNING.utsurobou.damage,
      knockback: UTSUROBOU_MASK_CURSE_WAVE.knockback,
      color: UTSUROBOU_MASK_CURSE_WAVE.impactRing.color,
    });
    this.emitUtsurobouCurseEffects(enemy.pos);
  }

  private performIwaUrokoTailSweep(enemy: EnemyState): void {
    const tuning = IWAUROKO_ROCK_ARMOR_CHARGE.tailSweep;
    this.spawnArea({
      owner: "enemy",
      team: "enemy",
      sourceEnemyId: enemy.id,
      pos: enemy.pos,
      radius: tuning.radius,
      damage: tuning.damage,
      knockback: tuning.knockback,
      color: "#a99b68",
    });
    for (let index = 0; index < 9; index += 1) {
      const angle = (index / 9) * Math.PI * 2 + enemy.id * 0.31;
      const direction = { x: Math.cos(angle), y: Math.sin(angle) };
      this.effects.spawn({
        kind: "dust",
        pos: add(enemy.pos, scale(direction, 12 + (index % 3) * 3)),
        velocity: scale(direction, 32 + (index % 3) * 9),
        life: 0.34 + (index % 2) * 0.08,
        size: 2.5 + (index % 3),
        color: index % 2 === 0 ? "#78866a" : "#b6a86e",
        alpha: 0.72,
        layer: "back",
      });
    }
    this.triggerImpact(1);
  }

  private emitUtsurobouCurseEffects(position: Vec2): void {
    this.effects.spawn({
      kind: "impactRing",
      pos: position,
      life: UTSUROBOU_MASK_CURSE_WAVE.impactRing.life,
      size: UTSUROBOU_MASK_CURSE_WAVE.impactRing.size,
      color: UTSUROBOU_MASK_CURSE_WAVE.impactRing.color,
      alpha: 0.78,
    });
    this.effects.spawn({
      kind: "impactRing",
      pos: position,
      life: 0.24,
      size: 30,
      color: "#b5f3e7",
      alpha: 0.72,
    });
    for (
      let index = 0;
      index < UTSUROBOU_MASK_CURSE_WAVE.sparkCount;
      index += 1
    ) {
      const angle =
        (index / UTSUROBOU_MASK_CURSE_WAVE.sparkCount) * Math.PI * 2;
      const direction = {
        x: Math.cos(angle),
        y: Math.sin(angle),
      };
      this.effects.spawn({
        kind: "spark",
        pos: add(position, scale(direction, 7)),
        velocity: scale(direction, 28 + this.random() * 12),
        life: 0.24 + this.random() * 0.08,
        size: 1.6 + this.random() * 1.1,
        color: index % 2 === 0 ? "#89e5da" : "#bba7df",
        alpha: 0.78,
      });
    }
    for (const side of [-1, 1]) {
      this.effects.spawn({
        kind: "wind",
        pos: {
          x: position.x + side * 5,
          y: position.y - 6,
        },
        velocity: {
          x: side * 38,
          y: -4,
        },
        life: 0.24,
        size: 12,
        color: side < 0 ? "#5bbdb5" : "#82d8d0",
        alpha: 0.58,
        rotation: side < 0 ? Math.PI : 0,
        layer: "back",
      });
    }
  }

  private emitIwaUrokoWindupDust(enemy: EnemyState): void {
    const side = perpendicular(enemy.attackDirection);
    for (const sideSign of [-1, 1] as const) {
      this.effects.spawn({
        kind: "dust",
        pos: add(
          add(enemy.pos, scale(enemy.attackDirection, 7)),
          scale(side, sideSign * 10),
        ),
        velocity: add(
          scale(enemy.attackDirection, -10),
          scale(side, sideSign * 15),
        ),
        life: 0.32,
        size: 2.5,
        color: sideSign < 0 ? "#78866a" : "#b6a86e",
        alpha: 0.62,
        layer: "back",
      });
    }
  }

  private emitIwaUrokoChargeDust(
    enemy: EnemyState,
    delta: number,
  ): void {
    const previousStateAge = Math.max(0, enemy.stateAge - delta);
    const emissionTimes = [0.06, 0.2, 0.34] as const;
    const side = perpendicular(enemy.attackDirection);
    for (let index = 0; index < emissionTimes.length; index += 1) {
      const emissionTime = emissionTimes[index];
      if (emissionTime === undefined) continue;
      if (
        previousStateAge >= emissionTime ||
        enemy.stateAge < emissionTime
      ) {
        continue;
      }
      const sideSign = index % 2 === 0 ? -1 : 1;
      this.effects.spawn({
        kind: "dust",
        pos: add(
          add(enemy.pos, scale(enemy.attackDirection, -13)),
          scale(side, sideSign * (4 + index)),
        ),
        velocity: add(
          scale(enemy.attackDirection, -24 - index * 4),
          scale(side, sideSign * 12),
        ),
        life: 0.3,
        size: 2.5 + index * 0.35,
        color: index % 2 === 0 ? "#78866a" : "#b6a86e",
        alpha: 0.58,
        layer: "back",
      });
    }
  }

  private updateEnemyAttack(enemy: EnemyState, delta: number): void {
    const behavior = ENEMY_AI.behavior[enemy.archetype];
    if (enemy.kind === "iwaUroko" && enemy.attackStyle === "iwaTailSweep") {
      const progress = Math.min(
        1,
        enemy.stateAge / IWAUROKO_ROCK_ARMOR_CHARGE.tailSweep.attackDuration,
      );
      const baseAngle = Math.atan2(enemy.attackDirection.y, enemy.attackDirection.x);
      const spinAngle = baseAngle + progress * Math.PI * 2;
      enemy.facing = { x: Math.cos(spinAngle), y: Math.sin(spinAngle) };
    }
    const attackSpeedRatio =
      enemy.kind === "lumibane"
        ? LUMIBANE_LUMINOUS_DASH.attackSpeedRatio
        : enemy.kind === "garacrow"
          ? GARACROW_DIVE_STRIKE.attackSpeedRatio
          : enemy.kind === "utsurobou"
            ? UTSUROBOU_MASK_CURSE_WAVE.attackSpeedRatio
            : enemy.kind === "iwaUroko"
              ? enemy.attackStyle === "iwaTailSweep"
                ? 0
                : IWAUROKO_ROCK_ARMOR_CHARGE.attackSpeedRatio
              : behavior.attackSpeedRatio;
    const speed = this.active.moveSpeed * attackSpeedRatio;
    const previousPos = { ...enemy.pos };
    const next = add(
      enemy.pos,
      scale(enemy.attackDirection, speed * delta),
    );
    const clamped = enemy.kind === "iwaUroko"
      ? this.resolveEnemySweptMovement(previousPos, next, enemy.radius)
      : this.resolveEnemyMovement(previousPos, next, enemy.radius);
    const hitWall = distance(next, clamped) > 0.1;
    enemy.pos = clamped;
    enemy.moveSpeed = speed;

    if (enemy.kind === "iwaUroko" && enemy.attackStyle !== "iwaTailSweep") {
      this.emitIwaUrokoChargeDust(enemy, delta);
      if (hitWall) {
        this.iwaChargeRetryUntil.set(
          enemy.id,
          this.time + IWAUROKO_ROCK_ARMOR_CHARGE.retryDelay,
        );
        this.iwaChargeBlockedDirection.set(enemy.id, { ...enemy.attackDirection });
        const repositionTarget = this.findIwaUrokoChargePosition(enemy, this.active);
        if (repositionTarget) this.iwaChargeRepositionTarget.set(enemy.id, repositionTarget);
      }
    }

    if (
      enemy.kind === "mossPlun" &&
      !enemy.attackConnected &&
      enemy.stateAge >= MOSS_PLUN_JUMP_SLAM.landingTime
    ) {
      this.performMeleeEnemyStrike(enemy);
      enemy.attackConnected = true;
    }

    if (
      enemy.kind === "utsurobou" &&
      !enemy.attackConnected &&
      enemy.stateAge >= UTSUROBOU_MASK_CURSE_WAVE.impactTime
    ) {
      this.performUtsurobouCurseWave(enemy);
      enemy.attackConnected = true;
    }

    if (
      enemy.kind === "garacrow" &&
      !enemy.attackConnected &&
      enemy.stateAge >= GARACROW_DIVE_STRIKE.impactTime
    ) {
      this.performGaracrowDiveStrike(enemy);
      enemy.attackConnected = true;
    }

    if (
      enemy.kind === "lumibane" &&
      !enemy.attackConnected &&
      enemy.stateAge >= LUMIBANE_LUMINOUS_DASH.impactTime
    ) {
      this.performMeleeEnemyStrike(enemy);
      enemy.attackConnected = true;
    }

    if (
      enemy.kind === "iwaUroko" &&
      enemy.attackStyle === "iwaTailSweep" &&
      !enemy.attackConnected &&
      enemy.stateAge >= IWAUROKO_ROCK_ARMOR_CHARGE.tailSweep.impactTime
    ) {
      this.performIwaUrokoTailSweep(enemy);
      enemy.attackConnected = true;
    }

    if (
      enemy.kind === "iwaUroko" &&
      enemy.attackStyle !== "iwaTailSweep" &&
      !enemy.attackConnected
    ) {
      for (const member of this.party) {
        if (member.downed) continue;
        const collisionRadius =
          enemy.radius +
          member.radius +
          IWAUROKO_ROCK_ARMOR_CHARGE.collisionPadding;
        const chargeCollided =
          distancePointToSegment(member.pos, previousPos, enemy.pos) <=
            collisionRadius;
        if (!chargeCollided) continue;
        this.damageCharacter(
          member.id,
          ENEMY_TUNING[enemy.kind].damage,
          enemy.attackDirection,
        );
        enemy.attackConnected = true;
        break;
      }
    } else if (
      enemy.archetype === "heavyCharge" &&
      !enemy.attackConnected
    ) {
      for (const member of this.party) {
        if (
          member.downed ||
          distance(enemy.pos, member.pos) >
            enemy.radius + member.radius + 4
        ) {
          continue;
        }
        enemy.attackConnected = this.damageCharacter(
          member.id,
          ENEMY_TUNING[enemy.kind].damage,
          enemy.attackDirection,
        );
        if (enemy.attackConnected) break;
      }
    }

    const attackFinished =
      enemy.kind === "mossPlun"
        ? enemy.stateTimer <= 0
        : enemy.kind === "lumibane"
          ? enemy.stateTimer <= 0 || hitWall
          : enemy.kind === "garacrow"
            ? enemy.stateTimer <= 0 || hitWall
            : enemy.kind === "utsurobou"
              ? enemy.stateTimer <= 0
              : enemy.kind === "iwaUroko" && enemy.attackStyle === "iwaTailSweep"
                ? enemy.stateTimer <= 0
                : enemy.stateTimer <= 0 || hitWall || enemy.attackConnected;
    if (attackFinished) {
      this.enterEnemyRecovery(enemy);
    }
  }

  private enterEnemyRecovery(enemy: EnemyState): void {
    const behavior = ENEMY_AI.behavior[enemy.archetype];
    enemy.telegraph = 0;
    enemy.attackCooldown = ENEMY_TUNING[enemy.kind].attackCooldown;
    this.enemyDirector.release(enemy.id);
    this.setEnemyState(
      enemy,
      "recover",
      enemy.kind === "iwaUroko"
        ? enemy.attackStyle === "iwaTailSweep"
          ? IWAUROKO_ROCK_ARMOR_CHARGE.tailSweep.recoverDuration
          : IWAUROKO_ROCK_ARMOR_CHARGE.recoverDuration
        : behavior.recoverDuration,
    );
    if (enemy.archetype === "heavyCharge") {
      for (let index = 0; index < 8; index += 1) {
        this.effects.spawn({
          kind: "dust",
          pos: enemy.pos,
          velocity: {
            x: (this.random() - 0.5) * 72,
            y: (this.random() - 0.5) * 44,
          },
          life: 0.55,
          size: 2 + this.random() * 4,
          color: index % 2 ? "#78866a" : "#b6a86e",
        });
      }
    }
  }

  private setEnemyState(
    enemy: EnemyState,
    state: EnemyState["aiState"],
    duration = 0,
  ): void {
    enemy.aiState = state;
    enemy.stateAge = 0;
    enemy.stateTimer = duration;
  }

  private resolveEnemySeparation(delta: number): void {
    const stageMossEncounter =
      this.mode === "stage" && this.stageEncounter === "active";
    const passes = stageMossEncounter ? 3 : 1;
    const enemies = stageMossEncounter ? this.getCombatEnemies() : this.enemies;
    for (let pass = 0; pass < passes; pass += 1) {
      for (let firstIndex = 0; firstIndex < enemies.length; firstIndex += 1) {
        const first = enemies[firstIndex];
        if (!first?.alive) continue;
        for (
          let secondIndex = firstIndex + 1;
          secondIndex < enemies.length;
          secondIndex += 1
        ) {
          const second = enemies[secondIndex];
          if (!second?.alive) continue;
          const offset = sub(first.pos, second.pos);
          const gap = length(offset);
          const minimum =
            first.radius + second.radius + ENEMY_AI.separationPadding;
          if (gap >= minimum) continue;
          const direction = normalize(
            offset,
            normalize({
              x: Math.cos(first.id * 1.9),
              y: Math.sin(first.id * 1.9),
            }),
          );
          const correction =
            (minimum - gap) *
            (stageMossEncounter
              ? 0.5
              : Math.min(0.22, delta * ENEMY_AI.separationResponse));
          first.pos = this.resolveEnemyMovement(
            first.pos,
            add(first.pos, scale(direction, correction)),
            first.radius,
          );
          second.pos = this.resolveEnemyMovement(
            second.pos,
            add(second.pos, scale(direction, -correction)),
            second.radius,
          );
        }
      }
    }
  }

  private updateSequences(delta: number): void {
    for (let index = this.sequences.length - 1; index >= 0; index -= 1) {
      const sequence = this.sequences[index];
      if (!sequence) continue;
      sequence.elapsed += delta;

      if (sequence.kind === "moonDance") {
        const timings = [0.06, 0.24, 0.43, 0.69];
        const radii = [31, 45, 59, 82];
        if (
          sequence.stage < timings.length &&
          sequence.elapsed >= (timings[sequence.stage] ?? 99)
        ) {
          const final = sequence.stage === timings.length - 1;
          const radius = radii[sequence.stage] ?? 40;
          this.spawnArea({
            owner: sequence.owner,
            team: "party",
            pos: sequence.target,
            radius,
            innerRadius: Math.max(0, radius - (final ? 30 : 15)),
            damage: final ? 38 : CHARACTER_TUNING.nadi.ultimateDamage,
            damageScale: sequence.damageScale,
            knockback: final ? 50 : 16,
            color: final ? "#e0ffff" : "#82e9e9",
          });
          this.effects.spawn({
            kind: "ring",
            pos: sequence.target,
            life: final ? 0.48 : 0.32,
            size: radius,
            color: final ? "#e7ffff" : "#86eeee",
          });
          sequence.stage += 1;
        }
        if (sequence.elapsed > 1.04) this.sequences.splice(index, 1);
        continue;
      }

      if (sequence.stage === 0 && sequence.elapsed >= 0.52) {
        this.spawnArea({
          owner: sequence.owner,
          team: "party",
          pos: sequence.target,
          radius: 56,
          damage: CHARACTER_TUNING.meru.ultimateDamage,
          damageScale: sequence.damageScale,
          knockback: 58,
          color: "#8af3dc",
        });
        this.effects.spawn({
          kind: "crystal",
          pos: sequence.target,
          velocity: { x: 0, y: -14 },
          life: 0.72,
          size: 58,
          color: "#9cf8e4",
        });
        for (let shard = 0; shard < 16; shard += 1) {
          const angle = (shard / 16) * Math.PI * 2;
          this.effects.spawn({
            kind: "spark",
            pos: sequence.target,
            velocity: { x: Math.cos(angle) * 70, y: Math.sin(angle) * 45 },
            life: 0.55,
            size: 3 + (shard % 3),
            color: shard % 2 ? "#dfffee" : "#50d5bd",
          });
        }
        this.triggerImpact(4);
        sequence.stage = 1;
      }
      if (sequence.elapsed > 1.12) this.sequences.splice(index, 1);
    }
  }

  private updateProjectiles(delta: number): void {
    for (const projectile of this.projectiles) {
      if (!projectile.active) continue;
      projectile.life -= delta;
      if (projectile.life <= 0) {
        projectile.active = false;
        continue;
      }

      if (projectile.kind === "moonBlade") {
        if (!projectile.returning && projectile.life < projectile.maxLife * 0.52) {
          projectile.returning = true;
          projectile.hitIds.clear();
          this.emitAudio({
            kind: "projectileReturn",
            character: "nadi",
            position: { ...projectile.pos },
          });
        }
        if (projectile.returning) {
          const owner = this.getMember(projectile.owner);
          const direction = normalize(sub(owner.pos, projectile.pos), owner.facing);
          projectile.velocity = scale(direction, 176);
          if (distance(projectile.pos, owner.pos) < 10) {
            this.effects.spawn({
              kind: "impactRing",
              pos: {
                x: owner.pos.x + owner.facing.x * 7,
                y: owner.pos.y + owner.facing.y * 4 - 9,
              },
              life: NORMAL_ATTACK_EFFECTS.nadi.returnLife,
              size: NORMAL_ATTACK_EFFECTS.nadi.returnSize,
              color: "#75d9d2",
              alpha: 0.76,
            });
            projectile.active = false;
            continue;
          }
        }
      } else if (projectile.kind === "phosphor") {
        const target = this.findNearestEnemy(projectile.pos);
        if (target && distance(target.pos, projectile.pos) < 112) {
          const targetVelocity = scale(
            normalize(sub(target.pos, projectile.pos)),
            122,
          );
          projectile.velocity.x += (targetVelocity.x - projectile.velocity.x) * delta * 1.2;
          projectile.velocity.y += (targetVelocity.y - projectile.velocity.y) * delta * 1.2;
        }
      }

      projectile.pos.x += projectile.velocity.x * delta;
      projectile.pos.y += projectile.velocity.y * delta;

      if (projectile.kind === "windBlade" && Math.floor(this.time * 24) % 2 === 0) {
        this.effects.spawn({
          kind: "wind",
          pos: projectile.pos,
          life: 0.18,
          size: 13,
          color: "#61dacd",
          alpha: 0.65,
          layer: "back",
          rotation: Math.atan2(projectile.velocity.y, projectile.velocity.x),
        });
      } else if (
        projectile.kind === "moonBlade" ||
        projectile.kind === "phosphor"
      ) {
        this.emitProjectileTrail(projectile, delta);
      }

      if (
        this.room?.id === "crystalAltar" &&
        !projectile.hitIds.has(-999) &&
        distance(projectile.pos, this.velgran.pos) <= projectile.radius + VELGRAN_COMBAT.bodyRadius
      ) {
        projectile.hitIds.add(-999);
        this.applyDamageToVelgran(
          projectile.owner,
          projectile.damage * projectile.damageScale,
          projectile.kind === "windBlade" ? 8 : 0,
          projectile.pos,
          projectile.kind === "phosphor" ? "#8affdf" : "#cfffff",
        );
        if (projectile.kind === "phosphor") projectile.active = false;
      }
      if (this.room?.id === "crystalAltar" && projectile.owner === "nadi") {
        const destroyed = this.velgran.destroyProjectilesNear(projectile.pos, projectile.radius + 13);
        if (destroyed > 0) this.emitHit(projectile.pos, "#cfffff", 5);
      }

      for (const enemy of this.enemies) {
        if (
          !this.isEnemyCombatTarget(enemy) ||
          projectile.hitIds.has(enemy.id) ||
          distance(projectile.pos, enemy.pos) > projectile.radius + enemy.radius
        ) {
          continue;
        }
        projectile.hitIds.add(enemy.id);
        this.applyDamageToEnemy(enemy, projectile.damage * projectile.damageScale, {
          breakArmor: projectile.kind === "windBlade" ? 8 : 0,
          knockback: projectile.kind === "windBlade" ? 46 : 18,
          direction: normalize(projectile.velocity),
          color: projectile.kind === "moonBlade" ? "#cfffff" : "#65dfcb",
          impactStyle: projectile.kind === "moonBlade"
            ? "nadiNormal"
            : projectile.kind === "phosphor"
              ? "meruNormal"
              : undefined,
        });
        if (projectile.kind === "phosphor") projectile.active = false;
      }
    }
  }

  private updateAttackAreas(delta: number): void {
    for (const area of this.attacks) {
      if (!area.active) continue;
      if (
        area.team === "enemy" && area.sourceEnemyId !== null &&
        !this.isEnemyAllowedToDamage(area.sourceEnemyId)
      ) {
        area.active = false;
        continue;
      }
      area.life -= delta;
      const wasDelayed = area.delay > 0;
      area.delay -= delta;
      if (area.life <= 0) {
        area.active = false;
        continue;
      }
      if (area.delay > 0) continue;
      if (wasDelayed && area.activationEffect === "kyleHajin") {
        this.effects.spawn({
          kind: "wind",
          pos: { ...(area.sweepEnd ?? area.pos) },
          life: 0.34,
          size: 45,
          color: "#58ead9",
          rotation: Math.atan2(area.direction.y, area.direction.x),
        });
        area.activationEffect = null;
      }

      if (area.team === "party") {
        if (
          this.room?.id === "crystalAltar" &&
          !area.hitIds.has(-999) &&
          this.isInsideArea(this.velgran.pos, VELGRAN_COMBAT.bodyRadius, area)
        ) {
          area.hitIds.add(-999);
          this.applyDamageToVelgran(
            area.owner as CharacterId,
            area.damage * area.damageScale,
            area.breakArmor,
            this.velgran.pos,
            area.color,
          );
        }
        if (this.room?.id === "crystalAltar" && area.owner === "nadi") {
          const destroyed = this.velgran.destroyProjectilesNear(area.pos, area.radius);
          if (destroyed > 0) this.emitHit(area.pos, "#cfffff", 5);
        }
        for (const enemy of this.enemies) {
          if (!this.isEnemyCombatTarget(enemy) || area.hitIds.has(enemy.id)) continue;
          if (!this.isInsideArea(enemy.pos, enemy.radius, area)) continue;
          area.hitIds.add(enemy.id);
          this.applyDamageToEnemy(enemy, area.damage * area.damageScale, {
            breakArmor: area.breakArmor,
            knockback: area.knockback,
            direction: area.direction,
            color: area.color,
            impactStyle: area.impactStyle ?? undefined,
          });
        }
        continue;
      }

      for (const member of this.party) {
        if (member.downed || area.hitIds.has(member.id)) continue;
        if (!this.isInsideArea(member.pos, member.radius, area)) continue;
        area.hitIds.add(member.id);
        this.damageCharacter(
          member.id,
          area.damage,
          normalize(sub(member.pos, area.pos), area.direction),
        );
      }
    }
  }

  private updatePickups(delta: number): void {
    for (const pickup of this.pickups) {
      if (pickup.collected) continue;
      pickup.life -= delta;
      if (pickup.life <= 0) {
        pickup.collected = true;
        continue;
      }
      const collector = this.party.find(
        (member) =>
          !member.downed &&
          distance(member.pos, pickup.pos) <= COMBAT.pickupRadius + member.radius,
      );
      if (!collector) continue;
      pickup.collected = true;

      if (pickup.kind === "leaf") {
        const target = lowestHealthMember(this.party);
        if (target) {
          this.healMember(target, COMBAT.drop.leafHeal);
          this.effects.spawn({
            kind: "text",
            pos: { ...target.pos },
            velocity: { x: 0, y: -18 },
            life: 0.85,
            size: 8,
            color: "#b9f77d",
            text: `HP +${COMBAT.drop.leafHeal}`,
            layer: "hud",
          });
          this.spawnHealingEffects(target.pos, 6);
        }
      } else {
        const meru = this.getMember("meru");
        const restored = Math.min(COMBAT.drop.manaRestore, meru.maxMp - meru.mp);
        meru.mp = Math.min(meru.maxMp, meru.mp + COMBAT.drop.manaRestore);
        this.effects.spawn({
          kind: "text",
          pos: { ...meru.pos },
          velocity: { x: 0, y: -18 },
          life: 0.85,
          size: 8,
          color: "#9ca7ff",
          text: `MP +${restored}`,
          layer: "hud",
        });
      }
      this.emitAudio({
        kind: "pickup",
        pickup: pickup.kind,
        position: { ...pickup.pos },
      });
    }
    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      if (this.pickups[index]?.collected) this.pickups.splice(index, 1);
    }
  }

  private updateClearState(delta: number): void {
    const anyAlive = this.enemies.some((enemy) => enemy.alive);
    if (anyAlive) {
      this.clearDelay = -1;
      return;
    }
    if (this.clearDelay < 0) this.clearDelay = 1.15;
    this.clearDelay -= delta;
    if (this.clearDelay > 0) return;
    reviveAfterCombat(this.party);
    this.phase = "cleared";
  }

  private startNextWave(): void {
    this.wave += 1;
    this.enemies = createArenaEnemies(this.wave);
    this.clearTransientState();
    this.resetPartyPositions(false);
    this.phase = "playing";
    this.showBanner(`模擬戦 ${this.wave}`, 1.2);
  }

  private downCharacter(member: CharacterState): void {
    member.downed = true;
    member.hp = 0;
    member.actionTimer = 0;
    member.actionKind = null;
    member.actionDuration = 0;
    member.velocity = vec();
    member.moveIntent = vec();
    this.effects.spawn({
      kind: "dust",
      pos: member.pos,
      life: 0.5,
      size: 8,
      color: "#67766c",
    });

    if (member.id === this.activeId) {
      const next = findNextLivingCharacter(this.party, member.id);
      if (next) {
        this.activeId = next;
        this.formationRebuildTimer = PARTY_AI.formationRebuildDuration;
        this.switchCooldown = COMBAT.switchCooldown;
        this.showBanner(`${member.name} 戦闘不能｜${this.getMember(next).name}へ`, 1.2);
      }
    }

    if (this.party.every((item) => item.downed)) {
      this.phase = "gameover";
      this.clearActiveCombatObjects();
    }
  }

  private applyDamageToEnemy(
    enemy: EnemyState,
    rawDamage: number,
    impact: {
      breakArmor: number;
      knockback: number;
      direction: Vec2;
      color: string;
      impactStyle?: AttackImpactStyle;
    },
  ): void {
    if (!enemy.alive) return;
    let damage = rawDamage;
    const armorBefore = enemy.armor;
    if (armorBefore > 0) {
      const before = enemy.armor;
      enemy.armor = Math.max(0, enemy.armor - impact.breakArmor);
      damage *= enemy.armor > 0 ? 0.34 : 0.75;
      if (before !== enemy.armor) this.emitArmorFragments(enemy.pos, before - enemy.armor);
    }
    this.emitAudio({
      kind: "hit",
      material: armorBefore > 0 ? "stone" : "normal",
      position: { ...enemy.pos },
    });
    if (armorBefore > 0 && enemy.armor <= 0) {
      this.emitAudio({
        kind: "armorBreak",
        position: { ...enemy.pos },
      });
    }
    enemy.hp = Math.max(0, enemy.hp - Math.max(1, Math.round(damage)));
    enemy.hurtFlash = 0.11;
    enemy.knockback = scale(normalize(impact.direction), impact.knockback);
    if (impact.impactStyle) {
      this.emitNormalAttackHit(
        enemy.pos,
        impact.direction,
        impact.impactStyle,
        armorBefore > 0,
      );
    } else {
      this.emitHit(enemy.pos, impact.color, rawDamage >= 40 ? 10 : 5);
    }
    this.triggerImpact(rawDamage >= 40 ? 3 : 1.5);

    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  private applyDamageToVelgran(
    owner: CharacterId,
    rawDamage: number,
    breakArmor: number,
    position: Vec2,
    color: string,
  ): void {
    const result = this.velgran.receiveHit(owner, rawDamage, breakArmor);
    if (!result.accepted) return;
    this.emitAudio({ kind: "hit", material: result.armorDamage > 0 ? "stone" : "normal", position: { ...position } });
    this.emitHit(this.velgran.pos, color, result.damage >= 36 ? 10 : 6);
    this.triggerImpact(result.damage >= 36 ? 3 : 1.6);
    if (result.armorBroken) {
      this.emitAudio({ kind: "velgranArmorBreak", position: { ...this.velgran.pos } });
      this.showBanner("装甲崩壊｜胸の晶核が露出した", 1.15);
    }
    if (result.defeated) {
      this.hitStop = Math.max(this.hitStop, 0.1);
      this.clearActiveCombatObjects();
      if (!this.velgranRewardGranted) {
        this.velgranRewardGranted = true;
        this.exp += VELGRAN_EXP_REWARD;
        this.emitAudio({ kind: "experience", position: { ...this.velgran.pos } });
        this.effects.spawn({
          kind: "text",
          pos: { ...this.velgran.pos },
          velocity: { x: 0, y: -23 },
          life: 1.2,
          size: 9,
          color: "#f1d987",
          text: `EXP +${VELGRAN_EXP_REWARD}`,
          layer: "hud",
        });
      }
      this.showBanner("森晶獣の怒りが静まっていく……", 1.2);
    }
  }

  private killEnemy(enemy: EnemyState): void {
    enemy.alive = false;
    enemy.telegraph = 0;
    this.enemyDirector.remove(enemy.id);
    this.scheduleFieldEnemyRespawnFromDefeat(enemy.id);
    const grantsRewards = !enemy.expGranted;
    enemy.expGranted = true;
    this.emitAudio({
      kind: "enemyDefeated",
      position: { ...enemy.pos },
    });
    if (grantsRewards) {
      this.exp += enemy.exp;
      this.emitAudio({
        kind: "experience",
        position: { ...enemy.pos },
      });
      this.effects.spawn({
        kind: "text",
        pos: { ...enemy.pos },
        velocity: { x: 0, y: -23 },
        life: 1.05,
        size: 8,
        color: "#f1d987",
        text: `EXP +${enemy.exp}`,
        layer: "hud",
      });
    }
    for (let index = 0; index < 12; index += 1) {
      this.effects.spawn({
        kind: index % 3 === 0 ? "leaf" : "dust",
        pos: { ...enemy.pos },
        velocity: {
          x: (this.random() - 0.5) * 78,
          y: -20 - this.random() * 45,
        },
        life: 0.65 + this.random() * 0.35,
        size: 2 + this.random() * 3,
        color: enemy.kind === "mossPlun" ? "#7cab52" : "#667c72",
      });
    }
    if (grantsRewards) this.rollDrop(enemy.pos);
  }

  private rollDrop(position: Vec2): void {
    const lowest = lowestHealthMember(this.party, true);
    const hpNeed = lowest ? 1 - lowest.hp / lowest.maxHp : 0;
    const meru = this.getMember("meru");
    const mpNeed = meru.maxMp > 0 ? 1 - meru.mp / meru.maxMp : 0;
    const leafChance = hpNeed > 0.2 ? 0.7 : 0.09;
    const manaChance = mpNeed > 0.22 ? 0.52 : 0.07;
    const roll = this.random();
    let kind: Pickup["kind"] | null = null;

    if (hpNeed >= mpNeed && roll < leafChance) kind = "leaf";
    else if (roll < manaChance) kind = "mana";
    else if (roll < leafChance * 0.7) kind = "leaf";
    if (!kind) return;

    this.pickups.push({
      id: this.nextPickupId,
      kind,
      pos: {
        x: position.x + (this.random() - 0.5) * 12,
        y: position.y + (this.random() - 0.5) * 10,
      },
      life: 10,
      collected: false,
    });
    this.nextPickupId += 1;
  }

  private healMember(member: CharacterState, amount: number): number {
    if (member.downed) return 0;
    const healed = Math.min(amount, member.maxHp - member.hp);
    member.hp += healed;
    return healed;
  }

  private spawnHealingEffects(position: Vec2, count: number): void {
    this.effects.spawn({
      kind: "ring",
      pos: position,
      life: 0.65,
      size: 40,
      color: "#a6ee8a",
      layer: "back",
    });
    for (let index = 0; index < count; index += 1) {
      const angle = this.random() * Math.PI * 2;
      const radius = 10 + this.random() * 35;
      this.effects.spawn({
        kind: index % 3 === 0 ? "leaf" : "spark",
        pos: {
          x: position.x + Math.cos(angle) * radius,
          y: position.y + Math.sin(angle) * radius * 0.5,
        },
        velocity: { x: (this.random() - 0.5) * 8, y: -18 - this.random() * 22 },
        life: 0.6 + this.random() * 0.55,
        size: 2 + this.random() * 2,
        color: index % 2 ? "#d5ffc1" : "#76d9b1",
      });
    }
  }

  private emitHit(position: Vec2, color: string, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const angle = this.random() * Math.PI * 2;
      const speed = 25 + this.random() * 70;
      this.effects.spawn({
        kind: "spark",
        pos: { ...position },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 0.18 + this.random() * 0.2,
        size: 1.5 + this.random() * 2.5,
        color,
      });
    }
  }

  private emitProjectileTrail(projectile: Projectile, delta: number): void {
    const isMoonBlade = projectile.kind === "moonBlade";
    const interval = isMoonBlade
      ? NORMAL_ATTACK_EFFECTS.nadi.trailInterval
      : NORMAL_ATTACK_EFFECTS.meru.trailInterval;
    projectile.trailTimer -= delta;
    const direction = normalize(projectile.velocity);
    const side = perpendicular(direction);
    let emitted = 0;

    while (projectile.trailTimer <= 0 && emitted < 3) {
      const behind = isMoonBlade ? 4 : 3 + this.random() * 2;
      const spread = isMoonBlade ? 0 : (this.random() - 0.5) * 4;
      const trailPos = add(
        add(projectile.pos, scale(direction, -behind)),
        scale(side, spread),
      );
      if (isMoonBlade) {
        this.effects.spawn({
          kind: "moonTrail",
          pos: trailPos,
          life: NORMAL_ATTACK_EFFECTS.nadi.trailLife,
          size: NORMAL_ATTACK_EFFECTS.nadi.trailSize,
          color: emitted % 2 === 0
            ? ACCESSIBILITY.strongFlashes
              ? "#c6ffff"
              : "#8bbfbc"
            : "#60cfcb",
          alpha: 0.62,
          layer: "back",
          rotation: Math.atan2(direction.y, direction.x),
        });
      } else {
        const lifeRange =
          NORMAL_ATTACK_EFFECTS.meru.trailLifeMax -
          NORMAL_ATTACK_EFFECTS.meru.trailLifeMin;
        this.effects.spawn({
          kind: "phosphorMote",
          pos: trailPos,
          velocity: add(
            scale(direction, -5 - this.random() * 4),
            scale(side, (this.random() - 0.5) * 8),
          ),
          life:
            NORMAL_ATTACK_EFFECTS.meru.trailLifeMin +
            this.random() * lifeRange,
          size: 1 + this.random(),
          color: emitted % 2 === 0
            ? "#7ae3c8"
            : ACCESSIBILITY.strongFlashes
              ? "#b9f7e5"
              : "#86baaa",
          alpha: 0.72,
          layer: "back",
        });
      }
      projectile.trailTimer += interval;
      emitted += 1;
    }
  }

  private emitNormalAttackHit(
    position: Vec2,
    direction: Vec2,
    style: AttackImpactStyle,
    armored: boolean,
  ): void {
    const facingAngle = Math.atan2(direction.y, direction.x);
    if (armored) {
      for (let index = 0; index < 2; index += 1) {
        this.effects.spawn({
          kind: "dust",
          pos: { ...position },
          velocity: {
            x: (this.random() - 0.5) * 38,
            y: -18 - this.random() * 24,
          },
          life: 0.2,
          size: 2 + this.random(),
          color: index === 0 ? "#9c967e" : "#5f756c",
        });
      }
    }

    if (style === "kyleNormal") {
      const sparkCount = armored
        ? 2
        : NORMAL_ATTACK_EFFECTS.kyle.hitSparkCount;
      const fragmentCount = armored
        ? 1
        : NORMAL_ATTACK_EFFECTS.kyle.hitFragmentCount;
      for (let index = 0; index < sparkCount + fragmentCount; index += 1) {
        const angle = facingAngle + (this.random() - 0.5) * 0.9;
        const speed = 38 + this.random() * 46;
        const isCore = index < sparkCount;
        this.effects.spawn({
          kind: "spark",
          pos: { ...position },
          velocity: {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed,
          },
          life: NORMAL_ATTACK_EFFECTS.kyle.hitLife,
          size: isCore ? 1.5 + this.random() : 2 + this.random(),
          color: isCore
            ? ACCESSIBILITY.strongFlashes
              ? NORMAL_ATTACK_EFFECTS.kyle.coreColor
              : NORMAL_ATTACK_EFFECTS.kyle.mutedCoreColor
            : NORMAL_ATTACK_EFFECTS.kyle.outerColor,
        });
      }
      return;
    }

    if (style === "nadiNormal") {
      this.effects.spawn({
        kind: "impactRing",
        pos: { ...position },
        life: NORMAL_ATTACK_EFFECTS.nadi.hitLife,
        size: NORMAL_ATTACK_EFFECTS.nadi.hitSize,
        color: ACCESSIBILITY.strongFlashes ? "#c6ffff" : "#91c5c2",
        alpha: armored ? 0.58 : 0.82,
      });
      const count = armored
        ? 4
        : NORMAL_ATTACK_EFFECTS.nadi.hitParticleCount;
      for (let index = 0; index < count; index += 1) {
        const angle =
          (index / count) * Math.PI * 2 + (this.random() - 0.5) * 0.35;
        const speed = 28 + this.random() * 34;
        this.effects.spawn({
          kind: "spark",
          pos: { ...position },
          velocity: {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed,
          },
          life: 0.14 + this.random() * 0.04,
          size: 1.25 + this.random(),
          color: index % 2 === 0
            ? "#60cfcb"
            : ACCESSIBILITY.strongFlashes
              ? "#c6ffff"
              : "#8bbfbc",
        });
      }
      return;
    }

    this.effects.spawn({
      kind: "impactRing",
      pos: { ...position },
      life: NORMAL_ATTACK_EFFECTS.meru.hitLife,
      size: NORMAL_ATTACK_EFFECTS.meru.hitSize,
      color: ACCESSIBILITY.strongFlashes ? "#9ff4dc" : "#78baaa",
      alpha: armored ? 0.52 : 0.75,
    });
    const count = armored
      ? 4
      : NORMAL_ATTACK_EFFECTS.meru.hitParticleCount;
    for (let index = 0; index < count; index += 1) {
      const angle =
        (index / count) * Math.PI * 2 + (this.random() - 0.5) * 0.4;
      const speed = 20 + this.random() * 30;
      this.effects.spawn({
        kind: "phosphorMote",
        pos: { ...position },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        life: 0.16 + this.random() * 0.06,
        size: 1.25 + this.random(),
        color: index % 2 === 0
          ? "#7ae3c8"
          : ACCESSIBILITY.strongFlashes
            ? "#b9f7e5"
            : "#86baaa",
      });
    }
  }

  private emitArmorFragments(position: Vec2, amount: number): void {
    const count = Math.min(9, Math.max(3, Math.ceil(amount / 4)));
    for (let index = 0; index < count; index += 1) {
      this.effects.spawn({
        kind: "dust",
        pos: { ...position },
        velocity: {
          x: (this.random() - 0.5) * 74,
          y: -22 - this.random() * 54,
        },
        life: 0.5,
        size: 2 + this.random() * 3,
        color: index % 2 ? "#a9a083" : "#5f756c",
      });
    }
  }

  private triggerImpact(strength: number): void {
    this.hitStop = Math.max(this.hitStop, COMBAT.hitStop);
    this.shake = resolveImpactShake(this.shake, strength);
  }

  private emitAbilityAudio(
    member: CharacterState,
    ability: "normal" | "special" | "ultimate",
    automatic: boolean,
  ): void {
    const variant = this.normalSoundStep[member.id];
    if (ability === "normal") {
      this.normalSoundStep[member.id] = variant + 1;
    }
    this.emitAudio({
      kind: "ability",
      character: member.id,
      ability,
      automatic,
      variant,
      position: { ...member.pos },
    });
  }

  private emitAudio(event: GameAudioEvent): void {
    this.audioEvents.push(event);
  }

  private spawnProjectile(options: ProjectileOptions): Projectile {
    const projectile =
      this.projectiles.find((item) => !item.active) ?? this.projectiles[0];
    if (!projectile) throw new Error("Projectile pool cannot be empty.");
    projectile.active = true;
    projectile.id = this.nextPoolId;
    projectile.kind = options.kind;
    projectile.owner = options.owner;
    projectile.team = "party";
    projectile.pos = { ...options.pos };
    projectile.velocity = scale(normalize(options.direction), options.speed);
    projectile.radius = options.radius;
    projectile.damage = options.damage;
    projectile.life = options.life;
    projectile.maxLife = options.life;
    projectile.damageScale = options.damageScale;
    projectile.returning = false;
    projectile.trailTimer = 0;
    projectile.hitIds.clear();
    this.nextPoolId += 1;
    return projectile;
  }

  private spawnArea(options: AreaOptions): AttackArea {
    const area = this.attacks.find((item) => !item.active) ?? this.attacks[0];
    if (!area) throw new Error("Attack pool cannot be empty.");
    area.active = true;
    area.id = this.nextPoolId;
    area.owner = options.owner;
    area.team = options.team;
    area.pos = { ...options.pos };
    area.direction = normalize(options.direction ?? { x: 1, y: 0 });
    area.radius = options.radius;
    area.innerRadius = options.innerRadius ?? 0;
    area.arc = options.arc ?? Math.PI * 2;
    area.damage = options.damage;
    area.damageScale = options.damageScale ?? 1;
    area.life = options.life ?? COMBAT.attackAreaLifetime;
    area.delay = options.delay ?? 0;
    area.breakArmor = options.breakArmor ?? 0;
    area.knockback = options.knockback ?? 0;
    area.color = options.color ?? "#ffffff";
    area.impactStyle = options.impactStyle ?? null;
    area.sweepStart = options.sweepStart ? { ...options.sweepStart } : null;
    area.sweepEnd = options.sweepEnd ? { ...options.sweepEnd } : null;
    area.terminalRadius = options.terminalRadius ?? area.radius;
    area.sweepCollisionRadius = options.sweepCollisionRadius ?? 0;
    area.activationEffect = options.activationEffect ?? null;
    area.sourceEnemyId = options.sourceEnemyId ?? null;
    area.hitIds.clear();
    this.nextPoolId += 1;
    return area;
  }

  private isInsideArea(position: Vec2, radius: number, area: AttackArea): boolean {
    if (area.sweepStart && area.sweepEnd) {
      const fromStart = sub(position, area.sweepStart);
      // A thrust begins in front of Kyle; the capsule must never spill behind
      // him simply because its width overlaps the start point.
      if (
        fromStart.x * area.direction.x + fromStart.y * area.direction.y <
        -area.sweepCollisionRadius
      ) return false;
      const sweptRadius = area.radius + radius;
      const withinShaft = distancePointToSegment(
        position,
        area.sweepStart,
        area.sweepEnd,
      ) <= sweptRadius;
      const withinTerminal = distance(position, area.sweepEnd) <= area.terminalRadius + radius;
      if (!withinShaft && !withinTerminal) return false;
      if (area.sweepCollisionRadius > 0) {
        const reachable = this.resolveCharacterMovement(
          area.sweepStart,
          position,
          area.sweepCollisionRadius,
        );
        if (distance(reachable, position) > 1.5) return false;
      }
      return true;
    }
    const offset = sub(position, area.pos);
    const gap = length(offset);
    if (gap + radius < area.innerRadius || gap - radius > area.radius) return false;
    if (area.arc >= Math.PI * 1.99 || gap < 0.001) return true;
    return angleBetween(area.direction, offset) <= area.arc / 2;
  }

  private resolveBodyCollisions(): void {
    for (const member of this.party) {
      if (member.downed) continue;
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const offset = sub(member.pos, enemy.pos);
        const gap = length(offset);
        const minimum = member.radius + enemy.radius;
        if (gap >= minimum || gap < 0.001) continue;
        const direction = normalize(offset);
        const overlap = minimum - gap;
        member.pos = this.resolveCharacterMovement(
          member.pos,
          add(member.pos, scale(direction, overlap * 0.55)),
          member.radius,
        );
        enemy.pos = this.resolveEnemyMovement(
          enemy.pos,
          add(enemy.pos, scale(direction, -overlap * 0.45)),
          enemy.radius,
        );
      }
    }
  }

  private resolveCombatBodyContacts(): void {
    if (this.phase !== "playing" || this.encounterGrace > 0) return;
    const members = this.partyPresence === "formation"
      ? this.party.filter((member) => !member.downed)
      : [this.active].filter((member) => !member.downed);

    if (
      this.mode === "stage" &&
      this.room?.id === "crystalAltar" &&
      (this.velgran.phase === "active" ||
        this.velgran.phase === "coreExposed" ||
        this.velgran.phase === "recovering")
    ) {
      for (const member of members) {
        this.resolveCharacterBodyContact(
          member,
          this.velgran.pos,
          VELGRAN_COMBAT.bodyRadius,
          VELGRAN_COMBAT.contactDamage,
          VELGRAN_COMBAT.contactKnockback,
          "normal",
          VELGRAN_COMBAT.contactInvulnerability,
        );
      }
      return;
    }

    const combatEnemies = this.mode === "arena"
      ? this.enemies.filter((enemy) => enemy.alive)
      : this.stageEncounter === "active"
        ? this.getCombatEnemies()
        : [];
    for (const member of members) {
      for (const enemy of combatEnemies) {
        if (!enemy.alive || !enemy.aware || enemy.aiState === "notice") continue;
        this.resolveCharacterBodyContact(
          member,
          enemy.pos,
          enemy.radius,
          FIELD_ENEMY_CONTACT.damage[enemy.kind],
          FIELD_ENEMY_CONTACT.knockback[enemy.kind],
          enemy.armor > 0 ? "stone" : "normal",
        );
      }
    }
  }

  private resolveCharacterBodyContact(
    member: CharacterState,
    bodyPos: Vec2,
    bodyRadius: number,
    damage: number,
    knockback: number,
    material: "normal" | "stone",
    invulnerability = FIELD_ENEMY_CONTACT.invulnerability,
  ): void {
    const offset = sub(member.pos, bodyPos);
    const gap = length(offset);
    const minimum = member.radius + bodyRadius;
    if (gap >= minimum) return;
    const direction = normalize(offset, scale(member.facing, -1));
    const desired = add(member.pos, scale(direction, minimum - gap + 2));
    member.pos = this.resolveCharacterMovement(member.pos, desired, member.radius);

    if (member.id !== this.activeId) {
      const retreatDesired = add(member.pos, scale(direction, 48));
      const retreatTarget = this.resolveCharacterMovement(
        member.pos,
        retreatDesired,
        member.radius,
      );
      this.followerBodyRetreatUntil.set(member.id, this.time + 0.58);
      this.followerBodyRetreatTarget.set(member.id, retreatTarget);
      member.followerState = "return";
      member.followerTargetId = null;
    }

    // Authored attacks are processed before body contact.  Their regular
    // invulnerability therefore wins when both overlap in one frame.
    const damaged = this.damageCharacter(member.id, damage, direction, false, {
      invulnerability,
      knockback,
      impactStrength: 0.7,
      hitParticleCount: 3,
    });
    if (damaged) this.emitAudio({ kind: "hit", material, position: { ...member.pos } });
  }

  private resolvePartySeparation(delta: number): void {
    for (let firstIndex = 0; firstIndex < this.party.length; firstIndex += 1) {
      const first = this.party[firstIndex];
      if (!first || first.downed) continue;
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < this.party.length;
        secondIndex += 1
      ) {
        const second = this.party[secondIndex];
        if (!second || second.downed) continue;
        const offset = sub(first.pos, second.pos);
        const gap = length(offset);
        const minimum =
          (first.radius + second.radius) * PARTY_AI.separationMultiplier;
        if (gap >= minimum) continue;
        const direction = normalize(
          offset,
          perpendicular(this.formationFacing),
        );
        const correction =
          (minimum - gap) *
          Math.min(0.28, delta * PARTY_AI.separationResponse);

        if (first.id === this.activeId) {
          second.pos = this.resolveCharacterMovement(
            second.pos,
            add(second.pos, scale(direction, -correction)),
            second.radius,
          );
        } else if (second.id === this.activeId) {
          first.pos = this.resolveCharacterMovement(
            first.pos,
            add(first.pos, scale(direction, correction)),
            first.radius,
          );
        } else {
          first.pos = this.resolveCharacterMovement(
            first.pos,
            add(first.pos, scale(direction, correction * 0.5)),
            first.radius,
          );
          second.pos = this.resolveCharacterMovement(
            second.pos,
            add(second.pos, scale(direction, -correction * 0.5)),
            second.radius,
          );
        }
      }
    }
  }

  private findNearestEnemy(position: Vec2): EnemyState | null {
    if (this.mode === "stage" && this.stageEncounter !== "active") return null;
    let nearest: EnemyState | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (this.mode === "stage" && !this.isEnemyInActiveEncounter(enemy.id)) continue;
      const gap = distance(position, enemy.pos);
      if (gap < nearestDistance) {
        nearestDistance = gap;
        nearest = enemy;
      }
    }
    return nearest;
  }

  /**
   * Keeps Hajin Thrust a directional skill while forgiving a small aiming
   * error against a nearby, currently engaged enemy.  This is intentionally
   * not the general nearest-enemy helper: it never rotates Kyle toward a
   * flank, rear target, another encounter group, or a target behind terrain.
   */
  private resolveHajinThrustDirection(member: CharacterState): Vec2 {
    const baseDirection = normalize(member.facing, { x: 1, y: 0 });
    let candidate: EnemyState | null = null;
    let nearestDistance: number = KYLE_HAJIN_THRUST.aimRange;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (this.mode === "stage" && !this.isEnemyInActiveEncounter(enemy.id)) continue;
      const offset = sub(enemy.pos, member.pos);
      const gap = length(offset);
      if (gap > nearestDistance || gap < 0.001) continue;
      const direction = normalize(offset, baseDirection);
      if (angleBetween(baseDirection, direction) > KYLE_HAJIN_THRUST.maxAimCorrectionRadians) continue;
      const clearPath = this.resolveCharacterMovement(
        member.pos,
        enemy.pos,
        member.radius,
      );
      if (distance(clearPath, enemy.pos) > 1.5) continue;
      nearestDistance = gap;
      candidate = enemy;
    }
    return candidate
      ? normalize(sub(candidate.pos, member.pos), baseDirection)
      : baseDirection;
  }

  private findNearestLivingMember(position: Vec2): CharacterState | null {
    let nearest: CharacterState | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const member of this.party) {
      if (member.downed) continue;
      const gap = distance(position, member.pos);
      if (gap < nearestDistance) {
        nearestDistance = gap;
        nearest = member;
      }
    }
    return nearest;
  }

  private getMember(id: CharacterId): CharacterState {
    const member = this.party.find((item) => item.id === id);
    if (!member) throw new Error(`Character ${id} is missing.`);
    return member;
  }

  private resetPartyPositions(resetFacing = true): void {
    const positions = [
      { x: 250, y: 206 },
      { x: 222, y: 224 },
      { x: 226, y: 188 },
    ];
    this.party.forEach((member, index) => {
      member.pos = { ...(positions[index] ?? positions[0] ?? { x: 240, y: 206 }) };
      member.formationSlot = { ...member.pos };
      member.followerState = "formation";
      member.followerTargetId = null;
      member.velocity = vec();
      member.moveIntent = vec();
      member.actionTimer = 0;
      member.actionKind = null;
      member.actionDuration = 0;
      if (resetFacing) member.facing = { x: 1, y: 0 };
      member.actionFacing = { ...member.facing };
    });
    this.formationFacing = { x: 1, y: 0 };
    this.formationRebuildTimer = PARTY_AI.formationRebuildDuration;
  }

  private placePartyAtRoomSpawn(spawn?: Vec2, facing: Vec2 = { x: 0, y: -1 }, activeAtSpawn = false): void {
    if (!this.room) return;
    const requestedBase = spawn ?? this.room.spawn;
    const project = (position: Vec2, radius: number): Vec2 => {
      if (this.room?.id === "ancientForest") return findNearestAncientForestWalkablePosition(
        position, radius, { villageExitOpen: this.forestSealStoneObtained },
      ) ?? { ...ANCIENT_FOREST.spawn };
      if (this.room?.id === "mossRootRuins") return findNearestMossRootWalkablePosition(
        position, radius, this.mossRootCollisionOptions(),
      ) ?? { ...MOSS_ROOT_RUINS.spawn };
      if (this.room?.id === "spiritClothStonescaleDepths") return findNearestDepthsWalkablePosition(
        position, radius, this.depthsCollisionOptions(),
      ) ?? { ...SPIRIT_CLOTH_STONESCALE_DEPTHS.spawn };
      return { ...position };
    };
    const base = project(requestedBase, this.active.radius);
    const requestedPositions = [
      base,
      { x: base.x - 30, y: base.y + 18 },
      { x: base.x + 30, y: base.y + 18 },
    ];
    const anchorIndex = activeAtSpawn ? this.party.findIndex(member => member.id === this.activeId) : 0;
    this.party.forEach((member, index) => {
      const slot = (index - anchorIndex + this.party.length) % this.party.length;
      const position = project(requestedPositions[slot] ?? base, member.radius);
      member.pos = { ...position };
      member.formationSlot = { ...position };
      member.facing = { ...facing };
      member.actionFacing = { ...member.facing };
      member.velocity = vec();
      member.moveIntent = vec();
      member.followerState = "formation";
      member.followerTargetId = null;
      member.actionTimer = 0;
      member.actionKind = null;
      member.actionDuration = 0;
    });
    this.formationFacing = { ...facing };
    this.formationRebuildTimer = PARTY_AI.formationRebuildDuration;
  }

  private clearActiveCombatObjects(): void {
    for (const projectile of this.projectiles) projectile.active = false;
    for (const area of this.attacks) area.active = false;
    this.sequences.length = 0;
  }

  private clearTransientState(): void {
    this.techFeedback = null;
    this.clearActiveCombatObjects();
    this.pickups.length = 0;
    this.effects.clear();
    this.clearDelay = -1;
    this.hitStop = 0;
    this.shake = 0;
    this.switchCooldown = 0;
    this.encounterGrace = this.mode === "stage" ? 0 : ENEMY_AI.encounterGrace;
    this.encounterAlerted = false;
    this.enemyDirector.reset(this.enemies);
    this.bufferedActions.clear();
    this.followerBodyRetreatUntil.clear();
    this.followerBodyRetreatTarget.clear();
  }

  private beginCharacterAction(
    member: CharacterState,
    kind: CharacterActionKind,
    duration: number,
  ): void {
    member.actionKind = kind;
    member.actionDuration = duration;
    member.actionTimer = duration;
    member.actionSequenceId += 1;
    member.actionFacing = { ...member.facing };
  }

  private showBanner(text: string, duration: number): void {
    this.banner = text;
    this.bannerTimer = duration;
  }
}
