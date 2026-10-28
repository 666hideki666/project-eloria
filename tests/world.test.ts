import { describe, expect, it, vi } from "vitest";
import {
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
  PARTY_AI,
  UTSUROBOU_MASK_CURSE_WAVE,
  VELGRAN_COMBAT,
  VIEW,
} from "../src/config";
import { GameWorld } from "../src/game/GameWorld";
import { createEnemy } from "../src/game/entities";
import {
  distancePointToSegment,
  rotateDirectionToward,
} from "../src/game/math";
import type { ActionName, InputFrame } from "../src/game/types";
import { isCrystalAltarPositionWalkable } from "../src/stage/crystalAltarCollision";

function frame(
  pressed: ActionName[] = [],
  held: ActionName[] = [],
): InputFrame {
  return {
    move: { x: 0, y: 0 },
    pressed: new Set(pressed),
    held: new Set(held),
    mode: "keyboard",
  };
}

function advance(world: GameWorld, seconds: number): void {
  const frames = Math.ceil(seconds * 60);
  for (let index = 0; index < frames; index += 1) {
    world.update(1 / 60, frame());
  }
}

function replaceArenaEnemyWithIwaUroko(world: GameWorld) {
  const iwa = createEnemy(3, "iwaUroko", 505, 178);
  world.enemies[2] = iwa;
  return iwa;
}

function replaceArenaEnemyWithGaracrow(world: GameWorld) {
  const garacrow = createEnemy(2, "garacrow", 485, 244);
  world.enemies[1] = garacrow;
  return garacrow;
}

describe("combat body contact", () => {
  it("uses the configured light contact damage for every field enemy kind", () => {
    const cases = Object.entries(FIELD_ENEMY_CONTACT.damage) as Array<
      [keyof typeof FIELD_ENEMY_CONTACT.damage, number]
    >;
    for (const [kind, damage] of cases) {
      const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
      world.encounterGrace = 0;
      const member = world.active;
      const enemy = createEnemy(1, kind, member.pos.x, member.pos.y);
      enemy.aware = true;
      enemy.aiState = "windup";
      enemy.stateTimer = 10;
      world.enemies = [enemy];
      const before = member.hp;

      world.update(1 / 60, frame());

      expect(member.hp, kind).toBe(before - damage);
      expect(member.invulnerable, kind).toBeCloseTo(FIELD_ENEMY_CONTACT.invulnerability);
    }
  });

  it("shares one 0.8 second contact window instead of damaging every frame", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    world.encounterGrace = 0;
    const member = world.active;
    const enemy = createEnemy(1, "mossPlun", member.pos.x, member.pos.y);
    enemy.aware = true;
    enemy.aiState = "windup";
    enemy.stateTimer = 10;
    world.enemies = [enemy];

    world.update(1 / 60, frame());
    const afterFirst = member.hp;
    world.hitStop = 0;
    for (let index = 0; index < 16; index += 1) {
      enemy.pos = { ...member.pos };
      world.update(0.05, frame());
    }
    expect(member.hp).toBe(afterFirst);
    enemy.pos = { ...member.pos };
    world.update(0.05, frame());
    expect(member.hp).toBe(afterFirst - FIELD_ENEMY_CONTACT.damage.mossPlun);
  });

  it("lets an authored attack win when attack and body contact overlap in one frame", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    world.encounterGrace = 0;
    const member = world.active;
    const enemy = createEnemy(1, "mossPlun", member.pos.x, member.pos.y);
    enemy.aware = true;
    enemy.aiState = "windup";
    enemy.stateTimer = 10;
    world.enemies = [enemy];
    const internals = world as unknown as {
      spawnArea(options: {
        owner: "enemy";
        team: "enemy";
        sourceEnemyId: number;
        pos: { x: number; y: number };
        radius: number;
        damage: number;
      }): unknown;
    };
    internals.spawnArea({
      owner: "enemy",
      team: "enemy",
      sourceEnemyId: enemy.id,
      pos: { ...member.pos },
      radius: 4,
      damage: ENEMY_TUNING.mossPlun.damage,
    });
    const before = member.hp;

    world.update(1 / 60, frame());

    expect(member.hp).toBe(before - ENEMY_TUNING.mossPlun.damage);
  });

  it("steers an overlapping companion into a short safe retreat", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    world.encounterGrace = 0;
    const companion = world.party.find((member) => member.id === "nadi")!;
    const enemy = createEnemy(1, "mossPlun", companion.pos.x, companion.pos.y);
    enemy.aware = true;
    enemy.aiState = "windup";
    enemy.stateTimer = 10;
    world.enemies = [enemy];

    world.update(1 / 60, frame());

    const internals = world as unknown as {
      followerBodyRetreatUntil: Map<string, number>;
      followerBodyRetreatTarget: Map<string, { x: number; y: number }>;
    };
    expect(companion.followerState).toBe("return");
    expect(internals.followerBodyRetreatUntil.get("nadi")).toBeGreaterThan(world.time);
    expect(internals.followerBodyRetreatTarget.has("nadi")).toBe(true);
  });

  it("applies Velgran contact once and keeps the knockback on walkable ground", () => {
    const world = new GameWorld({
      mode: "stage",
      initialRoomId: "crystalAltar",
      initialPhase: "playing",
      random: () => 0.5,
    });
    world.setVelgranBossForQa("active");
    world.encounterGrace = 0;
    const boss = world.snapshot.velgran!;
    const member = world.active;
    member.pos = { ...boss.pos };
    const before = member.hp;

    world.update(1 / 60, frame());

    expect(member.hp).toBe(before - VELGRAN_COMBAT.contactDamage);
    expect(Math.hypot(member.velocity.x, member.velocity.y)).toBeCloseTo(
      VELGRAN_COMBAT.contactKnockback,
      4,
    );
    expect(isCrystalAltarPositionWalkable(member.pos, member.radius)).toBe(true);
  });
});

