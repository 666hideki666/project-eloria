import { add, distance, normalize, scale, sub } from "./math";
import type {
  CharacterId,
  CharacterState,
  Vec2,
  VelgranHazardSnapshot,
  VelgranPhase,
  VelgranProjectileSnapshot,
  VelgranSnapshot,
} from "./types";
import {
  CRYSTAL_ALTAR,
} from "../stage/maps/crystalAltarMap";
import { isCrystalAltarPositionWalkable, resolveCrystalAltarMovement } from "../stage/crystalAltarCollision";
import { VELGRAN_COMBAT } from "../config";

type VelgranAttack = "stomp" | "roots" | "shards" | "forestRing" | "repel";

interface CrystalShot extends VelgranProjectileSnapshot {
  velocity: Vec2;
  life: number;
  hit: boolean;
}

export interface VelgranUpdateHooks {
  damageCharacter: (id: CharacterId, damage: number, direction: Vec2, knockback?: number) => void;
  emit: (kind: "velgranRoar" | "velgranStomp" | "velgranRoots" | "velgranShards" | "velgranForestRing" | "velgranArmorBreak" | "velgranDefeat" | "forestSealStone", pos: Vec2, variant?: number) => void;
  impact: (strength: number) => void;
}

export interface VelgranHitResult {
  accepted: boolean;
  damage: number;
  armorDamage: number;
  armorBroken: boolean;
  defeated: boolean;
}

const MAX_HP = VELGRAN_COMBAT.maxHp;
const MAX_ARMOR = VELGRAN_COMBAT.maxArmor;
const CORE_EXPOSED_DURATION = VELGRAN_COMBAT.exposedDuration;
const STOMP_RADIUS = 84;
const ROOT_RADIUS = 18;
const FOREST_RING_WINDUP = 1;
const FOREST_RING_DURATION = 0.75;
const FOREST_RING_START_RADIUS = 45;
const FOREST_RING_END_RADIUS = 260;
const MOVE_SPEED = 52;
const APPROACH_DISTANCE = 138;
const REPOSITION_DISTANCE = 82;
export class VelgranBossController {
  public phase: VelgranPhase = "dormant";
  public pos: Vec2 = { ...CRYSTAL_ALTAR.bossSpawn };
  public facing: Vec2 = { x: 0, y: 1 };
  public hp: number = MAX_HP;
  public armor: number = MAX_ARMOR;
  public hurtFlash = 0;
  public phaseTime = 0;
  public introSeen = false;
  public attack: VelgranAttack | null = null;
  public attackTime = 0;
  public hazards: VelgranHazardSnapshot[] = [];
  public projectiles: CrystalShot[] = [];
  public moving = false;

  private attackCooldown = 1.15;
  private lastAttack: VelgranAttack | null = null;
  private attackApplied = false;
  private nextProjectileId = 1;
  private moveTarget: Vec2 | null = null;
  private moveTime = 0;
  private recoveryTimer = 0;
  private repositionPending = true;
  private repositionSide = 1;
  private attacksSinceForestRing = 0;
  private enragedForestRingPending = false;
  private forestRingRadius = FOREST_RING_START_RADIUS;
  private readonly forestRingHitIds = new Set<CharacterId>();
  private proximityTime = 0;
  private proximityCooldown = 0;

  public get combatActive(): boolean {
    return this.phase === "introParty" || this.phase === "introPan" || this.phase === "awakening" ||
      this.phase === "active" || this.phase === "coreExposed" || this.phase === "recovering";
  }

  public get controlLocked(): boolean {
    return this.phase === "introParty" || this.phase === "introPan" || this.phase === "awakening" ||
      this.phase === "defeatStagger" || this.phase === "calming" || this.phase === "sealForming" || this.phase === "blessing";
  }

  public beginIfNeeded(playerY: number): boolean {
    if (this.phase !== "dormant" || playerY > CRYSTAL_ALTAR.introTriggerY) return false;
    this.phase = this.introSeen ? "awakening" : "introParty";
    this.phaseTime = 0;
    this.introSeen = true;
    return true;
  }

