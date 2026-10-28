import type { MusicTrackId } from "../audio/musicTracks";

export type CharacterId = "kyle" | "nadi" | "meru";
export type EnemyKind =
  | "mossPlun"
  | "garacrow"
  | "lumibane"
  | "utsurobou"
  | "iwaUroko";
export type EnemyArchetype =
  | "basicMelee"
  | "swarm"
  | "spacing"
  | "heavyCharge";
export type EnemyAiState =
  | "idle"
  | "notice"
  | "approach"
  | "windup"
  | "attack"
  | "recover"
  | "reposition";
export type EnemyAttackStyle = "default" | "iwaTailSweep";
export type FollowerAiState = "formation" | "engage" | "return";
export type Team = "party" | "enemy";
export type GamePhase = "intro" | "playing" | "paused" | "cleared" | "gameover";
export type InputMode = "keyboard" | "touch";
/** Presentation state for the Layer 2 crystal healing sanctuary. */
export type HealingSpringPhase = "idle" | "charging" | "healing" | "afterglow";
export type CharacterActionKind =
  | "normal"
  | "special"
  | "ultimate"
  | "switch";
export type ActionName =
  | "attack"
  | "special"
  | "ultimate"
  | "switch"
  | "interact"
  | "status"
  | "pause";

export interface Vec2 {
  x: number;
  y: number;
}

export interface InputFrame {
  move: Vec2;
  pressed: ReadonlySet<ActionName>;
  held: ReadonlySet<ActionName>;
  mode: InputMode;
}

export interface CharacterState {
  id: CharacterId;
  name: string;
  color: string;
  accent: string;
  pos: Vec2;
  velocity: Vec2;
  /** Presentation-only movement intent for directional walk animation. */
  moveIntent: Vec2;
  facing: Vec2;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  radius: number;
  moveSpeed: number;
  downed: boolean;
  invulnerable: number;
  barrier: number;
  hurtFlash: number;
  actionTimer: number;
  /** Presentation-facing action identity shared by all party sprite renderers. */
  actionKind: CharacterActionKind | null;
  /** Total action time captured when the current action starts. */
  actionDuration: number;
  /** Monotonic restart marker for consecutive uses of the same action. */
  actionSequenceId: number;
  /** Facing captured at action start so authored rows do not flip mid-action. */
  actionFacing: Vec2;
  formationSlot: Vec2;
  followerState: FollowerAiState;
  followerTargetId: number | null;
  /** Continuous technique resource, measured in segments from 0 to 3. */
  techCharge: number;
  cooldowns: {
    normal: number;
    special: number;
    ultimate: number;
    autoHeal: number;
  };
}

export interface EnemyState {
  id: number;
  kind: EnemyKind;
  name: string;
  pos: Vec2;
  velocity: Vec2;
  facing: Vec2;
  hp: number;
  maxHp: number;
  radius: number;
  moveSpeed: number;
  archetype: EnemyArchetype;
  aiState: EnemyAiState;
  stateTimer: number;
  stateAge: number;
  aware: boolean;
  noticeDelay: number;
  idleAnchor: Vec2;
  idleTarget: Vec2;
  reservedPos: Vec2;
  reservedAngle: number;
  hasAttackToken: boolean;
  isReadySlot: boolean;
  tokenAge: number;
  attackDirection: Vec2;
  /** Current authored attack behavior; defaults to the enemy's primary attack. */
  attackStyle: EnemyAttackStyle;
  attackConnected: boolean;
  alive: boolean;
  armor: number;
  maxArmor: number;
  attackCooldown: number;
  telegraph: number;
  telegraphDuration: number;
  telegraphTarget: Vec2;
  hurtFlash: number;
  knockback: Vec2;
  exp: number;
  /** Persisted across a disengage reset so defeated enemies cannot award EXP twice. */
  expGranted: boolean;
}

export interface Projectile {
  active: boolean;
  id: number;
  kind: "windBlade" | "moonBlade" | "phosphor";
  owner: CharacterId;
  team: Team;
  pos: Vec2;
  velocity: Vec2;
  radius: number;
  damage: number;
  life: number;
  maxLife: number;
  damageScale: number;
  returning: boolean;
  trailTimer: number;
  hitIds: Set<number>;
}

export type AttackImpactStyle =
  | "kyleNormal"
  | "nadiNormal"
  | "meruNormal";

export interface AttackArea {
  active: boolean;
  id: number;
  owner: CharacterId | "enemy";
  team: Team;
  pos: Vec2;
  direction: Vec2;
  radius: number;
  innerRadius: number;
  arc: number;
  damage: number;
  damageScale: number;
  life: number;
  delay: number;
  breakArmor: number;
  knockback: number;
  hitIds: Set<number | CharacterId>;
  color: string;
  impactStyle: AttackImpactStyle | null;
  /** Optional capsule segment for short, grounded charge attacks. */
  sweepStart: Vec2 | null;
  sweepEnd: Vec2 | null;
  terminalRadius: number;
  sweepCollisionRadius: number;
  /** A small presentation cue emitted when an area first becomes active. */
  activationEffect: "kyleHajin" | null;
  /** Enemy areas retain their source so dormant groups can never damage. */
  sourceEnemyId: number | null;
}