describe("GameWorld party rules", () => {
  it("switches in party order and emits the incoming switch attack", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });

    world.update(1 / 60, frame(["switch"]));

    expect(world.activeId).toBe("nadi");
    expect(world.snapshot.switchCooldown).toBeGreaterThan(0);
    expect(
      world.attacks.some((attack) => attack.active && attack.owner === "nadi"),
    ).toBe(true);

    world.update(1 / 60, frame(["switch"]));
    expect(world.activeId).toBe("nadi");

    advance(world, COMBAT.switchCooldown + 0.1);
    expect(world.snapshot.switchCooldown).toBe(0);
  });

  it("switches Kyle in without teleporting and emits one unchanged Senjin Slash", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    world.activeId = "meru";
    const kyle = world.party.find((member) => member.id === "kyle");
    const meru = world.party.find((member) => member.id === "meru");
    const target = world.enemies[0];
    if (!kyle || !meru || !target) {
      throw new Error("Expected Kyle, Meru, and a target.");
    }
    for (const enemy of world.enemies) enemy.alive = enemy === target;
    kyle.facing = { x: 1, y: 0 };
    const incomingStart = { ...kyle.pos };
    const outgoingStart = { ...meru.pos };
    const targetPos = { x: incomingStart.x + 30, y: incomingStart.y };
    target.pos = { ...targetPos };
    target.idleAnchor = { ...targetPos };
    target.idleTarget = { ...targetPos };
    target.velocity = { x: 0, y: 0 };
    target.knockback = { x: 0, y: 0 };
    target.armor = 0;
    target.hp = 200;
    const sequenceBefore = kyle.actionSequenceId;

    expect(world.switchCharacter(true)).toBe(true);

    const switchArea = world.attacks.filter(
      (area) => area.active && area.owner === "kyle",
    );
    expect(world.activeId).toBe("kyle");
    expect(kyle.pos).toEqual(incomingStart);
    expect(meru.pos).toEqual(outgoingStart);
    expect(kyle.followerState).toBe("formation");
    expect(kyle.followerTargetId).toBe(null);
    expect(meru.followerState).toBe("return");
    expect(meru.followerTargetId).toBe(null);
    expect(
      (world as unknown as { formationRebuildTimer: number })
        .formationRebuildTimer,
    ).toBe(PARTY_AI.formationRebuildDuration);
    expect(world.snapshot.switchCooldown).toBe(COMBAT.switchCooldown);
    expect(COMBAT.switchCooldown).toBe(0.48);
    expect(kyle.actionKind).toBe("switch");
    expect(kyle.actionDuration).toBeCloseTo(0.35);
    expect(kyle.actionTimer).toBeCloseTo(0.35);
    expect(kyle.actionSequenceId).toBe(sequenceBefore + 1);
    expect(kyle.actionFacing).toEqual({ x: 1, y: 0 });
    expect(switchArea).toHaveLength(1);
    expect(switchArea[0]).toEqual(expect.objectContaining({
      pos: { x: incomingStart.x + 19, y: incomingStart.y },
      direction: { x: 1, y: 0 },
      radius: 34,
      arc: Math.PI * 0.7,
      damage: 26,
      damageScale: 1,
      knockback: 32,
      color: "#6be3dc",
    }));
    expect(world.effects.effects.filter(
      (effect) => effect.active && effect.kind === "slash",
    )).toEqual([
      expect.objectContaining({
        pos: { x: incomingStart.x + 19, y: incomingStart.y },
        maxLife: 0.27,
        size: 37,
        color: "#72e7dc",
        rotation: 0,
      }),
    ]);
    expect(world.banner).toBe("");
    expect(world.drainAudioEvents()).toContainEqual(expect.objectContaining({
      kind: "switch",
      character: "kyle",
      position: incomingStart,
    }));

    world.update(0, frame());

    expect(kyle.pos).toEqual(incomingStart);
    expect(target.hp).toBe(174);
    expect(switchArea[0]?.hitIds).toContain(target.id);

    world.hitStop = 0;
    advance(world, 0.4);

    expect(kyle.pos).toEqual(incomingStart);
    expect(target.hp).toBe(174);
    expect(kyle.actionKind).toBe(null);
    expect(kyle.actionTimer).toBe(0);
  });

  it("switches Nadi in without teleporting and emits one unchanged Rinko Sweep", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const kyle = world.party.find((member) => member.id === "kyle");
    const nadi = world.party.find((member) => member.id === "nadi");
    const target = world.enemies[0];
    if (!kyle || !nadi || !target) {
      throw new Error("Expected Kyle, Nadi, and a target.");
    }
    for (const enemy of world.enemies) enemy.alive = enemy === target;
    nadi.facing = { x: 1, y: 0 };
    const incomingStart = { ...nadi.pos };
    const outgoingStart = { ...kyle.pos };
    const targetPos = { x: incomingStart.x + 30, y: incomingStart.y };
    target.pos = { ...targetPos };
    target.idleAnchor = { ...targetPos };
    target.idleTarget = { ...targetPos };
    target.velocity = { x: 0, y: 0 };
    target.knockback = { x: 0, y: 0 };
    target.armor = 0;
    target.hp = 200;
    const sequenceBefore = nadi.actionSequenceId;

    expect(world.switchCharacter(true)).toBe(true);

    const switchArea = world.attacks.filter(
      (area) => area.active && area.owner === "nadi",
    );
    expect(world.activeId).toBe("nadi");
    expect(nadi.pos).toEqual(incomingStart);
    expect(kyle.pos).toEqual(outgoingStart);
    expect(nadi.followerState).toBe("formation");
    expect(nadi.followerTargetId).toBe(null);
    expect(kyle.followerState).toBe("return");
    expect(kyle.followerTargetId).toBe(null);
    expect(
      (world as unknown as { formationRebuildTimer: number })
        .formationRebuildTimer,
    ).toBe(PARTY_AI.formationRebuildDuration);
    expect(world.snapshot.switchCooldown).toBe(COMBAT.switchCooldown);
    expect(COMBAT.switchCooldown).toBe(0.48);
    expect(nadi.actionKind).toBe("switch");
    expect(nadi.actionDuration).toBeCloseTo(0.35);
    expect(nadi.actionTimer).toBeCloseTo(0.35);
    expect(nadi.actionSequenceId).toBe(sequenceBefore + 1);
    expect(nadi.actionFacing).toEqual({ x: 1, y: 0 });
    expect(switchArea).toHaveLength(1);
    expect(switchArea[0]).toEqual(expect.objectContaining({
      pos: { x: incomingStart.x + 15, y: incomingStart.y },
      direction: { x: 1, y: 0 },
      radius: 44,
      arc: Math.PI * 1.08,
      damage: 24,
      damageScale: 1,
      knockback: 28,
      color: "#b4f8f3",
    }));
    expect(world.projectiles.filter(
      (projectile) => projectile.active && projectile.owner === "nadi",
    )).toHaveLength(0);
    expect(world.effects.effects.filter(
      (effect) => effect.active && effect.kind === "slash",
    )).toEqual([
      expect.objectContaining({
        pos: { x: incomingStart.x + 15, y: incomingStart.y },
        maxLife: 0.3,
        size: 48,
        color: "#c6ffff",
        rotation: 0,
      }),
    ]);
    expect(world.banner).toBe("");
    expect(world.drainAudioEvents()).toContainEqual(expect.objectContaining({
      kind: "switch",
      character: "nadi",
      position: incomingStart,
    }));

    world.update(0, frame());

    expect(nadi.pos).toEqual(incomingStart);
    expect(target.hp).toBe(176);
    expect(switchArea[0]?.hitIds).toContain(target.id);

    world.hitStop = 0;
    advance(world, 0.4);

    expect(nadi.pos).toEqual(incomingStart);
    expect(target.hp).toBe(176);
    expect(nadi.actionKind).toBe(null);
    expect(nadi.actionTimer).toBe(0);
  });

  it("switches Meru in without teleporting and keeps one unchanged Flash Barrier", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    world.activeId = "nadi";
    const nadi = world.party.find((member) => member.id === "nadi");
    const meru = world.party.find((member) => member.id === "meru");
    if (!nadi || !meru) {
      throw new Error("Expected Nadi and Meru.");
    }
    meru.facing = { x: -1, y: 0 };
    const incomingStart = { ...meru.pos };
    const outgoingStart = { ...nadi.pos };
    const sequenceBefore = meru.actionSequenceId;

    expect(world.switchCharacter(true)).toBe(true);

    const barrierEffects = world.effects.effects.filter(
      (effect) => effect.active && effect.kind === "barrier",
    );
    expect(world.activeId).toBe("meru");
    expect(meru.pos).toEqual(incomingStart);
    expect(nadi.pos).toEqual(outgoingStart);
    expect(meru.followerState).toBe("formation");
    expect(meru.followerTargetId).toBe(null);
    expect(nadi.followerState).toBe("return");
    expect(nadi.followerTargetId).toBe(null);
    expect(
      (world as unknown as { formationRebuildTimer: number })
        .formationRebuildTimer,
    ).toBe(PARTY_AI.formationRebuildDuration);
    expect(world.snapshot.switchCooldown).toBe(COMBAT.switchCooldown);
    expect(COMBAT.switchCooldown).toBe(0.48);
    expect(meru.actionKind).toBe("switch");
    expect(meru.actionDuration).toBeCloseTo(0.35);
    expect(meru.actionTimer).toBeCloseTo(0.35);
    expect(meru.actionSequenceId).toBe(sequenceBefore + 1);
    expect(meru.actionFacing).toEqual({ x: -1, y: 0 });
    expect(meru.barrier).toBe(2.2);
    expect(meru.invulnerable).toBe(0.32);
    expect(world.attacks.filter(
      (area) => area.active && area.owner === "meru",
    )).toHaveLength(0);
    expect(world.projectiles.filter(
      (projectile) => projectile.active && projectile.owner === "meru",
    )).toHaveLength(0);
    expect(barrierEffects).toEqual([
      expect.objectContaining({
        pos: incomingStart,
        maxLife: 2.2,
        life: 2.2,
        size: 19,
        color: "#7ce7d0",
      }),
    ]);
    expect(world.banner).toBe("");
    expect(world.drainAudioEvents()).toContainEqual(expect.objectContaining({
      kind: "switch",
      character: "meru",
      position: incomingStart,
    }));
    expect(world.damageCharacter("meru", 10)).toBe(false);

    world.update(0, frame());

    expect(meru.barrier).toBe(2.2);
    expect(world.effects.effects.filter(
      (effect) => effect.active && effect.kind === "barrier",
    )).toHaveLength(1);

    advance(world, 0.4);

    expect(meru.pos).toEqual(incomingStart);
    expect(meru.actionKind).toBe(null);
    expect(meru.actionTimer).toBe(0);
    expect(meru.invulnerable).toBe(0);
    expect(meru.barrier).toBeCloseTo(1.8);
    expect(barrierEffects[0]?.active).toBe(true);
    expect(barrierEffects[0]?.life).toBeCloseTo(1.8);

    const hpBeforeBarrierHit = meru.hp;
    expect(world.damageCharacter("meru", 10)).toBe(true);
    expect(meru.hp).toBe(hpBeforeBarrierHit - 3);
  });

  it("lets the external HUD pause button use the same phase transition", () => {
    const world = new GameWorld({ initialPhase: "playing" });

    expect(world.togglePause()).toBe(true);
    expect(world.phase).toBe("paused");
    expect(world.togglePause()).toBe(true);
    expect(world.phase).toBe("playing");

    const intro = new GameWorld({ initialPhase: "intro" });
    expect(intro.togglePause()).toBe(false);
    expect(intro.phase).toBe("intro");
  });

  it("rebuilds the formation after switching without teleporting members", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const nadiBefore = { ...world.party[1]?.pos };

    world.update(1 / 60, frame(["switch"]));

    const nadiAfter = world.party.find((member) => member.id === "nadi");
    if (!nadiAfter || nadiBefore.x === undefined || nadiBefore.y === undefined) {
      throw new Error("Expected Nadi.");
    }
    expect(
      Math.hypot(
        nadiAfter.pos.x - nadiBefore.x,
        nadiAfter.pos.y - nadiBefore.y,
      ),
    ).toBeLessThan(5);
  });

  it("places rear members on opposite diagonal slots with Meru furthest away", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    advance(world, 1);
    const leader = world.active;
    const nadi = world.party.find((member) => member.id === "nadi");
    const meru = world.party.find((member) => member.id === "meru");
    if (!nadi || !meru) throw new Error("Expected rear members.");

    const nadiSlotDistance = Math.hypot(
      nadi.formationSlot.x - leader.pos.x,
      nadi.formationSlot.y - leader.pos.y,
    );
    const meruSlotDistance = Math.hypot(
      meru.formationSlot.x - leader.pos.x,
      meru.formationSlot.y - leader.pos.y,
    );

    expect(nadi.formationSlot.y).toBeLessThan(leader.pos.y);
    expect(meru.formationSlot.y).toBeGreaterThan(leader.pos.y);
    expect(
      Math.abs(nadiSlotDistance - PARTY_AI.formationDistance.nadi),
    ).toBeLessThan(2);
    expect(
      Math.abs(meruSlotDistance - PARTY_AI.formationDistance.meru),
    ).toBeLessThan(2);
    expect(meruSlotDistance - nadiSlotDistance).toBeGreaterThan(25);
    expect(Math.hypot(
      nadi.pos.x - nadi.formationSlot.x,
      nadi.pos.y - nadi.formationSlot.y,
    )).toBeLessThan(10);
    expect(Math.hypot(
      meru.pos.x - meru.formationSlot.x,
      meru.pos.y - meru.formationSlot.y,
    )).toBeLessThan(10);
  });

  it("keeps enemies idle during grace and respects archetype attack limits", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    advance(world, 1);
    expect(world.enemies.every((enemy) => enemy.aiState === "idle")).toBe(true);
    expect(world.enemies.every((enemy) => !enemy.aware)).toBe(true);
    const configuredAttackLimit = Math.max(
      ENEMY_AI.meleeAttackSlots,
      ...world.enemies.map(
        (enemy) =>
          ENEMY_AI.behavior[enemy.archetype].maxConcurrentAttackers,
      ),
    );

    let maxTokens = 0;
    let maxAttacking = 0;
    for (let index = 0; index < 600 && world.phase === "playing"; index += 1) {
      world.update(1 / 60, frame());
      maxTokens = Math.max(
        maxTokens,
        world.enemies.filter((enemy) => enemy.hasAttackToken).length,
      );
      maxAttacking = Math.max(
        maxAttacking,
        world.enemies.filter(
          (enemy) => enemy.aiState === "windup" || enemy.aiState === "attack",
        ).length,
      );
    }

    expect(maxTokens).toBeLessThanOrEqual(configuredAttackLimit);
    expect(maxAttacking).toBeLessThanOrEqual(configuredAttackLimit);
  });

  it("alerts nearby enemies after an early switch pulls the leader away", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    advance(world, 0.9);
    world.update(1 / 60, frame(["switch"]));
    advance(world, 5);

    expect(world.activeId).toBe("nadi");
    expect(
      world.enemies.filter(
        (enemy) =>
          enemy.hp > 0 &&
          (enemy.aware || enemy.aiState !== "idle"),
      ).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("uses slow normal movement and a faster telegraphed heavy charge", () => {
    const normalRatio = ENEMY_AI.behavior.heavyCharge.normalSpeedRatio;
    const chargeRatio = ENEMY_AI.behavior.heavyCharge.attackSpeedRatio;

    expect(normalRatio).toBeLessThan(0.6);
    expect(chargeRatio).toBeGreaterThan(1);
    expect(ENEMY_AI.behavior.heavyCharge.windupDuration).toBeGreaterThan(1);
    expect(ENEMY_AI.behavior.heavyCharge.recoverDuration).toBeGreaterThan(1);
    expect(ENEMY_AI.behavior.heavyCharge.attackDuration).toBe(0.42);
    expect(IWAUROKO_ROCK_ARMOR_CHARGE.attackDuration).toBe(0.55);
    expect(IWAUROKO_ROCK_ARMOR_CHARGE.attackSpeedRatio).toBe(2.15);
    expect(IWAUROKO_ROCK_ARMOR_CHARGE.windupDuration).toBe(0.2);
    expect(IWAUROKO_ROCK_ARMOR_CHARGE.recoverDuration).toBe(0.9);
    expect(ENEMY_AI.behavior.heavyCharge.repositionDuration).toBe(0.6);
    expect(IWAUROKO_ROCK_ARMOR_CHARGE.retryDelay).toBe(0.48);
    expect(ENEMY_TUNING.iwaUroko.attackCooldown).toBe(1.45);
    expect(IWAUROKO_ROCK_ARMOR_CHARGE.tailSweep).toEqual(expect.objectContaining({
      windupDuration: 0.5,
      radius: 60,
      damage: 18,
    }));
  });

  it("uses a normal charge on an open line", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const iwa = world.enemies.find((enemy) => enemy.kind === "iwaUroko");
    if (!iwa) throw new Error("Expected Iwa Uroko.");
    iwa.pos = { x: 430, y: 220 };
    world.active.pos = { x: 320, y: 220 };
    iwa.attackDirection = { x: -1, y: 0 };
    iwa.attackStyle = "default";
    const internals = world as unknown as {
      beginEnemyAttack(enemy: typeof iwa, target: typeof world.active): void;
    };

    internals.beginEnemyAttack(iwa, world.active);

    expect(iwa.aiState).toBe("attack");
    expect(iwa.attackStyle).toBe("default");
    expect(iwa.stateTimer).toBe(IWAUROKO_ROCK_ARMOR_CHARGE.attackDuration);
  });

  it("performs one 18-damage tail sweep without multi-hitting a member", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const iwa = world.enemies.find((enemy) => enemy.kind === "iwaUroko");
    if (!iwa) throw new Error("Expected Iwa Uroko.");
    for (const enemy of world.enemies) enemy.alive = enemy === iwa;
    for (const member of world.party) if (member.id !== world.activeId) member.downed = true;
    iwa.pos = { x: 360, y: 220 };
    world.active.pos = { x: 400, y: 220 };
    world.active.hp = world.active.maxHp;
    world.active.invulnerable = 0;
    iwa.attackStyle = "iwaTailSweep";
    iwa.aiState = "attack";
    iwa.attackDirection = { x: 1, y: 0 };
    iwa.stateAge = IWAUROKO_ROCK_ARMOR_CHARGE.tailSweep.attackDuration / 2;
    iwa.stateTimer = IWAUROKO_ROCK_ARMOR_CHARGE.tailSweep.attackDuration;
    iwa.attackConnected = false;
    const hpBefore = world.active.hp;
    const internals = world as unknown as {
      updateEnemyAttack(enemy: typeof iwa, delta: number): void;
      updateAttackAreas(delta: number): void;
    };

    internals.updateEnemyAttack(iwa, 0);
    internals.updateAttackAreas(0.01);

    expect(iwa.attackConnected).toBe(true);
    expect(iwa.facing.x).toBeCloseTo(-1, 5);
    expect(iwa.facing.y).toBeCloseTo(0, 5);
    expect(world.active.hp).toBe(hpBefore - IWAUROKO_ROCK_ARMOR_CHARGE.tailSweep.damage);
    const hpAfter = world.active.hp;
    internals.updateEnemyAttack(iwa, 0.08);
    internals.updateAttackAreas(0.01);
    expect(world.active.hp).toBe(hpAfter);
    expect(world.effects.effects.some((effect) => effect.active && effect.kind === "dust")).toBe(true);
  });

  it("attacks at least twice in twelve seconds and starts within four seconds", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const iwa = world.enemies.find((enemy) => enemy.kind === "iwaUroko");
    if (!iwa) throw new Error("Expected Iwa Uroko.");
    for (const enemy of world.enemies) enemy.alive = enemy === iwa;
    for (const member of world.party) {
      member.cooldowns.normal = 999;
      if (member.id !== world.activeId) member.downed = true;
    }
    world.active.maxHp = 999;
    world.active.hp = 999;
    let previousState = iwa.aiState;
    let attackCount = 0;
    let firstAttackAt = Infinity;
    for (let frameIndex = 0; frameIndex < 12 * 60; frameIndex += 1) {
      world.update(1 / 60, frame());
      if (iwa.aiState === "attack" && previousState !== "attack") {
        attackCount += 1;
        firstAttackAt = Math.min(firstAttackAt, (frameIndex + 1) / 60);
      }
      previousState = iwa.aiState;
    }
    expect(firstAttackAt).toBeLessThanOrEqual(4);
    expect(attackCount).toBeGreaterThanOrEqual(2);
  });

  it("limits Iwa Uroko's one-time aim correction to twelve degrees", () => {
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const directionAt = (degrees: number) => ({
      x: Math.cos(radians(degrees)),
      y: Math.sin(radians(degrees)),
    });

    const correctedEight = rotateDirectionToward(
      directionAt(0),
      directionAt(8),
      IWAUROKO_ROCK_ARMOR_CHARGE.maxAimCorrectionRadians,
    );
    const correctedThirty = rotateDirectionToward(
      directionAt(0),
      directionAt(30),
      IWAUROKO_ROCK_ARMOR_CHARGE.maxAimCorrectionRadians,
    );

    expect(Math.atan2(correctedEight.y, correctedEight.x)).toBeCloseTo(
      radians(8),
      6,
    );
    expect(Math.atan2(correctedThirty.y, correctedThirty.x)).toBeCloseTo(
      radians(12),
      6,
    );
    expect(Math.hypot(correctedThirty.x, correctedThirty.y)).toBeCloseTo(1, 6);
  });

  it("measures point distance against the whole movement segment", () => {
    expect(
      distancePointToSegment(
        { x: 5, y: 3 },
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ),
    ).toBeCloseTo(3, 6);
    expect(
      distancePointToSegment(
        { x: 3, y: 4 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ),
    ).toBeCloseTo(5, 6);
  });

  it("lands the Moss Plun jump slam once at 0.18 seconds", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const moss = world.enemies.find((enemy) => enemy.kind === "mossPlun");
    if (!moss) throw new Error("Expected Moss Plun.");
    for (const enemy of world.enemies) enemy.alive = enemy === moss;
    for (const member of world.party) member.cooldowns.normal = 999;

    world.active.pos = { x: 320, y: 180 };
    world.active.hp = world.active.maxHp;
    world.active.invulnerable = 0;
    moss.pos = { x: 352, y: 180 };
    moss.facing = { x: -1, y: 0 };
    moss.attackDirection = { x: -1, y: 0 };
    moss.aiState = "attack";
    moss.stateAge = 0;
    moss.stateTimer = MOSS_PLUN_JUMP_SLAM.attackDuration;
    moss.attackConnected = false;
    moss.aware = true;
    const hpBefore = world.active.hp;

    for (let index = 0; index < 10; index += 1) {
      world.update(1 / 60, frame());
    }
    expect(moss.stateAge).toBeCloseTo(1 / 6);
    expect(moss.attackConnected).toBe(false);
    expect(world.active.hp).toBe(hpBefore);
    expect(
      world.attacks.some((area) => area.active && area.owner === "enemy"),
    ).toBe(false);
    expect(world.effects.effects.some(
      (effect) => effect.active && effect.kind === "impactRing",
    )).toBe(false);

    world.update(1 / 60, frame());

    expect(moss.stateAge).toBeGreaterThanOrEqual(
      MOSS_PLUN_JUMP_SLAM.landingTime,
    );
    expect(moss.attackConnected).toBe(true);
    expect(moss.aiState).toBe("attack");
    expect(world.active.hp).toBe(hpBefore - ENEMY_TUNING.mossPlun.damage);
    expect(world.effects.effects.filter(
      (effect) => effect.active && effect.kind === "impactRing",
    )).toHaveLength(1);
    expect(world.effects.effects.filter(
      (effect) => effect.active && effect.kind === "leaf",
    )).toHaveLength(MOSS_PLUN_JUMP_SLAM.leafCount);
    expect(world.effects.effects.filter(
      (effect) => effect.active && effect.kind === "dust",
    )).toHaveLength(MOSS_PLUN_JUMP_SLAM.dustCount);
    const spawnCountAfterLanding = world.effects.spawnCount;

    world.update(1 / 60, frame());

    expect(world.active.hp).toBe(hpBefore - ENEMY_TUNING.mossPlun.damage);
    expect(world.effects.spawnCount).toBe(spawnCountAfterLanding);

    for (let index = 0; index < 20; index += 1) {
      world.update(1 / 60, frame());
    }
    expect(moss.aiState).toBe("recover");
    expect(moss.attackCooldown).toBeGreaterThan(1.6);
    expect(moss.attackCooldown).toBeLessThanOrEqual(
      ENEMY_TUNING.mossPlun.attackCooldown,
    );
    expect(ENEMY_TUNING.mossPlun).toEqual({
      name: "モスプルン",
      hp: 58,
      armor: 0,
      archetype: "basicMelee",
      radius: 12,
      damage: 18,
      attackCooldown: 1.8,
      exp: 12,
    });
  });

  it("emits one Lumibane dash strike at 0.05 seconds with its own speed", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const lumibane = createEnemy(2, "lumibane", 485, 244);
    world.enemies[1] = lumibane;
    for (const enemy of world.enemies) enemy.alive = enemy === lumibane;
    for (const member of world.party) member.cooldowns.normal = 999;

    world.active.pos = { x: 120, y: 180 };
    lumibane.pos = { x: 360, y: 180 };
    lumibane.facing = { x: -1, y: 0 };
    lumibane.attackDirection = { x: -1, y: 0 };
    lumibane.aiState = "attack";
    lumibane.stateAge = 0;
    lumibane.stateTimer = LUMIBANE_LUMINOUS_DASH.attackDuration;
    lumibane.attackConnected = false;
    lumibane.aware = true;

    world.update(1 / 60, frame());
    world.update(1 / 60, frame());

    expect(lumibane.stateAge).toBeCloseTo(1 / 30);
    expect(lumibane.attackConnected).toBe(false);
    expect(
      world.attacks.some((area) => area.active && area.owner === "enemy"),
    ).toBe(false);
    expect(lumibane.moveSpeed).toBeCloseTo(
      world.active.moveSpeed * LUMIBANE_LUMINOUS_DASH.attackSpeedRatio,
    );

    world.update(1 / 60, frame());

    const strikeAreas = world.attacks.filter(
      (area) => area.active && area.owner === "enemy",
    );
    expect(lumibane.stateAge).toBeGreaterThanOrEqual(
      LUMIBANE_LUMINOUS_DASH.impactTime,
    );
    expect(lumibane.attackConnected).toBe(true);
    expect(lumibane.aiState).toBe("attack");
    expect(strikeAreas).toHaveLength(1);
    expect(strikeAreas[0]).toEqual(expect.objectContaining({
      damage: ENEMY_TUNING.lumibane.damage,
      radius: 25,
      knockback: 38,
    }));
    expect(world.effects.effects.filter(
      (effect) => effect.active && effect.kind === "impactRing",
    )).toHaveLength(1);
    expect(world.effects.effects.filter(
      (effect) => effect.active && effect.kind === "wind",
    )).toHaveLength(LUMIBANE_LUMINOUS_DASH.windCount);
    expect(world.effects.effects.filter(
      (effect) =>
        effect.active &&
        effect.kind === "spark" &&
        (effect.color === "#b8fff6" || effect.color === "#65dccc"),
    )).toHaveLength(LUMIBANE_LUMINOUS_DASH.sparkCount);
    const spawnCountAfterImpact = world.effects.spawnCount;

    world.update(1 / 60, frame());

    expect(world.effects.spawnCount).toBe(spawnCountAfterImpact);
    for (let index = 0; index < 11; index += 1) {
      world.update(1 / 60, frame());
    }
    expect(lumibane.aiState).toBe("recover");
    expect(lumibane.attackCooldown).toBe(
      ENEMY_TUNING.lumibane.attackCooldown,
    );
    expect(ENEMY_AI.behavior.swarm.attackSpeedRatio).toBe(0.72);
    expect(ENEMY_TUNING.lumibane).toEqual({
      name: "ルミバネ",
      hp: 42,
      armor: 0,
      archetype: "swarm",
      radius: 10,
      damage: 12,
      attackCooldown: 1.5,
      exp: 10,
    });
  });

  it("emits one Garacrow dive strike at 0.08 seconds with its wider hit", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const garacrow = replaceArenaEnemyWithGaracrow(world);
    for (const enemy of world.enemies) enemy.alive = enemy === garacrow;
    for (const member of world.party) member.cooldowns.normal = 999;

    world.active.pos = { x: 120, y: 180 };
    garacrow.pos = { x: 360, y: 180 };
    garacrow.facing = { x: -1, y: 0 };
    garacrow.attackDirection = { x: -1, y: 0 };
    garacrow.aiState = "attack";
    garacrow.stateAge = 0;
    garacrow.stateTimer = GARACROW_DIVE_STRIKE.attackDuration;
    garacrow.attackConnected = false;
    garacrow.aware = true;

    for (let index = 0; index < 4; index += 1) {
      world.update(1 / 60, frame());
    }
    expect(garacrow.stateAge).toBeCloseTo(1 / 15);
    expect(garacrow.attackConnected).toBe(false);
    expect(
      world.attacks.some((area) => area.active && area.owner === "enemy"),
    ).toBe(false);
    expect(garacrow.moveSpeed).toBeCloseTo(
      world.active.moveSpeed * GARACROW_DIVE_STRIKE.attackSpeedRatio,
    );

    world.update(1 / 60, frame());

    const strikeAreas = world.attacks.filter(
      (area) => area.active && area.owner === "enemy",
    );
    expect(garacrow.stateAge).toBeGreaterThanOrEqual(
      GARACROW_DIVE_STRIKE.impactTime,
    );
    expect(garacrow.attackConnected).toBe(true);
    expect(garacrow.aiState).toBe("attack");
    expect(strikeAreas).toHaveLength(1);
    expect(strikeAreas[0]).toEqual(expect.objectContaining({
      pos: {
        x: garacrow.pos.x - GARACROW_DIVE_STRIKE.impactOffset,
        y: garacrow.pos.y,
      },
      damage: ENEMY_TUNING.garacrow.damage,
      radius: GARACROW_DIVE_STRIKE.impactRadius,
      knockback: GARACROW_DIVE_STRIKE.knockback,
    }));
    expect(world.effects.effects.filter(
      (effect) => effect.active && effect.kind === "impactRing",
    )).toHaveLength(1);
    expect(world.effects.effects.filter(
      (effect) => effect.active && effect.kind === "wind",
    )).toHaveLength(GARACROW_DIVE_STRIKE.windCount);
    expect(world.effects.effects.filter(
      (effect) =>
        effect.active &&
        effect.kind === "spark" &&
        (effect.color === "#a9f6ee" || effect.color === "#55c9c0"),
    )).toHaveLength(GARACROW_DIVE_STRIKE.sparkCount);
    const spawnCountAfterImpact = world.effects.spawnCount;

    world.update(1 / 60, frame());
    expect(world.effects.spawnCount).toBe(spawnCountAfterImpact);
    expect(garacrow.aiState).toBe("attack");

    for (let index = 0; index < 16; index += 1) {
      world.update(1 / 60, frame());
    }
    expect(garacrow.aiState).toBe("recover");
    expect(garacrow.attackCooldown).toBeGreaterThan(2);
    expect(garacrow.attackCooldown).toBeLessThanOrEqual(
      ENEMY_TUNING.garacrow.attackCooldown,
    );
    expect(ENEMY_AI.behavior.basicMelee.attackSpeedRatio).toBe(0.72);
    expect(ENEMY_TUNING.garacrow).toEqual({
      name: "ガラクロウ",
      hp: 88,
      armor: 0,
      archetype: "basicMelee",
      radius: 15,
      damage: 22,
      attackCooldown: 2.1,
      exp: 20,
    });
  });

  it("keeps Garacrow's windup direction when the dive begins", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const garacrow = replaceArenaEnemyWithGaracrow(world);
    for (const enemy of world.enemies) enemy.alive = enemy === garacrow;
    for (const member of world.party) member.cooldowns.normal = 999;

    world.active.pos = { x: 480, y: 180 };
    garacrow.pos = { x: 360, y: 180 };
    garacrow.aiState = "windup";
    garacrow.stateAge = 0.71;
    garacrow.stateTimer = 0.01;
    garacrow.telegraph = 0.01;
    garacrow.telegraphDuration = 0.72;
    garacrow.attackDirection = { x: 0, y: -1 };
    garacrow.facing = { x: 1, y: 0 };
    garacrow.attackConnected = false;

    world.update(1 / 60, frame());

    expect(garacrow.aiState).toBe("attack");
    expect(garacrow.stateAge).toBe(0);
    expect(garacrow.stateTimer).toBe(GARACROW_DIVE_STRIKE.attackDuration);
    expect(garacrow.attackDirection).toEqual({ x: 0, y: -1 });
    expect(garacrow.facing.x).toBeGreaterThan(0.9);
    expect(
      world.attacks.some((area) => area.active && area.owner === "enemy"),
    ).toBe(false);
  });

  it("ends Garacrow's dive safely when it reaches an arena wall", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const garacrow = replaceArenaEnemyWithGaracrow(world);
    for (const enemy of world.enemies) enemy.alive = enemy === garacrow;
    for (const member of world.party) member.cooldowns.normal = 999;

    garacrow.pos = {
      x: VIEW.arena.right - garacrow.radius,
      y: 180,
    };
    garacrow.attackDirection = { x: 1, y: 0 };
    garacrow.aiState = "attack";
    garacrow.stateAge = 0;
    garacrow.stateTimer = GARACROW_DIVE_STRIKE.attackDuration;
    garacrow.attackConnected = false;

    world.update(1 / 60, frame());

    expect(garacrow.aiState).toBe("recover");
    expect(garacrow.pos.x).toBe(VIEW.arena.right - garacrow.radius);
    expect(garacrow.attackConnected).toBe(false);
    expect(
      world.attacks.some((area) => area.active && area.owner === "enemy"),
    ).toBe(false);
  });

  it("emits one stationary Utsurobou curse wave at 0.08 seconds", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const utsurobou = world.enemies.find(
      (enemy) => enemy.kind === "utsurobou",
    );
    if (!utsurobou) throw new Error("Expected Utsurobou.");
    for (const enemy of world.enemies) enemy.alive = enemy === utsurobou;
    for (const member of world.party) member.cooldowns.normal = 999;

    world.active.pos = { x: 120, y: 180 };
    utsurobou.pos = { x: 360, y: 180 };
    utsurobou.facing = { x: -1, y: 0 };
    utsurobou.attackDirection = { x: -1, y: 0 };
    utsurobou.aiState = "attack";
    utsurobou.stateAge = 0;
    utsurobou.stateTimer = UTSUROBOU_MASK_CURSE_WAVE.attackDuration;
    utsurobou.attackConnected = false;
    utsurobou.aware = true;
    const positionBefore = { ...utsurobou.pos };

    for (let index = 0; index < 4; index += 1) {
      world.update(1 / 60, frame());
    }
    expect(utsurobou.stateAge).toBeCloseTo(1 / 15);
    expect(utsurobou.attackConnected).toBe(false);
    expect(utsurobou.pos).toEqual(positionBefore);
    expect(utsurobou.moveSpeed).toBe(0);
    expect(
      world.attacks.some((area) => area.active && area.owner === "enemy"),
    ).toBe(false);

    world.update(1 / 60, frame());

    const strikeAreas = world.attacks.filter(
      (area) => area.active && area.owner === "enemy",
    );
    expect(utsurobou.stateAge).toBeGreaterThanOrEqual(
      UTSUROBOU_MASK_CURSE_WAVE.impactTime,
    );
    expect(utsurobou.attackConnected).toBe(true);
    expect(utsurobou.aiState).toBe("attack");
    expect(utsurobou.pos).toEqual(positionBefore);
    expect(strikeAreas).toHaveLength(1);
    expect(strikeAreas[0]).toEqual(expect.objectContaining({
      pos: positionBefore,
      damage: ENEMY_TUNING.utsurobou.damage,
      radius: UTSUROBOU_MASK_CURSE_WAVE.radius,
      knockback: UTSUROBOU_MASK_CURSE_WAVE.knockback,
    }));
    expect(world.effects.effects.filter(
      (effect) => effect.active && effect.kind === "impactRing",
    )).toHaveLength(2);
    expect(world.effects.effects.filter(
      (effect) => effect.active && effect.kind === "wind",
    )).toHaveLength(2);
    expect(world.effects.effects.filter(
      (effect) =>
        effect.active &&
        effect.kind === "spark" &&
        (effect.color === "#89e5da" || effect.color === "#bba7df"),
    )).toHaveLength(UTSUROBOU_MASK_CURSE_WAVE.sparkCount);
    const spawnCountAfterImpact = world.effects.spawnCount;

    world.update(1 / 60, frame());
    expect(world.effects.spawnCount).toBe(spawnCountAfterImpact);
    expect(utsurobou.aiState).toBe("attack");
    expect(utsurobou.pos).toEqual(positionBefore);

    for (let index = 0; index < 16; index += 1) {
      world.update(1 / 60, frame());
    }
    expect(utsurobou.aiState).toBe("recover");
    expect(utsurobou.attackCooldown).toBeGreaterThan(2.1);
    expect(utsurobou.attackCooldown).toBeLessThanOrEqual(
      ENEMY_TUNING.utsurobou.attackCooldown,
    );
    expect(ENEMY_AI.behavior.basicMelee.attackSpeedRatio).toBe(0.72);
    expect(ENEMY_TUNING.utsurobou).toEqual({
      name: "ウツロボウ",
      hp: 70,
      armor: 0,
      archetype: "basicMelee",
      radius: 13,
      damage: 16,
      attackCooldown: 2.2,
      exp: 18,
    });
  });

  it("keeps Utsurobou's windup direction when the curse begins", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const utsurobou = world.enemies.find(
      (enemy) => enemy.kind === "utsurobou",
    );
    if (!utsurobou) throw new Error("Expected Utsurobou.");
    for (const enemy of world.enemies) enemy.alive = enemy === utsurobou;
    for (const member of world.party) member.cooldowns.normal = 999;

    world.active.pos = { x: 480, y: 180 };
    utsurobou.pos = { x: 360, y: 180 };
    utsurobou.aiState = "windup";
    utsurobou.stateAge = 0.71;
    utsurobou.stateTimer = 0.01;
    utsurobou.telegraph = 0.01;
    utsurobou.telegraphDuration = 0.72;
    utsurobou.attackDirection = { x: 0, y: -1 };
    utsurobou.facing = { x: 1, y: 0 };
    utsurobou.attackConnected = false;

    world.update(1 / 60, frame());

    expect(utsurobou.aiState).toBe("attack");
    expect(utsurobou.stateAge).toBe(0);
    expect(utsurobou.stateTimer).toBe(
      UTSUROBOU_MASK_CURSE_WAVE.attackDuration,
    );
    expect(utsurobou.attackDirection).toEqual({ x: 0, y: -1 });
    expect(utsurobou.facing.x).toBeGreaterThan(0.9);
    expect(
      world.attacks.some((area) => area.active && area.owner === "enemy"),
    ).toBe(false);
  });

  it("does not damage a character outside Utsurobou's curse radius", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const utsurobou = world.enemies.find(
      (enemy) => enemy.kind === "utsurobou",
    );
    if (!utsurobou) throw new Error("Expected Utsurobou.");
    for (const enemy of world.enemies) enemy.alive = enemy === utsurobou;
    for (const member of world.party) {
      member.cooldowns.normal = 999;
      if (member !== world.active) member.downed = true;
    }

    utsurobou.pos = { x: 320, y: 180 };
    utsurobou.aiState = "attack";
    utsurobou.stateAge = UTSUROBOU_MASK_CURSE_WAVE.impactTime;
    utsurobou.stateTimer = 0.2;
    utsurobou.attackDirection = { x: 1, y: 0 };
    utsurobou.attackConnected = false;
    world.active.pos = {
      x:
        utsurobou.pos.x +
        UTSUROBOU_MASK_CURSE_WAVE.radius +
        world.active.radius +
        1,
      y: utsurobou.pos.y,
    };
    const hpBefore = world.active.hp;

    world.update(1 / 60, frame());

    expect(utsurobou.attackConnected).toBe(true);
    expect(world.active.hp).toBe(hpBefore);
  });

  it("runs IwaUroko through windup, high-speed charge, and recovery", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const iwa = replaceArenaEnemyWithIwaUroko(world);
    for (const enemy of world.enemies) {
      if (enemy !== iwa) world.defeatEnemy(enemy.id);
    }
    for (const member of world.party) member.cooldowns.normal = 999;

    let sawWindup = false;
    let sawCharge = false;
    let sawRecover = false;
    let chargeSpeed = 0;

    for (let index = 0; index < 1200 && world.phase === "playing"; index += 1) {
      world.update(1 / 60, frame());
      sawWindup ||= iwa.aiState === "windup";
      if (iwa.aiState === "attack") {
        sawCharge = true;
        chargeSpeed = Math.max(chargeSpeed, iwa.moveSpeed);
      }
      sawRecover ||= iwa.aiState === "recover";
      if (sawWindup && sawCharge && sawRecover) break;
    }

    expect(sawWindup).toBe(true);
    expect(sawCharge).toBe(true);
    expect(sawRecover).toBe(true);
    expect(chargeSpeed).toBeGreaterThan(world.active.moveSpeed);
  });

  it("lands one 30-damage charge from the normal arena setup within 15 seconds", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const iwa = world.enemies.find((enemy) => enemy.kind === "iwaUroko");
    if (!iwa) throw new Error("Expected Iwa Uroko.");
    for (const enemy of world.enemies) enemy.alive = enemy === iwa;
    for (const member of world.party) {
      member.cooldowns.normal = 999;
      if (member.id !== world.activeId) member.downed = true;
    }
    world.active.hp = world.active.maxHp;
    world.active.invulnerable = 0;
    const hpBefore = world.active.hp;
    let hitAtSeconds: number | null = null;

    for (let frameIndex = 0; frameIndex < 15 * 60; frameIndex += 1) {
      world.update(1 / 60, frame());
      if (world.active.hp < hpBefore) {
        hitAtSeconds = (frameIndex + 1) / 60;
        break;
      }
    }

    expect(hitAtSeconds).not.toBeNull();
    expect(hitAtSeconds).toBeLessThanOrEqual(15);
    expect(world.active.hp).toBe(hpBefore - ENEMY_TUNING.iwaUroko.damage);
  });

  it("corrects Iwa Uroko once at charge start and then locks its direction", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const iwa = world.enemies.find((enemy) => enemy.kind === "iwaUroko");
    if (!iwa) throw new Error("Expected Iwa Uroko.");
    for (const enemy of world.enemies) enemy.alive = enemy === iwa;

    const targetAngle = Math.PI / 6;
    iwa.pos = { x: 320, y: 180 };
    world.active.pos = {
      x: iwa.pos.x + Math.cos(targetAngle) * 100,
      y: iwa.pos.y + Math.sin(targetAngle) * 100,
    };
    iwa.aiState = "windup";
    iwa.stateAge = ENEMY_AI.behavior.heavyCharge.windupDuration - 0.01;
    iwa.stateTimer = 0.001;
    iwa.telegraph = 0.001;
    iwa.telegraphDuration = ENEMY_AI.behavior.heavyCharge.windupDuration;
    iwa.attackDirection = { x: 1, y: 0 };
    iwa.facing = { x: 1, y: 0 };
    const start = { ...iwa.pos };

    world.update(1 / 60, frame());

    expect(iwa.aiState).toBe("attack");
    expect(iwa.stateAge).toBe(0);
    expect(iwa.stateTimer).toBe(
      IWAUROKO_ROCK_ARMOR_CHARGE.attackDuration,
    );
    expect(Math.atan2(iwa.attackDirection.y, iwa.attackDirection.x)).toBeCloseTo(
      IWAUROKO_ROCK_ARMOR_CHARGE.maxAimCorrectionRadians,
      6,
    );
    expect(iwa.facing.x).toBeCloseTo(iwa.attackDirection.x, 6);
    expect(iwa.facing.y).toBeCloseTo(iwa.attackDirection.y, 6);
    expect(iwa.pos).toEqual(start);

    const lockedDirection = { ...iwa.attackDirection };
    world.active.pos = { x: iwa.pos.x, y: iwa.pos.y - 100 };
    world.update(1 / 60, frame());
    expect(iwa.attackDirection.x).toBeCloseTo(lockedDirection.x, 6);
    expect(iwa.attackDirection.y).toBeCloseTo(lockedDirection.y, 6);

    expect(ENEMY_AI.behavior.heavyCharge.windupDuration).toBe(1.15);
    expect(ENEMY_AI.behavior.heavyCharge.attackDuration).toBe(0.42);
    expect(ENEMY_AI.behavior.heavyCharge.recoverDuration).toBe(1.3);
    expect(ENEMY_AI.behavior.heavyCharge.attackSpeedRatio).toBe(2.15);
    expect(IWAUROKO_ROCK_ARMOR_CHARGE.attackDuration).toBe(0.55);
  });

  it("uses the existing physical collision once and starts braking recovery", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const iwa = world.enemies.find((enemy) => enemy.kind === "iwaUroko");
    if (!iwa) throw new Error("Expected Iwa Uroko.");
    for (const enemy of world.enemies) enemy.alive = enemy === iwa;
    for (const member of world.party) {
      if (member.id !== world.activeId) member.cooldowns.normal = 999;
    }

    world.active.pos = { x: 320, y: 180 };
    world.active.hp = world.active.maxHp;
    world.active.invulnerable = 0;
    iwa.pos = {
      x: world.active.pos.x + iwa.radius + world.active.radius + 3,
      y: world.active.pos.y,
    };
    iwa.aiState = "attack";
    iwa.stateAge = 0;
    iwa.stateTimer = IWAUROKO_ROCK_ARMOR_CHARGE.attackDuration;
    iwa.attackDirection = { x: -1, y: 0 };
    iwa.attackConnected = false;
    const hpBefore = world.active.hp;

    world.update(1 / 60, frame());

    expect(iwa.aiState).toBe("recover");
    expect(iwa.stateAge).toBe(0);
    expect(iwa.stateTimer).toBe(
      IWAUROKO_ROCK_ARMOR_CHARGE.recoverDuration,
    );
    expect(iwa.attackConnected).toBe(true);
    expect(world.active.hp).toBe(hpBefore - ENEMY_TUNING.iwaUroko.damage);
    expect(iwa.attackCooldown).toBe(ENEMY_TUNING.iwaUroko.attackCooldown);
    expect(world.attacks.some(
      (area) => area.active && area.owner === "enemy",
    )).toBe(false);
    expect(world.effects.effects.filter(
      (effect) => effect.active && effect.kind === "dust",
    )).toHaveLength(8);

    const hpAfterContact = world.active.hp;
    world.update(1 / 60, frame());
    expect(world.active.hp).toBe(hpAfterContact);
  });

  it("hits once along Iwa Uroko's swept path even after its center passes", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const iwa = world.enemies.find((enemy) => enemy.kind === "iwaUroko");
    if (!iwa) throw new Error("Expected Iwa Uroko.");
    for (const enemy of world.enemies) enemy.alive = enemy === iwa;
    for (const member of world.party) {
      if (member.id !== world.activeId) member.downed = true;
    }

    world.active.moveSpeed = 1000;
    world.active.pos = { x: 330, y: 180 };
    world.active.hp = world.active.maxHp;
    world.active.invulnerable = 0;
    iwa.pos = { x: 280, y: 180 };
    iwa.aiState = "attack";
    iwa.stateAge = 0;
    iwa.stateTimer = IWAUROKO_ROCK_ARMOR_CHARGE.attackDuration;
    iwa.attackDirection = { x: 1, y: 0 };
    iwa.attackConnected = false;
    const hpBefore = world.active.hp;
    const collisionRadius =
      iwa.radius +
      world.active.radius +
      IWAUROKO_ROCK_ARMOR_CHARGE.collisionPadding;

    world.update(0.05, frame());

    expect(Math.abs(iwa.pos.x - world.active.pos.x)).toBeGreaterThan(
      collisionRadius,
    );
    expect(world.active.hp).toBe(hpBefore - ENEMY_TUNING.iwaUroko.damage);
    expect(iwa.attackConnected).toBe(true);
    expect(iwa.aiState).toBe("recover");
  });

  it("does not hit a member outside Iwa Uroko's swept collision radius", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const iwa = world.enemies.find((enemy) => enemy.kind === "iwaUroko");
    if (!iwa) throw new Error("Expected Iwa Uroko.");
    for (const enemy of world.enemies) enemy.alive = enemy === iwa;
    for (const member of world.party) {
      if (member.id !== world.activeId) member.downed = true;
    }

    world.active.moveSpeed = 1000;
    const collisionRadius =
      iwa.radius +
      world.active.radius +
      IWAUROKO_ROCK_ARMOR_CHARGE.collisionPadding;
    world.active.pos = { x: 330, y: 180 + collisionRadius + 1 };
    world.active.hp = world.active.maxHp;
    world.active.invulnerable = 0;
    iwa.pos = { x: 280, y: 180 };
    iwa.aiState = "attack";
    iwa.stateAge = 0;
    iwa.stateTimer = IWAUROKO_ROCK_ARMOR_CHARGE.attackDuration;
    iwa.attackDirection = { x: 1, y: 0 };
    iwa.attackConnected = false;
    const hpBefore = world.active.hp;

    world.update(0.05, frame());

    expect(world.active.hp).toBe(hpBefore);
    expect(iwa.attackConnected).toBe(false);
    expect(iwa.aiState).toBe("attack");
  });

  it("brakes after physical contact with an invulnerable member", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const iwa = world.enemies.find((enemy) => enemy.kind === "iwaUroko");
    if (!iwa) throw new Error("Expected Iwa Uroko.");
    for (const enemy of world.enemies) enemy.alive = enemy === iwa;
    for (const member of world.party) {
      if (member.id !== world.activeId) member.downed = true;
    }

    world.active.moveSpeed = 1000;
    world.active.pos = { x: 330, y: 180 };
    world.active.hp = world.active.maxHp;
    world.active.invulnerable = 1;
    iwa.pos = { x: 280, y: 180 };
    iwa.aiState = "attack";
    iwa.stateAge = 0;
    iwa.stateTimer = IWAUROKO_ROCK_ARMOR_CHARGE.attackDuration;
    iwa.attackDirection = { x: 1, y: 0 };
    iwa.attackConnected = false;
    const hpBefore = world.active.hp;

    world.update(0.05, frame());

    expect(world.active.hp).toBe(hpBefore);
    expect(iwa.attackConnected).toBe(true);
    expect(iwa.aiState).toBe("recover");
  });

  it("starts braking recovery at an arena wall without creating a hit", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const iwa = world.enemies.find((enemy) => enemy.kind === "iwaUroko");
    if (!iwa) throw new Error("Expected Iwa Uroko.");
    for (const enemy of world.enemies) enemy.alive = enemy === iwa;
    world.active.pos = { x: 280, y: 180 };
    world.active.invulnerable = 0;
    const hpBefore = world.active.hp;
    iwa.pos = {
      x: VIEW.arena.right - iwa.radius - 0.5,
      y: 230,
    };
    iwa.aiState = "attack";
    iwa.stateAge = 0;
    iwa.stateTimer = IWAUROKO_ROCK_ARMOR_CHARGE.attackDuration;
    iwa.attackDirection = { x: 1, y: 0 };
    iwa.attackConnected = false;

    world.update(1 / 60, frame());

    expect(iwa.aiState).toBe("recover");
    expect(iwa.stateAge).toBe(0);
    expect(iwa.attackConnected).toBe(false);
    expect(world.active.hp).toBe(hpBefore);
    expect(iwa.pos.x).toBeLessThanOrEqual(
      VIEW.arena.right - iwa.radius,
    );
  });

  it("emits two brace puffs and at most three short charge dust trails", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.5 });
    const iwa = world.enemies.find((enemy) => enemy.kind === "iwaUroko");
    if (!iwa) throw new Error("Expected Iwa Uroko.");
    for (const enemy of world.enemies) enemy.alive = enemy === iwa;
    iwa.pos = { x: 440, y: 250 };
    iwa.attackDirection = { x: -1, y: 0 };
    iwa.aiState = "windup";
    iwa.stateAge = 0.01;
    iwa.stateTimer = 0.19;
    iwa.telegraph = 0.19;
    iwa.telegraphDuration = IWAUROKO_ROCK_ARMOR_CHARGE.windupDuration;

    world.update(0.02, frame());
    expect(world.effects.effects.filter(
      (effect) => effect.active && effect.kind === "dust",
    )).toHaveLength(2);

    world.effects.clear();
    iwa.aiState = "attack";
    iwa.stateAge = 0;
    iwa.stateTimer = IWAUROKO_ROCK_ARMOR_CHARGE.attackDuration;
    iwa.attackConnected = false;
    for (let index = 0; index < 19; index += 1) {
      world.update(0.02, frame());
    }
    expect(world.effects.effects.filter(
      (effect) => effect.active && effect.kind === "dust",
    ).length).toBeLessThanOrEqual(3);
    expect(world.effects.spawnCount).toBe(5);
  });

  it("gently separates enemies that start on the same point", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const first = world.enemies[0];
    const second = world.enemies[1];
    if (!first || !second) throw new Error("Expected enemies.");
    second.pos = { ...first.pos };

    advance(world, 0.5);

    const gap = Math.hypot(
      first.pos.x - second.pos.x,
      first.pos.y - second.pos.y,
    );
    expect(gap).toBeGreaterThan(first.radius + second.radius);
    expect(gap).toBeLessThan(60);
  });

  it("automatically switches to a living member when the leader is downed", () => {
    const world = new GameWorld({ initialPhase: "playing" });

    world.damageCharacter("kyle", 999, { x: -1, y: 0 }, true);

    expect(world.party.find((member) => member.id === "kyle")?.downed).toBe(true);
    expect(world.activeId).toBe("nadi");
    expect(world.phase).toBe("playing");
  });

  it("lets rear-line Meru auto-heal at full value and spend MP", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const kyle = world.party.find((member) => member.id === "kyle");
    const meru = world.party.find((member) => member.id === "meru");
    if (!kyle || !meru) throw new Error("Expected party members.");
    kyle.hp = 20;
    const targetPosition = { ...kyle.pos };
    expect(COMBAT.autoHeal).toEqual({
      threshold: 0.45,
      mpCost: 18,
      amount: 27,
      cooldown: 5.2,
    });

    world.update(1 / 60, frame());

    expect(kyle.hp).toBe(20 + COMBAT.autoHeal.amount);
    expect(meru.mp).toBe(CHARACTER_TUNING.meru.mp - COMBAT.autoHeal.mpCost);
    expect(meru.cooldowns.autoHeal).toBeCloseTo(COMBAT.autoHeal.cooldown);
    expect(meru.actionKind).toBe("special");
    expect(meru.actionDuration).toBeCloseTo(0.38);
    expect(meru.actionTimer).toBeCloseTo(0.38);
    expect(meru.actionFacing).toEqual(meru.facing);
    expect(world.banner).toBe("");
    const healingEffects = world.effects.effects.filter((effect) => effect.active);
    expect(healingEffects).toHaveLength(14);
    expect(healingEffects.filter((effect) => effect.kind === "ring")).toEqual([
      expect.objectContaining({
        pos: targetPosition,
        maxLife: 0.65,
        size: 40,
        color: "#a6ee8a",
      }),
    ]);
    expect(world.drainAudioEvents()).toContainEqual(
      expect.objectContaining({
        kind: "ability",
        character: "meru",
        ability: "special",
        automatic: true,
      }),
    );
  });

  it("preserves manual Healing Ring timing, range, and effects without MP cost", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    world.activeId = "meru";
    const meru = world.active;
    const start = { ...meru.pos };
    const hpBefore = new Map(
      world.party.map((member) => {
        member.hp = member.maxHp - 40;
        return [member.id, member.hp] as const;
      }),
    );
    const mpBefore = meru.mp;
    const sequenceBefore = meru.actionSequenceId;
    expect(COMBAT.manualHeal).toEqual({
      amount: 31,
      radius: 82,
    });
    expect(COMBAT.specialCooldown.meru).toBe(0.38);

    world.active.techCharge = 1;

    world.update(1 / 60, frame(["special"]));

    expect(meru.pos).toEqual(start);
    expect(meru.mp).toBe(mpBefore);
    expect(meru.techCharge).toBeCloseTo(1 / 300, 6);
    expect(meru.cooldowns.special).toBeCloseTo(COMBAT.specialCooldown.meru);
    expect(meru.actionKind).toBe("special");
    expect(meru.actionDuration).toBeCloseTo(0.38);
    expect(meru.actionTimer).toBeCloseTo(0.38);
    expect(meru.actionSequenceId).toBe(sequenceBefore + 1);
    expect(meru.actionFacing).toEqual(meru.facing);
    expect(world.banner).toBe("");
    for (const member of world.party) {
      expect(member.hp).toBe(
        (hpBefore.get(member.id) ?? 0) + COMBAT.manualHeal.amount,
      );
    }
    const healingEffects = world.effects.effects.filter((effect) => effect.active);
    expect(healingEffects).toHaveLength(21);
    expect(healingEffects.filter((effect) => effect.kind === "ring")).toEqual([
      expect.objectContaining({
        pos: start,
        maxLife: 0.65,
        size: 40,
        color: "#a6ee8a",
      }),
    ]);
    expect(world.drainAudioEvents()).toContainEqual(
      expect.objectContaining({
        kind: "ability",
        character: "meru",
        ability: "special",
        automatic: false,
      }),
    );
  });

  it("emits an action cue on a swing but no hit cue when the attack misses", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });

    world.update(1 / 60, frame([], ["attack"]));
    const events = world.drainAudioEvents();

    expect(events).toContainEqual(
      expect.objectContaining({
        kind: "ability",
        character: "kyle",
        ability: "normal",
      }),
    );
    expect(events.some((event) => event.kind === "hit")).toBe(false);
    expect(world.active.actionKind).toBe("normal");
    expect(world.active.actionDuration).toBeCloseTo(0.18);
    expect(world.active.actionTimer).toBeCloseTo(0.18);
    expect(world.active.actionSequenceId).toBe(1);
    expect(world.active.actionFacing).toEqual(world.active.facing);
  });

  it("restarts the normal action sequence while attack remains held", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const sequenceIds = new Set<number>();

    for (let index = 0; index < 75; index += 1) {
      world.update(1 / 60, frame([], ["attack"]));
      if (world.active.actionKind === "normal") {
        sequenceIds.add(world.active.actionSequenceId);
      }
    }

    expect([...sequenceIds]).toEqual([1, 2, 3, 4]);
  });

  it("identifies Kyle's other actions without marking them as normal", () => {
    const specialWorld = new GameWorld({
      initialPhase: "playing",
      random: () => 0.99,
    });
    specialWorld.active.techCharge = 1;
    specialWorld.update(1 / 60, frame(["special"]));
    expect(specialWorld.active.actionKind).toBe("special");
    expect(specialWorld.active.actionDuration).toBeCloseTo(0.28);

    const ultimateWorld = new GameWorld({
      initialPhase: "playing",
      random: () => 0.99,
    });
    ultimateWorld.active.techCharge = 3;
    ultimateWorld.update(1 / 60, frame(["ultimate"]));
    expect(ultimateWorld.active.actionKind).toBe("ultimate");

    const switchWorld = new GameWorld({
      initialPhase: "playing",
      random: () => 0.99,
    });
    switchWorld.update(1 / 60, frame(["switch"]));
    expect(switchWorld.activeId).toBe("nadi");
    expect(switchWorld.active.actionKind).toBe("switch");

    const kyleSwitchWorld = new GameWorld({
      initialPhase: "playing",
      random: () => 0.99,
    });
    kyleSwitchWorld.activeId = "meru";
    expect(kyleSwitchWorld.switchCharacter(true)).toBe(true);
    expect(kyleSwitchWorld.activeId).toBe("kyle");
    expect(kyleSwitchWorld.active.actionKind).toBe("switch");
    expect(kyleSwitchWorld.active.actionDuration).toBeCloseTo(0.35);
  });

  it("preserves Rekku Dan's fixed origin, projectile tuning, and five launch winds", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const kyle = world.active;
    for (const enemy of world.enemies) enemy.alive = false;
    for (const member of world.party) {
      if (member.id !== "kyle") member.cooldowns.normal = 999;
    }
    kyle.facing = { x: 1, y: 0 };
    const start = { ...kyle.pos };
    const sequenceBefore = kyle.actionSequenceId;
    const effectSpawn = vi.spyOn(world.effects, "spawn");

    expect(COMBAT.ultimateCooldown.kyle).toBe(0.5);
    expect(CHARACTER_TUNING.kyle.ultimateDamage).toBe(58);

    world.active.techCharge = 3;

    world.update(1 / 60, frame(["ultimate"]));

    const windBlade = world.projectiles.find(
      (projectile) =>
        projectile.active &&
        projectile.owner === "kyle" &&
        projectile.kind === "windBlade",
    );
    expect(kyle.pos).toEqual(start);
    expect(kyle.cooldowns.ultimate).toBe(COMBAT.ultimateCooldown.kyle);
    expect(kyle.actionKind).toBe("ultimate");
    expect(kyle.actionDuration).toBeCloseTo(0.5);
    expect(kyle.actionTimer).toBeCloseTo(0.5);
    expect(kyle.actionSequenceId).toBe(sequenceBefore + 1);
    expect(kyle.actionFacing).toEqual({ x: 1, y: 0 });
    expect(world.banner).toBe("");
    expect(windBlade).toEqual(expect.objectContaining({
      velocity: { x: 180, y: 0 },
      radius: 14,
      damage: CHARACTER_TUNING.kyle.ultimateDamage,
      maxLife: 1.3,
      damageScale: 1,
    }));
    expect(Math.hypot(
      windBlade?.velocity.x ?? 0,
      windBlade?.velocity.y ?? 0,
    )).toBeCloseTo(180);
    expect(
      (windBlade?.pos.x ?? 0) - (windBlade?.velocity.x ?? 0) / 60,
    ).toBeCloseTo(start.x + 14);
    expect(
      (windBlade?.pos.y ?? 0) - (windBlade?.velocity.y ?? 0) / 60,
    ).toBeCloseTo(start.y);

    const launchWindCalls = effectSpawn.mock.calls
      .map(([options]) => options)
      .filter((options) => options.kind === "wind" && options.life === 0.52);
    expect(launchWindCalls).toEqual(
      Array.from({ length: 5 }, (_, index) => ({
        kind: "wind",
        pos: { x: start.x + 8 + index * 7, y: start.y },
        velocity: { x: 30 + index * 8, y: 0 },
        life: 0.52,
        size: 22 + index * 4,
        color: index % 2 ? "#dffff9" : "#46dcca",
        rotation: 0,
      })),
    );
    expect(world.drainAudioEvents()).toContainEqual(expect.objectContaining({
      kind: "ability",
      character: "kyle",
      ability: "ultimate",
      automatic: false,
    }));

    advance(world, 0.55);

    expect(kyle.pos).toEqual(start);
    expect(kyle.actionKind).toBe(null);
    expect(kyle.actionTimer).toBe(0);
  });

  it("keeps Moon Eclipse Dance's four stages aligned to Nadi's 1.04-second action", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    world.activeId = "nadi";
    const nadi = world.active;
    nadi.facing = { x: 0, y: -1 };
    const start = { ...nadi.pos };
    const sequenceBefore = nadi.actionSequenceId;
    for (const [index, enemy] of world.enemies.entries()) {
      const pos = {
        x: VIEW.arena.right - 18,
        y: VIEW.arena.top + 24 + index * 42,
      };
      enemy.pos = { ...pos };
      enemy.idleAnchor = { ...pos };
      enemy.idleTarget = { ...pos };
    }

    expect(COMBAT.ultimateCooldown.nadi).toBe(1.04);
    expect(CHARACTER_TUNING.nadi.ultimateDamage).toBe(18);

    world.active.techCharge = 3;

    world.update(0, frame(["ultimate"]));

    expect(nadi.pos).toEqual(start);
    expect(nadi.cooldowns.ultimate).toBe(COMBAT.ultimateCooldown.nadi);
    expect(nadi.actionKind).toBe("ultimate");
    expect(nadi.actionDuration).toBeCloseTo(1.04);
    expect(nadi.actionTimer).toBeCloseTo(1.04);
    expect(nadi.actionSequenceId).toBe(sequenceBefore + 1);
    expect(nadi.actionFacing).toEqual({ x: 0, y: -1 });
    expect(world.banner).toBe("");
    expect(world.sequences).toEqual([
      expect.objectContaining({
        owner: "nadi",
        kind: "moonDance",
        elapsed: 0,
        stage: 0,
        target: start,
        damageScale: 1,
      }),
    ]);
    expect(world.drainAudioEvents()).toContainEqual(expect.objectContaining({
      kind: "ability",
      character: "nadi",
      ability: "ultimate",
      automatic: false,
    }));

    const advancePrecisely = (seconds: number): void => {
      let remaining = seconds;
      while (remaining > 0.000001) {
        const step = Math.min(1 / 20, remaining);
        world.update(step, frame());
        remaining -= step;
      }
    };
    const expectedStages = [
      {
        before: 0.059,
        crossing: 0.002,
        radius: 31,
        innerRadius: 16,
        damage: 18,
        knockback: 16,
        areaColor: "#82e9e9",
        ringLife: 0.32,
        ringColor: "#86eeee",
      },
      {
        before: 0.178,
        crossing: 0.002,
        radius: 45,
        innerRadius: 30,
        damage: 18,
        knockback: 16,
        areaColor: "#82e9e9",
        ringLife: 0.32,
        ringColor: "#86eeee",
      },
      {
        before: 0.188,
        crossing: 0.002,
        radius: 59,
        innerRadius: 44,
        damage: 18,
        knockback: 16,
        areaColor: "#82e9e9",
        ringLife: 0.32,
        ringColor: "#86eeee",
      },
      {
        before: 0.258,
        crossing: 0.002,
        radius: 82,
        innerRadius: 52,
        damage: 38,
        knockback: 50,
        areaColor: "#e0ffff",
        ringLife: 0.48,
        ringColor: "#e7ffff",
      },
    ] as const;

    expectedStages.forEach((expected, index) => {
      advancePrecisely(expected.before);
      expect(world.sequences[0]?.stage).toBe(index);

      advancePrecisely(expected.crossing);
      expect(world.sequences[0]?.stage).toBe(index + 1);

      const area = world.attacks.find(
        (candidate) =>
          candidate.active &&
          candidate.owner === "nadi" &&
          candidate.radius === expected.radius,
      );
      expect(area).toEqual(expect.objectContaining({
        pos: start,
        radius: expected.radius,
        innerRadius: expected.innerRadius,
        damage: expected.damage,
        damageScale: 1,
        knockback: expected.knockback,
        color: expected.areaColor,
      }));
      const ring = world.effects.effects.find(
        (effect) =>
          effect.active &&
          effect.kind === "ring" &&
          effect.size === expected.radius,
      );
      expect(ring).toEqual(expect.objectContaining({
        pos: start,
        maxLife: expected.ringLife,
        size: expected.radius,
        color: expected.ringColor,
      }));
    });

    expect(nadi.pos).toEqual(start);
    expect(world.sequences[0]?.elapsed).toBeCloseTo(0.691);
    advancePrecisely(0.35);
    expect(nadi.pos).toEqual(start);
    expect(nadi.actionKind).toBe(null);
    expect(nadi.actionTimer).toBe(0);
    expect(world.sequences).toHaveLength(0);

    const kyleWorld = new GameWorld({
      initialPhase: "playing",
      random: () => 0.99,
    });
    kyleWorld.active.techCharge = 3;
    kyleWorld.update(0, frame(["ultimate"]));
    expect(kyleWorld.active.actionDuration).toBeCloseTo(0.5);

    const meruWorld = new GameWorld({
      initialPhase: "playing",
      random: () => 0.99,
    });
    meruWorld.activeId = "meru";
    meruWorld.active.techCharge = 3;
    meruWorld.update(0, frame(["ultimate"]));
    expect(meruWorld.active.actionDuration).toBeCloseTo(1.12);
  });

  it("aligns Crystal Fall's fixed target and single impact with Meru's 1.12-second action", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    world.activeId = "meru";
    const meru = world.active;
    meru.facing = { x: 1, y: 0 };
    const start = { ...meru.pos };
    const target = world.enemies[0];
    if (!target) throw new Error("Expected a target enemy.");
    for (const enemy of world.enemies) enemy.alive = enemy === target;
    for (const member of world.party) {
      if (member.id !== "meru") member.cooldowns.normal = 999;
    }
    const selectedTarget = { x: start.x + 30, y: start.y };
    target.pos = { ...selectedTarget };
    target.idleAnchor = { ...selectedTarget };
    target.idleTarget = { ...selectedTarget };
    target.velocity = { x: 0, y: 0 };
    target.knockback = { x: 0, y: 0 };
    target.moveSpeed = 0;
    target.armor = 0;
    target.hp = 200;
    const sequenceBefore = meru.actionSequenceId;
    const effectSpawn = vi.spyOn(world.effects, "spawn");

    expect(COMBAT.ultimateCooldown.meru).toBe(1.12);
    expect(CHARACTER_TUNING.meru.ultimateDamage).toBe(64);

    world.active.techCharge = 3;

    world.update(0, frame(["ultimate"]));

    expect(meru.pos).toEqual(start);
    expect(meru.cooldowns.ultimate).toBe(COMBAT.ultimateCooldown.meru);
    expect(meru.actionKind).toBe("ultimate");
    expect(meru.actionDuration).toBeCloseTo(1.12);
    expect(meru.actionTimer).toBeCloseTo(1.12);
    expect(meru.actionSequenceId).toBe(sequenceBefore + 1);
    expect(meru.actionFacing).toEqual({ x: 1, y: 0 });
    expect(world.banner).toBe("");
    expect(world.sequences).toEqual([
      expect.objectContaining({
        owner: "meru",
        kind: "crystalFall",
        elapsed: 0,
        stage: 0,
        target: selectedTarget,
        damageScale: 1,
      }),
    ]);
    expect(effectSpawn.mock.calls.map(([options]) => options)).toContainEqual({
      kind: "ring",
      pos: selectedTarget,
      life: 0.7,
      size: 38,
      color: "#79e7cf",
      layer: "back",
    });
    expect(world.drainAudioEvents()).toContainEqual(expect.objectContaining({
      kind: "ability",
      character: "meru",
      ability: "ultimate",
      automatic: false,
    }));

    target.pos = { x: selectedTarget.x + 8, y: selectedTarget.y };
    target.idleAnchor = { ...target.pos };
    target.idleTarget = { ...target.pos };
    const advancePrecisely = (seconds: number): void => {
      let remaining = seconds;
      while (remaining > 0.000001) {
        const step = Math.min(1 / 20, remaining);
        world.update(step, frame());
        remaining -= step;
      }
    };

    advancePrecisely(0.519);
    expect(world.sequences[0]).toEqual(expect.objectContaining({
      stage: 0,
      target: selectedTarget,
    }));
    expect(world.attacks.some(
      (area) => area.active && area.owner === "meru",
    )).toBe(false);
    expect(effectSpawn.mock.calls.map(([options]) => options).filter(
      (options) => options.kind === "crystal",
    )).toHaveLength(0);

    advancePrecisely(0.002);

    expect(world.sequences[0]).toEqual(expect.objectContaining({
      elapsed: expect.closeTo(0.521, 5),
      stage: 1,
      target: selectedTarget,
    }));
    const impactArea = world.attacks.find(
      (area) => area.active && area.owner === "meru",
    );
    expect(impactArea).toEqual(expect.objectContaining({
      pos: selectedTarget,
      radius: 56,
      damage: CHARACTER_TUNING.meru.ultimateDamage,
      damageScale: 1,
      knockback: 58,
      color: "#8af3dc",
    }));
    expect(impactArea?.hitIds).toContain(target.id);
    expect(target.hp).toBe(200 - CHARACTER_TUNING.meru.ultimateDamage);

    const effectCalls = effectSpawn.mock.calls.map(([options]) => options);
    const crystals = effectCalls.filter(
      (options) => options.kind === "crystal" && options.life === 0.72,
    );
    expect(crystals).toEqual([
      {
        kind: "crystal",
        pos: selectedTarget,
        velocity: { x: 0, y: -14 },
        life: 0.72,
        size: 58,
        color: "#9cf8e4",
      },
    ]);
    const shards = effectCalls.filter(
      (options) => options.kind === "spark" && options.life === 0.55,
    );
    expect(shards).toHaveLength(16);
    shards.forEach((shard, index) => {
      const angle = (index / 16) * Math.PI * 2;
      expect(shard).toEqual(expect.objectContaining({
        kind: "spark",
        pos: selectedTarget,
        life: 0.55,
        size: 3 + (index % 3),
        color: index % 2 ? "#dfffee" : "#50d5bd",
      }));
      expect(shard.velocity?.x).toBeCloseTo(Math.cos(angle) * 70);
      expect(shard.velocity?.y).toBeCloseTo(Math.sin(angle) * 45);
    });
    expect(world.shake).toBeCloseTo(COMBAT.screenShake * 4);

    const hpAfterImpact = target.hp;
    world.hitStop = 0;
    advancePrecisely(0.6);
    expect(meru.pos).toEqual(start);
    expect(target.hp).toBe(hpAfterImpact);
    expect(meru.actionKind).toBe(null);
    expect(meru.actionTimer).toBe(0);
    expect(world.sequences).toHaveLength(0);

    const kyleWorld = new GameWorld({
      initialPhase: "playing",
      random: () => 0.99,
    });
    kyleWorld.active.techCharge = 3;
    kyleWorld.update(0, frame(["ultimate"]));
    expect(kyleWorld.active.actionDuration).toBeCloseTo(0.5);

    const nadiWorld = new GameWorld({
      initialPhase: "playing",
      random: () => 0.99,
    });
    nadiWorld.activeId = "nadi";
    nadiWorld.active.techCharge = 3;
    nadiWorld.update(0, frame(["ultimate"]));
    expect(nadiWorld.active.actionDuration).toBeCloseTo(1.04);
  });

  it("keeps Crystal Fall's no-enemy target 92px ahead and clamps it at 24px", () => {
    const fallbackWorld = new GameWorld({
      initialPhase: "playing",
      random: () => 0.99,
    });
    fallbackWorld.activeId = "meru";
    for (const enemy of fallbackWorld.enemies) enemy.alive = false;
    const meru = fallbackWorld.active;
    meru.pos = {
      x: (VIEW.arena.left + VIEW.arena.right) / 2,
      y: (VIEW.arena.top + VIEW.arena.bottom) / 2,
    };
    meru.facing = { x: 1, y: 0 };
    const start = { ...meru.pos };

    fallbackWorld.active.techCharge = 3;

    fallbackWorld.update(0, frame(["ultimate"]));

    expect(fallbackWorld.sequences[0]?.target).toEqual({
      x: start.x + 92,
      y: start.y,
    });

    const clampedWorld = new GameWorld({
      initialPhase: "playing",
      random: () => 0.99,
    });
    clampedWorld.activeId = "meru";
    for (const enemy of clampedWorld.enemies) enemy.alive = false;
    const edgeMeru = clampedWorld.active;
    edgeMeru.pos = {
      x: VIEW.arena.right - 10,
      y: (VIEW.arena.top + VIEW.arena.bottom) / 2,
    };
    edgeMeru.facing = { x: 1, y: 0 };

    clampedWorld.active.techCharge = 3;

    clampedWorld.update(0, frame(["ultimate"]));

    expect(clampedWorld.sequences[0]?.target).toEqual({
      x: VIEW.arena.right - 24,
      y: edgeMeru.pos.y,
    });
  });

  it("moves Hajin Thrust once and preserves its delayed swept combat tuning", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const kyle = world.active;
    const target = world.enemies[0];
    if (!target) throw new Error("Expected an enemy.");
    for (const enemy of world.enemies) enemy.alive = false;
    for (const member of world.party) {
      if (member.id !== "kyle") member.cooldowns.normal = 999;
    }
    target.alive = true;
    target.armor = 0;
    target.hp = target.maxHp;
    kyle.facing = { x: 1, y: 0 };
    const start = { ...kyle.pos };
    target.pos = { x: start.x + 72, y: start.y };
    const hpBefore = target.hp;

    world.active.techCharge = 1;

    world.update(1 / 60, frame(["special"]));

    const thrust = world.attacks.find(
      (attack) => attack.active && attack.owner === "kyle",
    );
    expect(kyle.pos.x - start.x).toBeCloseTo(34);
    expect(kyle.pos.y).toBeCloseTo(start.y);
    expect(kyle.actionKind).toBe("special");
    expect(kyle.actionDuration).toBeCloseTo(0.28);
    expect(kyle.actionFacing).toEqual({ x: 1, y: 0 });
    expect(kyle.cooldowns.special).toBeCloseTo(COMBAT.specialCooldown.kyle);
    expect(thrust).toEqual(expect.objectContaining({
      pos: { x: start.x + 34, y: start.y },
      direction: { x: 1, y: 0 },
      radius: KYLE_HAJIN_THRUST.sweepRadius,
      terminalRadius: KYLE_HAJIN_THRUST.terminalRadius,
      sweepStart: { x: start.x + KYLE_HAJIN_THRUST.sweepStartOffset, y: start.y },
      sweepEnd: { x: start.x + 34, y: start.y },
      delay: expect.any(Number),
      damage: CHARACTER_TUNING.kyle.specialDamage,
      breakArmor: 26,
      knockback: 44,
    }));
    expect(target.hp).toBe(hpBefore);
    expect(world.effects.effects.some(
      (effect) => effect.active && effect.kind === "wind",
    )).toBe(false);

    advance(world, KYLE_HAJIN_THRUST.hitDelay + 0.02);
    expect(target.hp).toBe(hpBefore - CHARACTER_TUNING.kyle.specialDamage);
    expect(world.effects.effects.some(
      (effect) => effect.active && effect.kind === "wind",
    )).toBe(true);

    advance(world, 0.4);
    expect(kyle.pos.x - start.x).toBeCloseTo(34);
    expect(target.hp).toBe(hpBefore - CHARACTER_TUNING.kyle.specialDamage);
  });

  it("clamps Hajin Thrust at the arena edge without a second sprite movement", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    for (const enemy of world.enemies) enemy.alive = false;
    const kyle = world.active;
    kyle.facing = { x: 1, y: 0 };
    kyle.pos = {
      x: VIEW.arena.right - kyle.radius - 5,
      y: (VIEW.arena.top + VIEW.arena.bottom) / 2,
    };
    const startX = kyle.pos.x;

    world.active.techCharge = 1;

    world.update(1 / 60, frame(["special"]));

    expect(kyle.pos.x).toBeCloseTo(VIEW.arena.right - kyle.radius);
    expect(kyle.pos.x - startX).toBeCloseTo(5);
    expect(kyle.pos.x - startX).toBeLessThanOrEqual(34);
  });

  it("forgives a small forward aiming error but never turns Hajin Thrust toward a flank or rear target", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const kyle = world.active;
    const target = world.enemies[0];
    if (!target) throw new Error("Expected an enemy.");
    for (const enemy of world.enemies) enemy.alive = enemy === target;
    kyle.facing = { x: 1, y: 0 };
    const start = { ...kyle.pos };
    target.pos = { x: start.x + 66, y: start.y + 22 };
    target.idleAnchor = { ...target.pos };
    target.idleTarget = { ...target.pos };
    const hpBefore = target.hp;

    world.active.techCharge = 1;

    world.update(1 / 60, frame(["special"]));
    expect(kyle.actionFacing.y).toBeGreaterThan(0.2);
    expect(kyle.actionFacing.x).toBeGreaterThan(0.9);
    advance(world, 0.09);
    expect(target.hp).toBe(hpBefore - CHARACTER_TUNING.kyle.specialDamage);

    const flankWorld = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const flankKyle = flankWorld.active;
    const flank = flankWorld.enemies[0];
    if (!flank) throw new Error("Expected an enemy.");
    for (const enemy of flankWorld.enemies) enemy.alive = enemy === flank;
    flankKyle.facing = { x: 1, y: 0 };
    flank.pos = { x: flankKyle.pos.x + 50, y: flankKyle.pos.y + 55 };
    flank.idleAnchor = { ...flank.pos };
    flank.idleTarget = { ...flank.pos };
    const flankHp = flank.hp;
    flankWorld.active.techCharge = 1;
    flankWorld.update(1 / 60, frame(["special"]));
    expect(flankKyle.actionFacing).toEqual({ x: 1, y: 0 });
    advance(flankWorld, 0.14);
    expect(flank.hp).toBe(flankHp);

    const rearWorld = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const rearKyle = rearWorld.active;
    const rear = rearWorld.enemies[0];
    if (!rear) throw new Error("Expected an enemy.");
    for (const enemy of rearWorld.enemies) enemy.alive = enemy === rear;
    rearKyle.facing = { x: 1, y: 0 };
    rear.pos = { x: rearKyle.pos.x - 20, y: rearKyle.pos.y };
    rear.idleAnchor = { ...rear.pos };
    rear.idleTarget = { ...rear.pos };
    const rearHp = rear.hp;
    rearWorld.active.techCharge = 1;
    rearWorld.update(1 / 60, frame(["special"]));
    advance(rearWorld, 0.14);
    expect(rear.hp).toBe(rearHp);
  });

  it("hits the complete Hajin Thrust path once per enemy, including a short wall-clamped dash", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const kyle = world.active;
    const [first, second] = world.enemies;
    if (!first || !second) throw new Error("Expected enemies.");
    for (const enemy of world.enemies) enemy.alive = enemy === first || enemy === second;
    kyle.facing = { x: 1, y: 0 };
    first.pos = { x: kyle.pos.x + 22, y: kyle.pos.y };
    second.pos = { x: kyle.pos.x + 38, y: kyle.pos.y };
    first.armor = 0;
    second.armor = 0;
    first.idleAnchor = { ...first.pos }; first.idleTarget = { ...first.pos };
    second.idleAnchor = { ...second.pos }; second.idleTarget = { ...second.pos };
    const firstHp = first.hp;
    const secondHp = second.hp;
    world.active.techCharge = 1;
    world.update(1 / 60, frame(["special"]));
    advance(world, 0.09);
    expect(first.hp).toBe(firstHp - CHARACTER_TUNING.kyle.specialDamage);
    expect(second.hp).toBe(secondHp - CHARACTER_TUNING.kyle.specialDamage);
    advance(world, 0.3);
    expect(first.hp).toBe(firstHp - CHARACTER_TUNING.kyle.specialDamage);
    expect(second.hp).toBe(secondHp - CHARACTER_TUNING.kyle.specialDamage);

    const edgeWorld = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const edgeKyle = edgeWorld.active;
    const edgeTarget = edgeWorld.enemies[0];
    if (!edgeTarget) throw new Error("Expected an enemy.");
    for (const enemy of edgeWorld.enemies) enemy.alive = enemy === edgeTarget;
    edgeKyle.facing = { x: 1, y: 0 };
    edgeKyle.pos = { x: VIEW.arena.right - edgeKyle.radius - 20, y: 206 };
    const edgeStart = { ...edgeKyle.pos };
    edgeTarget.pos = { x: VIEW.arena.right - edgeTarget.radius - 1, y: 206 };
    edgeTarget.idleAnchor = { ...edgeTarget.pos };
    edgeTarget.idleTarget = { ...edgeTarget.pos };
    const edgeHp = edgeTarget.hp;
    edgeWorld.active.techCharge = 1;
    edgeWorld.update(1 / 60, frame(["special"]));
    expect(edgeKyle.pos.x - edgeStart.x).toBeLessThan(KYLE_HAJIN_THRUST.dashDistance);
    advance(edgeWorld, 0.12);
    expect(edgeTarget.hp).toBe(edgeHp - CHARACTER_TUNING.kyle.specialDamage);
  });

  it("keeps Hajin Thrust practical against each shipped enemy body size", () => {
    for (const kind of ["mossPlun", "lumibane", "iwaUroko", "utsurobou"] as const) {
      const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
      const kyle = world.active;
      const target = createEnemy(1, kind, kyle.pos.x + 72, kyle.pos.y);
      target.armor = 0;
      target.maxArmor = 0;
      target.idleAnchor = { ...target.pos };
      target.idleTarget = { ...target.pos };
      world.enemies = [target];
      kyle.facing = { x: 1, y: 0 };
      const hpBefore = target.hp;

      world.active.techCharge = 1;

      world.update(1 / 60, frame(["special"]));
      expect(target.hp).toBe(hpBefore);
      advance(world, 0.12);
      expect(target.hp).toBe(hpBefore - CHARACTER_TUNING.kyle.specialDamage);
    }
  });

  it("breaks exactly 26 stone armor and preserves Hajin impact cues", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const kyle = world.active;
    const target = replaceArenaEnemyWithIwaUroko(world);
    for (const enemy of world.enemies) enemy.alive = enemy === target;
    for (const member of world.party) {
      if (member.id !== "kyle") member.cooldowns.normal = 999;
    }
    kyle.facing = { x: 1, y: 0 };
    target.pos = { x: kyle.pos.x + 72, y: kyle.pos.y };
    target.armor = 26;

    world.active.techCharge = 1;

    world.update(1 / 60, frame(["special"]));

    expect(target.armor).toBe(26);
    advance(world, KYLE_HAJIN_THRUST.hitDelay + 0.02);
    expect(target.armor).toBe(0);
    expect(world.effects.effects.some(
      (effect) => effect.active && effect.kind === "dust",
    )).toBe(true);
    const events = world.drainAudioEvents();
    expect(events).toContainEqual(expect.objectContaining({
      kind: "ability",
      character: "kyle",
      ability: "special",
    }));
    expect(events).toContainEqual(expect.objectContaining({
      kind: "hit",
      material: "stone",
    }));
    expect(events).toContainEqual(expect.objectContaining({
      kind: "armorBreak",
    }));
  });

  it("keeps Engetsu Spin centered and preserves its combat tuning", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    world.activeId = "nadi";
    const nadi = world.active;
    const target = world.enemies[0];
    if (!target) throw new Error("Expected an enemy.");
    for (const enemy of world.enemies) enemy.alive = false;
    for (const member of world.party) {
      if (member.id !== "nadi") member.cooldowns.normal = 999;
    }
    target.alive = true;
    target.armor = 0;
    target.hp = target.maxHp;
    nadi.facing = { x: 1, y: 0 };
    const start = { ...nadi.pos };
    target.pos = { x: start.x + 32, y: start.y };
    target.idleAnchor = { ...target.pos };
    target.idleTarget = { ...target.pos };
    target.velocity = { x: 0, y: 0 };
    target.knockback = { x: 0, y: 0 };
    const hpBefore = target.hp;

    world.active.techCharge = 1;

    world.update(1 / 60, frame(["special"]));

    const spin = world.attacks.find(
      (attack) => attack.active && attack.owner === "nadi",
    );
    const ring = world.effects.effects.find(
      (effect) => effect.active && effect.kind === "ring",
    );
    expect(nadi.pos).toEqual(start);
    expect(nadi.actionKind).toBe("special");
    expect(nadi.actionDuration).toBeCloseTo(0.34);
    expect(nadi.actionFacing).toEqual({ x: 1, y: 0 });
    expect(nadi.cooldowns.special).toBeCloseTo(COMBAT.specialCooldown.nadi);
    expect(spin).toEqual(expect.objectContaining({
      pos: start,
      radius: 53,
      innerRadius: 7,
      arc: Math.PI * 2,
      damage: CHARACTER_TUNING.nadi.specialDamage,
      breakArmor: 0,
      knockback: 32,
      color: "#9cf8f2",
    }));
    expect(spin?.hitIds).toContain(target.id);
    expect(ring).toEqual(expect.objectContaining({
      pos: start,
      maxLife: 0.38,
      size: 58,
      color: "#aefcf7",
    }));
    expect(target.hp).toBe(hpBefore - CHARACTER_TUNING.nadi.specialDamage);

    advance(world, 0.45);
    expect(nadi.pos).toEqual(start);
    expect(target.hp).toBe(hpBefore - CHARACTER_TUNING.nadi.specialDamage);
  });

  it("hits multiple enemies once each with one Engetsu Spin", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    world.activeId = "nadi";
    const nadi = world.active;
    const targets = world.enemies.slice(0, 2);
    if (targets.length !== 2) throw new Error("Expected two enemies.");
    for (const enemy of world.enemies) enemy.alive = targets.includes(enemy);
    for (const member of world.party) {
      if (member.id !== "nadi") member.cooldowns.normal = 999;
    }
    const start = { ...nadi.pos };
    const positions = [
      { x: start.x + 32, y: start.y },
      { x: start.x, y: start.y - 32 },
    ];
    for (const [index, target] of targets.entries()) {
      const pos = positions[index];
      if (!pos) throw new Error("Expected a target position.");
      target.armor = 0;
      target.hp = target.maxHp;
      target.pos = { ...pos };
      target.idleAnchor = { ...pos };
      target.idleTarget = { ...pos };
      target.velocity = { x: 0, y: 0 };
      target.knockback = { x: 0, y: 0 };
    }
    const hpBefore = targets.map((target) => target.hp);

    world.active.techCharge = 1;

    world.update(1 / 60, frame(["special"]));

    const spin = world.attacks.find(
      (attack) => attack.active && attack.owner === "nadi",
    );
    expect(spin?.hitIds).toEqual(new Set(targets.map((target) => target.id)));
    targets.forEach((target, index) => {
      expect(target.hp).toBe(
        (hpBefore[index] ?? 0) - CHARACTER_TUNING.nadi.specialDamage,
      );
    });

    advance(world, 0.45);
    targets.forEach((target, index) => {
      expect(target.hp).toBe(
        (hpBefore[index] ?? 0) - CHARACTER_TUNING.nadi.specialDamage,
      );
    });
  });

  it("does not move Nadi when Engetsu Spin is used against an arena wall", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    world.activeId = "nadi";
    for (const enemy of world.enemies) enemy.alive = false;
    const nadi = world.active;
    nadi.facing = { x: 1, y: 0 };
    nadi.pos = {
      x: VIEW.arena.right - nadi.radius,
      y: (VIEW.arena.top + VIEW.arena.bottom) / 2,
    };
    const start = { ...nadi.pos };

    world.active.techCharge = 1;

    world.update(1 / 60, frame(["special"]));

    expect(nadi.pos).toEqual(start);
    expect(world.attacks.find(
      (attack) => attack.active && attack.owner === "nadi",
    )?.pos).toEqual(start);
  });

  it("freezes an in-progress normal action while paused", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    world.update(1 / 60, frame([], ["attack"]));
    const timerBeforePause = world.active.actionTimer;
    const sequenceBeforePause = world.active.actionSequenceId;

    expect(world.togglePause()).toBe(true);
    advance(world, 0.5);

    expect(world.active.actionTimer).toBe(timerBeforePause);
    expect(world.active.actionKind).toBe("normal");
    expect(world.active.actionSequenceId).toBe(sequenceBeforePause);
  });

  it("damages one target only once during Kyle's six-frame normal animation", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const enemy = world.enemies[0];
    if (!enemy) throw new Error("Expected an enemy.");
    enemy.armor = 0;
    enemy.pos = {
      x: world.active.pos.x + 17,
      y: world.active.pos.y,
    };
    for (const member of world.party) {
      if (member.id !== "kyle") member.cooldowns.normal = 999;
    }
    const hpBefore = enemy.hp;

    world.update(1 / 60, frame([], ["attack"]));
    advance(world, 0.25);

    expect(enemy.hp).toBe(hpBefore - CHARACTER_TUNING.kyle.attackDamage);
  });

  it("starts Nadi's normal action and immediately creates one unchanged moon blade", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    world.activeId = "nadi";
    const nadi = world.active;
    nadi.facing = { x: 1, y: 0 };
    const start = { ...nadi.pos };

    world.update(1 / 60, frame([], ["attack"]));

    const moonBlades = world.projectiles.filter(
      (projectile) =>
        projectile.active &&
        projectile.owner === "nadi" &&
        projectile.kind === "moonBlade",
    );
    expect(nadi.actionKind).toBe("normal");
    expect(nadi.actionDuration).toBeCloseTo(0.18);
    expect(nadi.actionTimer).toBeCloseTo(0.18);
    expect(nadi.actionSequenceId).toBe(1);
    expect(nadi.actionFacing).toEqual({ x: 1, y: 0 });
    expect(moonBlades).toHaveLength(1);
    expect(moonBlades[0]).toEqual(
      expect.objectContaining({
        radius: 7,
        damage: CHARACTER_TUNING.nadi.attackDamage,
        maxLife: 0.92,
        damageScale: 1,
      }),
    );
    expect(Math.hypot(
      moonBlades[0]?.velocity.x ?? 0,
      moonBlades[0]?.velocity.y ?? 0,
    )).toBeCloseTo(154);
    expect(moonBlades[0]?.pos.x).toBeGreaterThanOrEqual(start.x + 11);
  });

  it("restarts Nadi's held normal attack without duplicating each throw", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    world.activeId = "nadi";
    const sequences: number[] = [];
    let previousSequence = 0;

    for (let index = 0; index < 80; index += 1) {
      world.update(1 / 60, frame([], ["attack"]));
      if (world.active.actionSequenceId !== previousSequence) {
        previousSequence = world.active.actionSequenceId;
        sequences.push(previousSequence);
        expect(
          world.projectiles.filter(
            (projectile) =>
              projectile.active &&
              projectile.owner === "nadi" &&
              projectile.kind === "moonBlade" &&
              projectile.id > 0,
          ).length,
        ).toBeLessThanOrEqual(sequences.length);
      }
    }

    expect(sequences).toEqual([1, 2, 3]);
  });

  it("starts Meru's normal action and immediately creates one unchanged phosphor bolt without MP cost", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    world.activeId = "meru";
    const meru = world.active;
    meru.facing = { x: 1, y: 0 };
    const start = { ...meru.pos };
    const mpBefore = meru.mp;

    world.update(1 / 60, frame([], ["attack"]));

    const phosphorBolts = world.projectiles.filter(
      (projectile) =>
        projectile.active &&
        projectile.owner === "meru" &&
        projectile.kind === "phosphor",
    );
    expect(meru.actionKind).toBe("normal");
    expect(meru.actionDuration).toBeCloseTo(0.18);
    expect(meru.actionTimer).toBeCloseTo(0.18);
    expect(meru.actionSequenceId).toBe(1);
    expect(meru.actionFacing).toEqual({ x: 1, y: 0 });
    expect(meru.mp).toBe(mpBefore);
    expect(phosphorBolts).toHaveLength(1);
    expect(phosphorBolts[0]).toEqual(
      expect.objectContaining({
        radius: 4,
        damage: CHARACTER_TUNING.meru.attackDamage,
        maxLife: 1.25,
        damageScale: 1,
      }),
    );
    expect(Math.hypot(
      phosphorBolts[0]?.velocity.x ?? 0,
      phosphorBolts[0]?.velocity.y ?? 0,
    )).toBeCloseTo(122);
    expect(phosphorBolts[0]?.pos.x).toBeGreaterThanOrEqual(start.x + 10);
  });

  it("restarts Meru's held normal action once per phosphor bolt", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    world.activeId = "meru";
    const sequences: number[] = [];
    let previousSequence = 0;

    for (let index = 0; index < 80; index += 1) {
      world.update(1 / 60, frame([], ["attack"]));
      if (world.active.actionSequenceId !== previousSequence) {
        previousSequence = world.active.actionSequenceId;
        sequences.push(previousSequence);
      }
    }

    expect(sequences).toEqual([1, 2, 3]);
  });

  it("marks a rear-line Kyle auto attack as a normal action at half damage", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    world.activeId = "nadi";
    const kyle = world.party.find((member) => member.id === "kyle");
    const target = world.enemies[0];
    if (!kyle || !target) throw new Error("Expected Kyle and an enemy.");
    for (const enemy of world.enemies) enemy.alive = false;
    target.alive = true;
    target.armor = 0;
    target.hp = target.maxHp;
    target.pos = { x: kyle.pos.x + 20, y: kyle.pos.y };
    const hpBefore = target.hp;

    world.update(1 / 60, frame());

    expect(kyle.actionKind).toBe("normal");
    expect(kyle.actionDuration).toBeCloseTo(0.18);
    expect(target.hp).toBe(
      hpBefore -
        Math.round(
          CHARACTER_TUNING.kyle.attackDamage * COMBAT.rearDamageScale,
        ),
    );
    expect(world.drainAudioEvents()).toContainEqual(
      expect.objectContaining({
        kind: "ability",
        character: "kyle",
        ability: "normal",
        automatic: true,
      }),
    );
  });

  it("marks a rear-line Nadi throw as a normal action at half damage", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const nadi = world.party.find((member) => member.id === "nadi");
    const target = world.enemies[0];
    if (!nadi || !target) throw new Error("Expected Nadi and an enemy.");
    for (const enemy of world.enemies) enemy.alive = false;
    for (const member of world.party) {
      if (member.id !== "nadi") member.cooldowns.normal = 999;
    }

    advance(world, 0.5);
    target.alive = true;
    target.armor = 0;
    target.hp = target.maxHp;
    nadi.pos = { ...nadi.formationSlot };
    target.pos = { x: nadi.pos.x + 70, y: nadi.pos.y };

    world.update(1 / 60, frame());

    const projectile = world.projectiles.find(
      (item) =>
        item.active &&
        item.owner === "nadi" &&
        item.kind === "moonBlade",
    );
    expect(nadi.actionKind).toBe("normal");
    expect(nadi.actionDuration).toBeCloseTo(0.18);
    expect(projectile).toEqual(
      expect.objectContaining({
        damage: CHARACTER_TUNING.nadi.attackDamage,
        damageScale: COMBAT.rearDamageScale,
        radius: 7,
        maxLife: 0.92,
      }),
    );
    expect(world.drainAudioEvents()).toContainEqual(
      expect.objectContaining({
        kind: "ability",
        character: "nadi",
        ability: "normal",
        automatic: true,
      }),
    );
  });

  it("marks a rear-line Meru bolt as a normal action at half damage without spending MP", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const meru = world.party.find((member) => member.id === "meru");
    const target = world.enemies[0];
    if (!meru || !target) throw new Error("Expected Meru and an enemy.");
    for (const enemy of world.enemies) enemy.alive = false;
    for (const member of world.party) {
      if (member.id !== "meru") member.cooldowns.normal = 999;
    }

    advance(world, 0.5);
    target.alive = true;
    target.armor = 0;
    target.hp = target.maxHp;
    meru.pos = { ...meru.formationSlot };
    target.pos = { x: meru.pos.x + 100, y: meru.pos.y };
    const mpBefore = meru.mp;

    world.update(1 / 60, frame());

    const projectile = world.projectiles.find(
      (item) =>
        item.active &&
        item.owner === "meru" &&
        item.kind === "phosphor",
    );
    expect(meru.actionKind).toBe("normal");
    expect(meru.actionDuration).toBeCloseTo(0.18);
    expect(meru.mp).toBe(mpBefore);
    expect(projectile).toEqual(
      expect.objectContaining({
        damage: CHARACTER_TUNING.meru.attackDamage,
        damageScale: COMBAT.rearDamageScale,
        radius: 4,
        maxLife: 1.25,
      }),
    );
    expect(world.drainAudioEvents()).toContainEqual(
      expect.objectContaining({
        kind: "ability",
        character: "meru",
        ability: "normal",
        automatic: true,
      }),
    );
  });

  it("distinguishes an armored hit and emits defeat plus EXP cues", () => {
    const armoredWorld = new GameWorld({
      initialPhase: "playing",
      random: () => 0.99,
    });
    const armored = replaceArenaEnemyWithIwaUroko(armoredWorld);
    armored.pos = {
      x: armoredWorld.active.pos.x + 17,
      y: armoredWorld.active.pos.y,
    };

    armoredWorld.update(1 / 60, frame([], ["attack"]));
    expect(armoredWorld.drainAudioEvents()).toContainEqual(
      expect.objectContaining({ kind: "hit", material: "stone" }),
    );

    const defeatedWorld = new GameWorld({
      initialPhase: "playing",
      random: () => 0.99,
    });
    const enemy = defeatedWorld.enemies[0];
    if (!enemy) throw new Error("Expected enemy.");
    defeatedWorld.defeatEnemy(enemy.id);
    const defeatEvents = defeatedWorld.drainAudioEvents();
    expect(defeatEvents.some((event) => event.kind === "enemyDefeated")).toBe(true);
    expect(defeatEvents.some((event) => event.kind === "experience")).toBe(true);
  });

  it("buffers an edge-triggered action pressed during hit-stop", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    world.hitStop = 0.05;

    world.active.techCharge = 3;

    world.update(0.05, frame(["ultimate"]));
    expect(world.party[0]?.cooldowns.ultimate).toBe(0);

    world.update(1 / 60, frame());
    expect(world.party[0]?.cooldowns.ultimate).toBeGreaterThan(0);
  });

  it("adds EXP on defeat and preserves it through a full-party retry", () => {
    const world = new GameWorld({ initialPhase: "playing", random: () => 0.99 });
    const firstEnemy = world.enemies[0];
    if (!firstEnemy) throw new Error("Expected an enemy.");

    world.defeatEnemy(firstEnemy.id);
    const kyle = world.party.find((member) => member.id === "kyle");
    if (!kyle) throw new Error("Expected Kyle.");
    kyle.cooldowns.ultimate = 7;
    kyle.techCharge = 2;
    const earned = world.exp;
    expect(earned).toBe(firstEnemy.exp);

    world.damageCharacter("kyle", 999, { x: 1, y: 0 }, true);
    world.damageCharacter("nadi", 999, { x: 1, y: 0 }, true);
    world.damageCharacter("meru", 999, { x: 1, y: 0 }, true);
    expect(world.phase).toBe("gameover");

    world.confirm();

    expect(world.phase).toBe("playing");
    expect(world.exp).toBe(earned);
    for (const member of world.party) {
      expect(member.downed).toBe(false);
      expect(member.hp).toBe(member.maxHp);
      expect(member.mp).toBe(member.maxMp);
      expect(member.cooldowns.ultimate).toBe(0);
      expect(member.techCharge).toBe(0);
    }
  });
});