  public resetForRetreat(): void {
    if (this.phase === "peaceful") return;
    this.phase = "dormant";
    this.phaseTime = 0;
    this.hp = MAX_HP;
    this.armor = MAX_ARMOR;
    this.pos = { ...CRYSTAL_ALTAR.bossSpawn };
    this.facing = { x: 0, y: 1 };
    this.attack = null;
    this.attackTime = 0;
    this.attackCooldown = 0.7;
    this.hazards.length = 0;
    this.projectiles.length = 0;
    this.moving = false;
    this.moveTarget = null;
    this.moveTime = 0;
    this.recoveryTimer = 0;
    this.repositionPending = true;
    this.repositionSide = 1;
    this.attacksSinceForestRing = 0;
    this.enragedForestRingPending = false;
    this.forestRingRadius = FOREST_RING_START_RADIUS;
    this.forestRingHitIds.clear();
    this.proximityTime = 0;
    this.proximityCooldown = 0;
  }

  /** Permanent for this run. A new GameWorld restores the first encounter. */
  public settleForRevisit(): void {
    if (this.phase === "peaceful") return;
    this.resetForRetreat();
    this.phase = "peaceful";
    this.pos = { ...CRYSTAL_ALTAR.sealStone };
    this.hp = 0; this.armor = 0; this.hurtFlash = 0;
    this.introSeen = true;
  }

  public update(delta: number, party: readonly CharacterState[], activeId: CharacterId, hooks: VelgranUpdateHooks): void {
    this.moving = false;
    if (this.phase === "peaceful") return;
    this.phaseTime += delta;
    this.hurtFlash = Math.max(0, this.hurtFlash - delta);
    if (this.phase === "introParty" && this.phaseTime >= 0.9) this.changePhase("introPan");
    else if (this.phase === "introPan" && this.phaseTime >= 1.15) this.changePhase("awakening");
    else if (this.phase === "awakening" && this.phaseTime >= (this.introSeen ? 1.55 : 1.8)) {
      hooks.emit("velgranRoar", this.pos);
      hooks.impact(3.2);
      this.changePhase("active");
      this.prepareReposition(0.24, 0.52);
    } else if (this.phase === "coreExposed" && this.phaseTime >= CORE_EXPOSED_DURATION) {
      this.armor = MAX_ARMOR;
      this.changePhase("recovering");
    } else if (this.phase === "recovering" && this.phaseTime >= 0.7) {
      this.changePhase("active");
      this.prepareReposition(0.28, 0.5);
    } else if (this.phase === "defeatStagger" && this.phaseTime >= 1.35) {
      hooks.emit("velgranDefeat", this.pos);
      this.changePhase("calming");
    } else if (this.phase === "calming" && this.phaseTime >= 1.05) {
      this.changePhase("sealForming");
      hooks.emit("forestSealStone", CRYSTAL_ALTAR.sealStone, 0);
    } else if (this.phase === "sealForming" && this.phaseTime >= 1.2) {
      this.changePhase("sealReady");
    }

    if (this.phase === "active") this.updateActive(delta, party, activeId, hooks);
    else if (this.phase === "coreExposed" || this.phase === "recovering") this.updateProjectiles(delta, party, hooks);
    if (!this.moving) this.moveTime = 0;
  }

  private updateActive(delta: number, party: readonly CharacterState[], activeId: CharacterId, hooks: VelgranUpdateHooks): void {
    const target = party.find((member) => member.id === activeId && !member.downed) ?? party.find((member) => !member.downed);
    if (!target) return;
    this.facing = normalize(sub(target.pos, this.pos), this.facing);
    this.proximityCooldown = Math.max(0, this.proximityCooldown - delta);
    if (this.attack) {
      this.attackTime += delta;
      this.updateAttack(party, target.pos, hooks);
      this.updateProjectiles(delta, party, hooks);
      return;
    }

    const partyClose = party.some((member) =>
      !member.downed && distance(member.pos, this.pos) <= VELGRAN_COMBAT.proximityDistance + member.radius
    );
    this.proximityTime = partyClose
      ? this.proximityTime + delta
      : Math.max(0, this.proximityTime - delta * 2);
    if (
      this.proximityCooldown <= 0 &&
      this.proximityTime >= VELGRAN_COMBAT.proximityHold
    ) {
      this.beginRepel(hooks);
      this.updateProjectiles(delta, party, hooks);
      return;
    }

    if (this.recoveryTimer > 0) {
      this.recoveryTimer = Math.max(0, this.recoveryTimer - delta);
      this.updateProjectiles(delta, party, hooks);
      return;
    }

    if (this.repositionPending && !this.moveTarget) {
      this.moveTarget = this.chooseRepositionTarget(target.pos);
      this.repositionPending = false;
    }
    if (this.moveTarget) {
      if (this.moveTowards(this.moveTarget, delta)) this.moveTarget = null;
      this.updateProjectiles(delta, party, hooks);
      return;
    }

    const gap = distance(this.pos, target.pos);
    if (gap > APPROACH_DISTANCE + 12) {
      const approachPoint = add(target.pos, scale(normalize(sub(this.pos, target.pos), { x: 0, y: 1 }), APPROACH_DISTANCE));
      this.moveTowards(approachPoint, delta);
      this.updateProjectiles(delta, party, hooks);
      return;
    }

    this.attackCooldown -= delta;
    if (this.attackCooldown <= 0) this.beginAttack(target.pos, hooks);
    this.updateProjectiles(delta, party, hooks);
  }

