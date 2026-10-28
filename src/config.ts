import type {
  CharacterId,
  EnemyArchetype,
  EnemyKind,
} from "./game/types";

export const VIEW = {
  width: 640,
  height: 360,
  arena: { left: 42, top: 54, right: 598, bottom: 326 },
} as const;

export const ACCESSIBILITY = {
  /** Set false to completely disable camera displacement. */
  screenShake: true,
  /** Set false to remove strong white hit flashes. */
  strongFlashes: true,
} as const;

export const AUDIO = {
  initialMusicVolume: 0.4,
  initialSfxVolume: 0.65,
  battleFadeIn: 0.55,
  gameOverFadeOut: 0.6,
  pauseResumeFadeIn: 0.24,
} as const;

export const PARTY_ORDER: readonly CharacterId[] = ["kyle", "nadi", "meru"];

export const CHARACTER_TUNING = {
  kyle: {
    name: "カイル",
    hp: 120,
    mp: 0,
    speed: 102,
    radius: 9,
    color: "#b94f32",
    accent: "#54d7d2",
    attackDamage: 18,
    specialDamage: 34,
    ultimateDamage: 58,
  },
  nadi: {
    name: "ナディ",
    hp: 100,
    mp: 0,
    speed: 108,
    radius: 9,
    color: "#275d4c",
    accent: "#baf5f4",
    attackDamage: 16,
    specialDamage: 29,
    ultimateDamage: 18,
  },
  meru: {
    name: "メル",
    hp: 82,
    mp: 100,
    speed: 98,
    radius: 8,
    color: "#344f91",
    accent: "#7fe7ca",
    attackDamage: 13,
    specialDamage: 0,
    ultimateDamage: 64,
  },
} as const;

export const COMBAT = {
  techSecondsPerSegment: 5,
  invulnerability: 1,
  rearDamageScale: 0.5,
  rearDamageTakenScale: 0.5,
  hitStop: 0.045,
  screenShake: 2.4,
  switchCooldown: 0.48,
  attackAreaLifetime: 0.13,
  pickupRadius: 18,
  reviveRatio: 0.3,
  normalCooldown: {
    kyle: 0.36,
    nadi: 0.62,
    meru: 0.52,
  },
  specialCooldown: {
    kyle: 0.32,
    nadi: 0.34,
    meru: 0.38,
  },
  ultimateCooldown: {
    kyle: 0.5,
    nadi: 1.04,
    meru: 1.12,
  },
  autoAttackRange: {
    kyle: 46,
    nadi: 105,
    meru: 130,
  },
  autoHeal: {
    threshold: 0.45,
    mpCost: 18,
    amount: 27,
    cooldown: 5.2,
  },
  manualHeal: {
    amount: 31,
    radius: 82,
  },
  drop: {
    leafHeal: 22,
    manaRestore: 26,
  },
} as const;

/**
 * Velgran's durability and close-contact rules.  Keeping these values here
 * makes the state multiplier order explicit and keeps presentation code from
 * silently changing battle balance.
 */
export const VELGRAN_COMBAT = {
  maxHp: 672,
  maxArmor: 90,
  normalDamageMultiplier: 0.68,
  exposedDamageMultiplier: 0.78,
  exposedDuration: 1.56,
  bodyRadius: 30,
  contactDamage: 12,
  contactInvulnerability: 0.8,
  contactKnockback: 94,
  proximityDistance: 76,
  proximityHold: 1.35,
  proximityResetDelay: 2.4,
  repel: {
    windupDuration: 0.5,
    recoveryDuration: 0.42,
    radius: 92,
    damage: 16,
    knockback: 118,
  },
} as const;

/** Body-contact damage is deliberately lower than each enemy's authored hit. */
export const FIELD_ENEMY_CONTACT = {
  invulnerability: 0.8,
  damage: {
    mossPlun: 4,
    lumibane: 5,
    garacrow: 8,
    utsurobou: 7,
    iwaUroko: 10,
  },
  knockback: {
    mossPlun: 48,
    lumibane: 52,
    garacrow: 64,
    utsurobou: 56,
    iwaUroko: 74,
  },
} as const satisfies {
  invulnerability: number;
  damage: Record<EnemyKind, number>;
  knockback: Record<EnemyKind, number>;
};

/** Presentation and hit timing for Kyle's grounded special thrust. */
export const KYLE_HAJIN_THRUST = {
  dashDistance: 34,
  aimRange: 104,
  maxAimCorrectionRadians: Math.PI / 5,
  hitDelay: 0.08,
  hitLifetime: 0.16,
  sweepRadius: 26,
  terminalRadius: 32,
  sweepStartOffset: 6,
  collisionRadius: CHARACTER_TUNING.kyle.radius,
} as const;

