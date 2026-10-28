import {
  ATTACK_POOL_SIZE,
  CHARACTER_TUNING,
  ENEMY_AI,
  ENEMY_TUNING,
  PARTY_ORDER,
  PROJECTILE_POOL_SIZE,
} from "../config";
import { vec } from "./math";
import type {
  AttackArea,
  CharacterState,
  EnemyKind,
  EnemyState,
  Projectile,
} from "./types";

export function createParty(): CharacterState[] {
  const positions = [
    { x: 250, y: 206 },
    { x: 222, y: 224 },
    { x: 226, y: 188 },
  ];

  return PARTY_ORDER.map((id, index) => {
    const tuning = CHARACTER_TUNING[id];
    return {
      id,
      name: tuning.name,
      color: tuning.color,
      accent: tuning.accent,
      pos: { ...(positions[index] ?? positions[0] ?? { x: 240, y: 206 }) },
      velocity: vec(),
      moveIntent: vec(),
      facing: { x: 1, y: 0 },
      hp: tuning.hp,
      maxHp: tuning.hp,
      mp: tuning.mp,
      maxMp: tuning.mp,
      radius: tuning.radius,
      moveSpeed: tuning.speed,
      downed: false,
      invulnerable: 0,
      barrier: 0,
      hurtFlash: 0,
      actionTimer: 0,
      actionKind: null,
      actionDuration: 0,
      actionSequenceId: 0,
      actionFacing: { x: 1, y: 0 },
      formationSlot: { ...(positions[index] ?? positions[0] ?? { x: 240, y: 206 }) },
      followerState: "formation",
      followerTargetId: null,
      techCharge: 0,
      cooldowns: {
        normal: 0,
        special: 0,
        ultimate: 0,
        autoHeal: 0,
      },
    };
  });
}

export function createEnemy(
  id: number,
  kind: EnemyKind,
  x: number,
  y: number,
  wave = 1,
): EnemyState {
  const tuning = ENEMY_TUNING[kind];
  const behavior = ENEMY_AI.behavior[tuning.archetype];
  const healthScale = 1 + Math.min(0.3, (wave - 1) * 0.06);
  return {
    id,
    kind,
    name: tuning.name,
    pos: { x, y },
    velocity: vec(),
    facing: { x: -1, y: 0 },
    hp: Math.round(tuning.hp * healthScale),
    maxHp: Math.round(tuning.hp * healthScale),
    radius: tuning.radius,
    moveSpeed: CHARACTER_TUNING.kyle.speed * behavior.normalSpeedRatio,
    archetype: tuning.archetype,
    aiState: "idle",
    stateTimer: 0.7 + id * 0.17,
    stateAge: 0,
    aware: false,
    noticeDelay: (id - 1) * ENEMY_AI.noticeStagger,
    idleAnchor: { x, y },
    idleTarget: { x, y },
    reservedPos: { x, y },
    reservedAngle: ((id - 1) / 3) * Math.PI * 2,
    hasAttackToken: false,
    isReadySlot: false,
    tokenAge: 0,
    attackDirection: { x: -1, y: 0 },
    attackStyle: "default",
    attackConnected: false,
    alive: true,
    armor: tuning.armor,
    maxArmor: tuning.armor,
    attackCooldown: 0.8 + id * 0.33,
    telegraph: 0,
    telegraphDuration: behavior.windupDuration,
    telegraphTarget: vec(x, y),
    hurtFlash: 0,
    knockback: vec(),
    exp: tuning.exp,
    expGranted: false,
  };
}

export function createArenaEnemies(wave = 1): EnemyState[] {
  return [
    createEnemy(1, "mossPlun", 425, 132, wave),
    createEnemy(2, "iwaUroko", 485, 244, wave),
    createEnemy(3, "utsurobou", 505, 178, wave),
  ];
}

function createProjectile(): Projectile {
  return {
    active: false,
    id: 0,
    kind: "phosphor",
    owner: "meru",
    team: "party",
    pos: vec(),
    velocity: vec(),
    radius: 3,
    damage: 0,
    life: 0,
    maxLife: 0,
    damageScale: 1,
    returning: false,
    trailTimer: 0,
    hitIds: new Set(),
  };
}

export function createProjectilePool(): Projectile[] {
  return Array.from({ length: PROJECTILE_POOL_SIZE }, createProjectile);
}

function createAttackArea(): AttackArea {
  return {
    active: false,
    id: 0,
    owner: "enemy",
    team: "enemy",
    pos: vec(),
    direction: { x: 1, y: 0 },
    radius: 0,
    innerRadius: 0,
    arc: Math.PI * 2,
    damage: 0,
    damageScale: 1,
    life: 0,
    delay: 0,
    breakArmor: 0,
    knockback: 0,
    hitIds: new Set(),
    color: "#ffffff",
    impactStyle: null,
    sweepStart: null,
    sweepEnd: null,
    terminalRadius: 0,
    sweepCollisionRadius: 0,
    activationEffect: null,
    sourceEnemyId: null,
  };
}

export function createAttackPool(): AttackArea[] {
  return Array.from({ length: ATTACK_POOL_SIZE }, createAttackArea);
}