  /** Moves the boss with a visible travel phase instead of changing poses in place. */
  private moveTowards(destination: Vec2, delta: number): boolean {
    const bounds = CRYSTAL_ALTAR.bossCombatBounds;
    const bounded = {
      x: Math.max(bounds.left, Math.min(bounds.right, destination.x)),
      y: Math.max(bounds.top, Math.min(bounds.bottom, destination.y)),
    };
    const gap = distance(this.pos, bounded);
    if (gap <= 3) return true;
    const direction = normalize(sub(bounded, this.pos), this.facing);
    const step = Math.min(MOVE_SPEED * delta, gap);
    const next = resolveCrystalAltarMovement(this.pos, add(this.pos, scale(direction, step)), 0);
    if (distance(next, this.pos) < 0.001) return true;
    this.pos = next;
    this.facing = direction;
    this.moving = true;
    if (this.moving) this.moveTime += delta;
    return distance(this.pos, bounded) <= 3;
  }

  /** Picks a walkable side-step so consecutive attacks do not fire from one spot. */
  private chooseRepositionTarget(target: Vec2): Vec2 | null {
    const towardTarget = normalize(sub(target, this.pos), this.facing);
    const side = { x: -towardTarget.y, y: towardTarget.x };
    const preferredSign = this.repositionSide;
    this.repositionSide *= -1;
    const candidates: Vec2[] = [];
    for (const sign of [preferredSign, -preferredSign]) {
      for (const distanceScale of [1, 0.82, 0.66]) {
        candidates.push(add(
          add(this.pos, scale(side, REPOSITION_DISTANCE * distanceScale * sign)),
          scale(towardTarget, -24),
        ));
      }
    }
    return candidates.find((candidate) => this.isWalkableBossPosition(candidate)) ?? null;
  }

  private isWalkableBossPosition(position: Vec2): boolean {
    const bounds = CRYSTAL_ALTAR.bossCombatBounds;
    return position.x >= bounds.left && position.x <= bounds.right &&
      position.y >= bounds.top && position.y <= bounds.bottom &&
      isCrystalAltarPositionWalkable(position, 0);
  }

  private prepareReposition(recovery: number, nextAttackDelay: number): void {
    this.attack = null;
    this.attackTime = 0;
    this.moveTarget = null;
    this.moving = false;
    this.moveTime = 0;
    this.recoveryTimer = recovery;
    this.repositionPending = true;
    this.attackCooldown = nextAttackDelay;
    this.proximityTime = 0;
  }

  private beginAttack(target: Vec2, hooks: VelgranUpdateHooks): void {
    if (this.enragedForestRingPending || this.attacksSinceForestRing >= 3) {
      this.attack = "forestRing";
      this.enragedForestRingPending = false;
      this.attacksSinceForestRing = 0;
    } else {
      const attacks: VelgranAttack[] = ["stomp", "roots", "shards"].filter((kind) => kind !== this.lastAttack) as VelgranAttack[];
      this.attack = attacks[Math.floor((this.phaseTime * 997) % attacks.length)] ?? "stomp";
      this.attacksSinceForestRing += 1;
    }
    this.lastAttack = this.attack;
    this.attackTime = 0;
    this.attackApplied = false;
    this.proximityTime = 0;
    this.forestRingRadius = FOREST_RING_START_RADIUS;
    this.forestRingHitIds.clear();
    this.createAttackHazards(this.attack, target);
    hooks.emit(
      this.attack === "stomp"
        ? "velgranStomp"
        : this.attack === "roots"
          ? "velgranRoots"
          : this.attack === "shards"
            ? "velgranShards"
            : "velgranForestRing",
      this.pos,
      0,
    );
  }