/**
 * Presentation-only values for the three normal attacks. These values do not
 * affect damage, collision radii, projectile speed, lifetime, or cooldowns.
 */
export const NORMAL_ATTACK_EFFECTS = {
  kyle: {
    slashLife: 0.17,
    slashSize: 29,
    outerColor: "#55cfc3",
    coreColor: "#effff9",
    mutedCoreColor: "#bdd8d1",
    hitLife: 0.16,
    hitSparkCount: 4,
    hitFragmentCount: 2,
  },
  nadi: {
    launchLife: 0.14,
    launchSize: 12,
    trailInterval: 1 / 26,
    trailLife: 0.15,
    trailSize: 6,
    hitLife: 0.15,
    hitSize: 15,
    hitParticleCount: 5,
    returnLife: 0.13,
    returnSize: 9,
  },
  meru: {
    launchLife: 0.12,
    launchSize: 8,
    trailInterval: 1 / 21,
    trailLifeMin: 0.16,
    trailLifeMax: 0.26,
    hitLife: 0.15,
    hitSize: 13,
    hitParticleCount: 6,
  },
} as const;

/**
 * Party spacing is expressed in the Canvas' logical pixels (640×360).
 * These values are intentionally centralized for quick play-test tuning.
 */
export const PARTY_AI = {
  formationDistance: {
    kyle: 70,
    nadi: 84,
    meru: 118,
  },
  formationBackFactor: 0.82,
  formationSideFactor: 0.58,
  formationRotationResponse: 6.5,
  formationRebuildDuration: 0.42,
  hudSafeLeft: 146,
  regroupSpeed: 285,
  followSpeedScale: 1.32,
  slotTolerance: 7,
  separationMultiplier: 1.35,
  separationResponse: 5,
  chaseLimit: {
    kyle: 120,
    nadi: 132,
    meru: 155,
  },
  engageTrigger: {
    kyle: 94,
    nadi: 118,
    meru: 148,
  },
  attackStandOff: {
    kyle: 27,
    nadi: 84,
    meru: 118,
  },
} as const;

export interface EnemyBehaviorTuning {
  detectionRadius: number;
  idleSpeedRatio: number;
  normalSpeedRatio: number;
  optimalDistance: number;
  readyDistance: number;
  waitingDistanceMin: number;
  waitingDistanceMax: number;
  windupDuration: number;
  attackDuration: number;
  attackSpeedRatio: number;
  recoverDuration: number;
  retreatSpeedRatio: number;
  repositionDuration: number;
  maxConcurrentAttackers: number;
}

/**
 * Enemy coordination and archetype data. Future enemies can select `swarm`
 * or `spacing` without replacing the tutorial director.
 */
export const ENEMY_AI: {
  encounterGrace: number;
  noticeDurationMin: number;
  noticeDurationMax: number;
  noticeStagger: number;
  alertRadiusMultiplier: number;
  meleeAttackSlots: number;
  readySlots: number;
  minAttackInterval: number;
  tokenMaxDuration: number;
  separationPadding: number;
  separationResponse: number;
  reservationAllyClearance: number;
  orbitAngularSpeed: number;
  behavior: Record<EnemyArchetype, EnemyBehaviorTuning>;
} = {
  encounterGrace: 1.35,
  noticeDurationMin: 0.45,
  noticeDurationMax: 0.72,
  noticeStagger: 0.58,
  alertRadiusMultiplier: 1.55,
  meleeAttackSlots: 1,
  readySlots: 1,
  minAttackInterval: 0.85,
  tokenMaxDuration: 3.8,
  separationPadding: 7,
  separationResponse: 4.5,
  reservationAllyClearance: 52,
  orbitAngularSpeed: 0.2,
  behavior: {
    basicMelee: {
      detectionRadius: 270,
      idleSpeedRatio: 0.18,
      normalSpeedRatio: 0.64,
      optimalDistance: 30,
      readyDistance: 94,
      waitingDistanceMin: 128,
      waitingDistanceMax: 164,
      windupDuration: 0.72,
      attackDuration: 0.22,
      attackSpeedRatio: 0.72,
      recoverDuration: 0.72,
      retreatSpeedRatio: 0.28,
      repositionDuration: 0.9,
      maxConcurrentAttackers: 1,
    },
    swarm: {
      detectionRadius: 195,
      idleSpeedRatio: 0.24,
      normalSpeedRatio: 0.72,
      optimalDistance: 27,
      readyDistance: 78,
      waitingDistanceMin: 108,
      waitingDistanceMax: 142,
      windupDuration: 0.45,
      attackDuration: 0.18,
      attackSpeedRatio: 0.72,
      recoverDuration: 0.42,
      retreatSpeedRatio: 0.22,
      repositionDuration: 0.52,
      maxConcurrentAttackers: 3,
    },
    spacing: {
      detectionRadius: 255,
      idleSpeedRatio: 0.2,
      normalSpeedRatio: 0.68,
      optimalDistance: 112,
      readyDistance: 124,
      waitingDistanceMin: 138,
      waitingDistanceMax: 180,
      windupDuration: 0.78,
      attackDuration: 0.12,
      attackSpeedRatio: 0,
      recoverDuration: 0.58,
      retreatSpeedRatio: 0.58,
      repositionDuration: 0.72,
      maxConcurrentAttackers: 1,
    },
    heavyCharge: {
      detectionRadius: 275,
      idleSpeedRatio: 0.12,
      normalSpeedRatio: 0.4,
      optimalDistance: 92,
      readyDistance: 126,
      waitingDistanceMin: 160,
      waitingDistanceMax: 195,
      windupDuration: 1.15,
      attackDuration: 0.42,
      attackSpeedRatio: 2.15,
      recoverDuration: 1.3,
      retreatSpeedRatio: 0.12,
      repositionDuration: 0.6,
      maxConcurrentAttackers: 1,
    },
  },
};