export interface Pickup {
  id: number;
  kind: "leaf" | "mana";
  pos: Vec2;
  life: number;
  collected: boolean;
}

export interface UltimateSequence {
  owner: CharacterId;
  kind: "moonDance" | "crystalFall";
  elapsed: number;
  stage: number;
  target: Vec2;
  damageScale: number;
}

/** Presentation-only state for the blocking RPG-style landmark dialogue. */
export interface DialogueSnapshot {
  sourceId: string;
  pageIndex: number;
  pageCount: number;
  text: string;
  fullyVisible: boolean;
}

export type VelgranPhase =
  | "inactive"
  | "dormant"
  | "introParty"
  | "introPan"
  | "awakening"
  | "active"
  | "coreExposed"
  | "recovering"
  | "defeatStagger"
  | "calming"
  | "sealForming"
  | "sealReady"
  | "blessing"
  | "peaceful"
  | "cleared";

export interface VelgranHazardSnapshot {
  kind: "stomp" | "root";
  pos: Vec2;
  radius: number;
  start: Vec2;
  end: Vec2;
  progress: number;
  active: boolean;
}

export interface VelgranProjectileSnapshot {
  id: number;
  pos: Vec2;
  velocity: Vec2;
  radius: number;
  active: boolean;
}

export interface VelgranSnapshot {
  phase: VelgranPhase;
  pos: Vec2;
  facing: Vec2;
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  hurtFlash: number;
  phaseTime: number;
  moving: boolean;
  moveTime: number;
  attack: "stomp" | "roots" | "shards" | "forestRing" | "repel" | null;
  attackTime: number;
  hazards: readonly VelgranHazardSnapshot[];
  crystalProjectiles: readonly VelgranProjectileSnapshot[];
  sealStoneVisible: boolean;
  introSeen: boolean;
}

export interface WorldSnapshot {
  techFeedback: { character: CharacterId; required: number; timer: number } | null;
  phase: GamePhase;
  mode: import("../stage/types").GameMode;
  partyPresence: import("../stage/types").PartyPresence;
  stageId: import("../stage/types").StageId | null;
  roomId: import("../stage/types").RoomId | null;
  roomName: string | null;
  stageEncounter: import("../stage/types").StageEncounterState | null;
  stageEncounterNoticeEnemyId: number | null;
  stageLayer: "ancientForest" | "mossRootRuins" | "lightwingCrystalCavern" | "spiritClothStonescaleDepths" | "crystalAltar" | null;
  worldWidth: number;
  worldHeight: number;
  camera: import("../stage/StageCamera").CameraSnapshot;
  activeEncounter: import("../stage/maps/mossRootRuinsMap").EncounterGroupId | import("../stage/maps/lightwingCrystalCavernMap").LightwingEncounterGroupId | import("../stage/maps/spiritClothStonescaleDepthsMap").DepthsEncounterGroupId | null;
  clearedEncounters: readonly (import("../stage/maps/mossRootRuinsMap").EncounterGroupId | import("../stage/maps/lightwingCrystalCavernMap").LightwingEncounterGroupId | import("../stage/maps/spiritClothStonescaleDepthsMap").DepthsEncounterGroupId)[];
  encounterAlive: number;
  encounterTotal: number;
  disengageProgress: number;
  reengageCooldown: number;
  northGateUnlocked: boolean;
  gateUnlockProgress: number;
  primaryCrystalActivated: boolean;
  secondaryCrystalActivated: boolean;
  crystalPathUnlocked: boolean;
  crystalPathAnimationProgress: number;
  /** Number of lake-platform chunks whose rise cue has been dispatched. */
  crystalPathRevealStep: number;
  spiritLampActivated: boolean;
  stoneWedgeActivated: boolean;
  depthsCentralGateOpened: boolean;
  /** Visual-only progress while the two-seal gate lowers into the floor. */
  depthsCentralGateOpenProgress: number;
  healingSpringPhase: HealingSpringPhase;
  /** Phase-local, clamped visual progress for the Layer 2 healing sanctuary. */
  healingSpringProgress: number;
  dialogue: DialogueSnapshot | null;
  velgran: VelgranSnapshot | null;
  forestSealStoneObtained: boolean;
  musicScene: MusicTrackId;
  interactionPrompt: string | null;
  springCooldown: number;
  roomTransitionOpacity: number;
  time: number;
  activeId: CharacterId;
  party: readonly CharacterState[];
  enemies: readonly EnemyState[];
  projectiles: readonly Projectile[];
  attacks: readonly AttackArea[];
  pickups: readonly Pickup[];
  exp: number;
  wave: number;
  banner: string;
  bannerTimer: number;
  hitStop: number;
  shake: number;
  encounterGrace: number;
  switchCooldown: number;
  debugAi: boolean;
}