  private beginRepel(hooks: VelgranUpdateHooks): void {
    this.attack = "repel";
    this.lastAttack = "repel";
    this.attackTime = 0;
    this.attackApplied = false;
    this.hazards.length = 0;
    this.moveTarget = null;
    this.moving = false;
    this.moveTime = 0;
    this.proximityTime = 0;
    this.proximityCooldown = VELGRAN_COMBAT.proximityResetDelay;
    hooks.emit("velgranForestRing", this.pos, 0);
  }

  private createAttackHazards(attack: VelgranAttack, target: Vec2): void {
    this.hazards.length = 0;
    if (attack === "stomp") {
      this.hazards.push({ kind: "stomp", pos: { ...this.pos }, radius: STOMP_RADIUS, start: { ...this.pos }, end: { ...this.pos }, progress: 0, active: false });
    } else if (attack === "roots") {
      const direction = normalize(sub(target, this.pos), { x: 0, y: 1 });
      const side = { x: -direction.y, y: direction.x };
      for (const offset of [-42, 0, 42]) {
        const start = add(this.pos, scale(side, offset));
        const end = add(start, scale(direction, 230));
        this.hazards.push({ kind: "root", pos: { ...start }, radius: ROOT_RADIUS, start, end, progress: 0, active: false });
      }
    }
  }

  private updateAttack(party: readonly CharacterState[], target: Vec2, hooks: VelgranUpdateHooks): void {
    if (!this.attack) return;
    const windup = this.attack === "stomp"
      ? 0.78
      : this.attack === "roots"
        ? 0.72
        : this.attack === "forestRing"
          ? FOREST_RING_WINDUP
          : this.attack === "repel"
            ? VELGRAN_COMBAT.repel.windupDuration
          : 0.62;
    for (const hazard of this.hazards) {
      hazard.progress = Math.min(1, this.attackTime / windup);
      hazard.active = this.attackTime >= windup && this.attackTime <= windup + 0.25;
    }
    if (this.attack === "forestRing" && this.attackTime >= windup) {
      if (!this.attackApplied) {
        this.attackApplied = true;
        hooks.emit("velgranForestRing", this.pos, 1);
        hooks.impact(2.8);
      }
      const previousRadius = this.forestRingRadius;
      const progress = Math.min(1, (this.attackTime - windup) / FOREST_RING_DURATION);
      this.forestRingRadius = FOREST_RING_START_RADIUS +
        (FOREST_RING_END_RADIUS - FOREST_RING_START_RADIUS) * progress;
      const enraged = this.hp <= MAX_HP * 0.5;
      for (const member of party) {
        if (member.downed || this.forestRingHitIds.has(member.id)) continue;
        const gap = distance(member.pos, this.pos);
        const crossedByWave = gap + member.radius >= previousRadius &&
          gap - member.radius <= this.forestRingRadius;
        if (!crossedByWave) continue;
        this.forestRingHitIds.add(member.id);
        hooks.damageCharacter(
          member.id,
          enraged ? 28 : 22,
          normalize(sub(member.pos, this.pos), { x: 0, y: 1 }),
        );
      }
    } else if (!this.attackApplied && this.attackTime >= windup) {
      this.attackApplied = true;
      const enraged = this.hp <= MAX_HP * 0.5;
      if (this.attack === "stomp") {
        for (const member of party) if (!member.downed && distance(member.pos, this.pos) <= STOMP_RADIUS + member.radius) hooks.damageCharacter(member.id, enraged ? 26 : 22, normalize(sub(member.pos, this.pos), { x: 0, y: 1 }));
        hooks.impact(3.5);
      } else if (this.attack === "roots") {
        for (const member of party) {
          if (member.downed) continue;
          const hit = this.hazards.some((hazard) => distancePointToSegment(member.pos, hazard.start, hazard.end) <= hazard.radius + member.radius);
          if (hit) hooks.damageCharacter(member.id, enraged ? 19 : 16, normalize(sub(member.pos, this.pos), { x: 0, y: 1 }));
        }
        hooks.impact(2.4);
      } else if (this.attack === "shards") this.spawnShardFan();
      else if (this.attack === "repel") {
        for (const member of party) {
          if (
            member.downed ||
            distance(member.pos, this.pos) > VELGRAN_COMBAT.repel.radius + member.radius
          ) continue;
          hooks.damageCharacter(
            member.id,
            VELGRAN_COMBAT.repel.damage,
            normalize(sub(member.pos, this.pos), { x: 0, y: 1 }),
            VELGRAN_COMBAT.repel.knockback,
          );
        }
        hooks.emit("velgranForestRing", this.pos, 1);
        hooks.impact(2.1);
      }
    }
    const total = windup + (this.attack === "shards"
      ? 1.05
      : this.attack === "forestRing"
        ? FOREST_RING_DURATION + 0.18
        : this.attack === "repel"
          ? VELGRAN_COMBAT.repel.recoveryDuration
        : 0.8);
    if (this.attackTime >= total) {
      this.attack = null;
      this.attackTime = 0;
      this.hazards.length = 0;
      this.prepareReposition(0.3, this.hp <= MAX_HP * 0.5 ? 0.3 : 0.5);
      this.moveTarget = this.chooseRepositionTarget(target);
      this.repositionPending = false;
    }
  }