/** Distance-based escape tuning for free-roam stage encounters. */
export const STAGE_ENCOUNTER = {
  disengageDistance: 300,
  disengageHold: 0.7,
  reengageCooldown: 1.5,
} as const;

export const MOSS_PLUN_JUMP_SLAM = {
  attackDuration: 0.36,
  landingTime: 0.18,
  impactRing: {
    life: 0.28,
    size: 24,
    color: "#b8d86a",
  },
  leafCount: 4,
  dustCount: 4,
} as const;

export const LUMIBANE_LUMINOUS_DASH = {
  attackDuration: 0.24,
  impactTime: 0.05,
  attackSpeedRatio: 1.65,
  impactRing: {
    life: 0.18,
    size: 15,
    color: "#8df4e5",
  },
  windCount: 2,
  sparkCount: 3,
} as const;

export const GARACROW_DIVE_STRIKE = {
  attackDuration: 0.34,
  impactTime: 0.08,
  attackSpeedRatio: 1.35,
  impactRadius: 30,
  impactOffset: 18,
  knockback: 46,
  impactRing: {
    life: 0.24,
    size: 22,
    color: "#65cfc4",
  },
  windCount: 3,
  sparkCount: 3,
} as const;

export const UTSUROBOU_MASK_CURSE_WAVE = {
  attackDuration: 0.34,
  impactTime: 0.08,
  attackSpeedRatio: 0,
  radius: 46,
  knockback: 20,
  impactRing: {
    life: 0.32,
    size: 42,
    color: "#75ddd2",
  },
  sparkCount: 6,
} as const;

export const IWAUROKO_ROCK_ARMOR_CHARGE = {
  windupDuration: 0.2,
  attackDuration: 0.55,
  attackSpeedRatio: 2.15,
  recoverDuration: 0.9,
  maxAimCorrectionRadians: Math.PI / 15,
  collisionPadding: 6,
  minimumClearDistance: 72,
  retryDelay: 0.48,
  tailSweep: {
    windupDuration: 0.5,
    attackDuration: 0.28,
    impactTime: 0.08,
    recoverDuration: 0.72,
    radius: 60,
    damage: 18,
    knockback: 28,
  },
} as const;

export const ENEMY_TUNING: Record<
  EnemyKind,
  {
    name: string;
    hp: number;
    armor: number;
    archetype: EnemyArchetype;
    radius: number;
    damage: number;
    attackCooldown: number;
    exp: number;
  }
> = {
  mossPlun: {
    name: "モスプルン",
    hp: 58,
    armor: 0,
    archetype: "basicMelee",
    radius: 12,
    damage: 18,
    attackCooldown: 1.8,
    exp: 12,
  },
  garacrow: {
    name: "ガラクロウ",
    hp: 88,
    armor: 0,
    archetype: "basicMelee",
    radius: 15,
    damage: 22,
    attackCooldown: 2.1,
    exp: 20,
  },
  lumibane: {
    name: "ルミバネ",
    hp: 42,
    armor: 0,
    archetype: "swarm",
    radius: 10,
    damage: 12,
    attackCooldown: 1.5,
    exp: 10,
  },
  utsurobou: {
    name: "ウツロボウ",
    hp: 70,
    armor: 0,
    archetype: "basicMelee",
    radius: 13,
    damage: 16,
    attackCooldown: 2.2,
    exp: 18,
  },
  iwaUroko: {
    name: "イワウロコ",
    hp: 115,
    armor: 32,
    archetype: "heavyCharge",
    radius: 16,
    damage: 30,
    attackCooldown: 1.45,
    exp: 28,
  },
};

export const EFFECT_POOL_SIZE = 220;
export const PROJECTILE_POOL_SIZE = 32;
export const ATTACK_POOL_SIZE = 48;