  private spawnShardFan(): void {
    const base = Math.atan2(this.facing.y, this.facing.x);
    const enraged = this.hp <= MAX_HP * 0.5;
    const halfCount = enraged ? 3 : 2;
    const speed = enraged ? 148 : 128;
    for (let index = -halfCount; index <= halfCount; index += 1) {
      const angle = base + index * 0.18;
      this.projectiles.push({
        id: this.nextProjectileId++,
        pos: add(this.pos, scale({ x: Math.cos(angle), y: Math.sin(angle) }, 34)),
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        radius: 7,
        life: 2.4,
        hit: false,
        active: true,
      });
    }
  }

  private updateProjectiles(delta: number, party: readonly CharacterState[], hooks: VelgranUpdateHooks): void {
    for (const shot of this.projectiles) {
      if (!shot.active) continue;
      shot.life -= delta;
      shot.pos.x += shot.velocity.x * delta;
      shot.pos.y += shot.velocity.y * delta;
      if (shot.life <= 0 || !isCrystalAltarPositionWalkable(shot.pos, 0)) shot.active = false;
      for (const member of party) {
        if (!shot.active || shot.hit || member.downed || distance(shot.pos, member.pos) > shot.radius + member.radius) continue;
        shot.hit = true;
        shot.active = false;
        hooks.damageCharacter(member.id, this.hp <= MAX_HP * 0.5 ? 16 : 14, normalize(shot.velocity, { x: 0, y: 1 }));
      }
    }
    this.projectiles = this.projectiles.filter((shot) => shot.active);
  }

  public receiveHit(owner: CharacterId, rawDamage: number, breakArmor: number): VelgranHitResult {
    if (this.phase !== "active" && this.phase !== "coreExposed") return { accepted: false, damage: 0, armorDamage: 0, armorBroken: false, defeated: false };
    const armorBefore = this.armor;
    let armorDamage = 0;
    let damage = rawDamage;
    if (this.phase === "active") {
      if (this.armor > 0) {
        armorDamage = Math.max(1, breakArmor + (owner === "kyle" ? 4 : 0));
        this.armor = Math.max(0, this.armor - armorDamage);
      }
      damage *= VELGRAN_COMBAT.normalDamageMultiplier;
    } else if (this.phase === "coreExposed") {
      damage *= VELGRAN_COMBAT.exposedDamageMultiplier;
    }
    damage = Math.max(1, Math.round(damage));
    const hpBefore = this.hp;
    this.hp = Math.max(0, this.hp - damage);
    if (hpBefore > MAX_HP * 0.5 && this.hp <= MAX_HP * 0.5 && this.hp > 0) {
      this.enragedForestRingPending = true;
    }
    this.hurtFlash = 0.12;
    const armorBroken = armorBefore > 0 && this.armor <= 0;
    if (armorBroken && this.hp > 0) {
      this.attack = null;
      this.hazards.length = 0;
      this.moveTarget = null;
      this.moving = false;
      this.moveTime = 0;
      this.recoveryTimer = 0;
      this.repositionPending = true;
      this.changePhase("coreExposed");
    }
    const defeated = this.hp <= 0;
    if (defeated) {
      this.attack = null;
      this.hazards.length = 0;
      this.projectiles.length = 0;
      this.moveTarget = null;
      this.moving = false;
      this.moveTime = 0;
      this.recoveryTimer = 0;
      this.repositionPending = false;
      this.changePhase("defeatStagger");
    }
    return { accepted: true, damage, armorDamage, armorBroken, defeated };
  }

  public destroyProjectilesNear(point: Vec2, radius: number): number {
    let destroyed = 0;
    for (const shot of this.projectiles) {
      if (shot.active && distance(shot.pos, point) <= radius + shot.radius) {
        shot.active = false;
        destroyed += 1;
      }
    }
    return destroyed;
  }

  public beginBlessing(): void {
    if (this.phase === "sealReady") this.changePhase("blessing");
  }

  public completeBlessing(): void {
    if (this.phase === "blessing") this.changePhase("cleared");
  }

  public setForQa(state: string): void {
    if (state === "awakening") { this.phase = "awakening"; this.hp = MAX_HP; this.armor = MAX_ARMOR; }
    else if (state === "active" || state === "stomp" || state === "roots" || state === "shards" || state === "forestRing" || state === "repel") { this.phase = "active"; this.hp = MAX_HP; this.armor = MAX_ARMOR; }
    else if (state === "core") { this.phase = "coreExposed"; this.hp = 180; this.armor = 0; }
    else if (state === "defeat") { this.phase = "defeatStagger"; this.hp = 0; this.armor = 0; }
    else if (state === "seal") { this.phase = "sealReady"; this.hp = 0; this.armor = 0; }
    this.phaseTime = 0;
    this.introSeen = true;
    this.moveTarget = null;
    this.moving = false;
    this.moveTime = 0;
    this.recoveryTimer = state === "active" ? 0.18 : 0;
    this.repositionPending = state === "active";
    this.attack = state === "stomp" || state === "roots" || state === "shards" || state === "forestRing" || state === "repel" ? state : null;
    this.attackTime = 0;
    this.attackApplied = false;
    this.forestRingRadius = FOREST_RING_START_RADIUS;
    this.forestRingHitIds.clear();
    this.proximityTime = 0;
    this.proximityCooldown = 0;
    this.hazards.length = 0;
    if (this.attack) this.createAttackHazards(this.attack, add(this.pos, scale(this.facing, 230)));
    this.projectiles.length = 0;
  }

  public get snapshot(): VelgranSnapshot {
    return {
      phase: this.phase,
      pos: { ...this.pos },
      facing: { ...this.facing },
      hp: this.hp,
      maxHp: MAX_HP,
      armor: this.armor,
      maxArmor: MAX_ARMOR,
      hurtFlash: this.hurtFlash,
      phaseTime: this.phaseTime,
      moving: this.moving,
      moveTime: this.moveTime,
      attack: this.attack,
      attackTime: this.attackTime,
      hazards: this.hazards.map((hazard) => ({ ...hazard, pos: { ...hazard.pos }, start: { ...hazard.start }, end: { ...hazard.end } })),
      crystalProjectiles: this.projectiles.map((shot) => ({ id: shot.id, pos: { ...shot.pos }, velocity: { ...shot.velocity }, radius: shot.radius, active: shot.active })),
      sealStoneVisible: this.sealStoneVisible,
      introSeen: this.introSeen,
    };
  }

  public get sealStoneVisible(): boolean {
    return this.phase === "sealForming" || this.phase === "sealReady" || this.phase === "blessing" || this.phase === "cleared";
  }

  private changePhase(phase: VelgranPhase): void {
    this.phase = phase;
    this.phaseTime = 0;
  }
}

function distancePointToSegment(point: Vec2, start: Vec2, end: Vec2): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 0.0001) return distance(point, start);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
}
