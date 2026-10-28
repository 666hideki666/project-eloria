import { describe, expect, it } from "vitest";
import { VELGRAN_COMBAT } from "../config";
import { createParty } from "./entities";
import type { CharacterId } from "./types";
import { VelgranBossController, type VelgranUpdateHooks } from "./VelgranBossController";
import { CRYSTAL_ALTAR } from "../stage/maps/crystalAltarMap";
import { isCrystalAltarPositionWalkable } from "../stage/crystalAltarCollision";

const hooks = {
  damageCharacter: () => undefined,
  emit: () => undefined,
  impact: () => undefined,
};

describe("VelgranBossController", () => {
  it("uses the strengthened guardian HP and armor totals", () => {
    const boss = new VelgranBossController();
    expect(boss.snapshot.maxHp).toBe(672);
    expect(boss.snapshot.maxArmor).toBe(90);
  });

  it("breaks armor before exposing the crystal core", () => {
    const boss = new VelgranBossController();
    boss.setForQa("active");

    let broken = false;
    for (let index = 0; index < 20 && !broken; index += 1) {
      broken = boss.receiveHit("kyle", 18, 8).armorBroken;
    }

    expect(broken).toBe(true);
    expect(boss.phase).toBe("coreExposed");
    expect(boss.armor).toBe(0);
  });

  it("applies the configured normal and exposed final damage multipliers once", () => {
    const normal = new VelgranBossController();
    normal.setForQa("active");
    const normalHit = normal.receiveHit("kyle", 100, 0);

    const exposed = new VelgranBossController();
    exposed.setForQa("core");
    const kyleHit = exposed.receiveHit("kyle", 100, 0);
    const meruTarget = new VelgranBossController();
    meruTarget.setForQa("core");
    const meruHit = meruTarget.receiveHit("meru", 100, 0);

    expect(normalHit.damage).toBe(68);
    expect(normalHit.armorDamage).toBe(4);
    expect(kyleHit.damage).toBe(78);
    expect(meruHit.damage).toBe(78);
  });

  it("applies one final multiplier to every current damaging character action", () => {
    const attacks = [
      ["Kyle normal", "kyle", 18],
      ["Kyle special", "kyle", 34],
      ["Kyle ultimate", "kyle", 58],
      ["Nadi normal", "nadi", 16],
      ["Nadi special", "nadi", 29],
      ["Nadi ultimate pulse", "nadi", 18],
      ["Nadi ultimate finisher", "nadi", 38],
      ["Meru normal", "meru", 13],
      ["Meru ultimate", "meru", 64],
    ] as const;

    for (const [label, owner, rawDamage] of attacks) {
      const normal = new VelgranBossController();
      normal.setForQa("active");
      expect(normal.receiveHit(owner, rawDamage, 0).damage, `${label} normal`).toBe(
        Math.max(1, Math.round(rawDamage * VELGRAN_COMBAT.normalDamageMultiplier)),
      );

      const exposed = new VelgranBossController();
      exposed.setForQa("core");
      expect(exposed.receiveHit(owner, rawDamage, 0).damage, `${label} exposed`).toBe(
        Math.max(1, Math.round(rawDamage * VELGRAN_COMBAT.exposedDamageMultiplier)),
      );
    }
  });

  it("switches the final multiplier from normal to exposed and back to normal", () => {
    const boss = new VelgranBossController();
    const party = createParty();
    boss.setForQa("active");

    expect(boss.receiveHit("kyle", 100, 90).damage).toBe(68);
    expect(boss.phase).toBe("coreExposed");
    expect(boss.receiveHit("meru", 100, 0).damage).toBe(78);

    boss.update(VELGRAN_COMBAT.exposedDuration + 0.01, party, "kyle", hooks);
    expect(boss.phase).toBe("recovering");
    boss.update(0.71, party, "kyle", hooks);
    expect(boss.phase).toBe("active");
    expect(boss.receiveHit("nadi", 100, 0).damage).toBe(68);
  });

  it("extends equivalent raw-damage time by about 15 to 20 percent", () => {
    const normalDurationRatio = 0.8 / VELGRAN_COMBAT.normalDamageMultiplier;
    const exposedDurationRatio = 0.9 / VELGRAN_COMBAT.exposedDamageMultiplier;

    expect(normalDurationRatio).toBeCloseTo(1.1765, 4);
    expect(exposedDurationRatio).toBeCloseTo(1.1538, 4);
    expect(normalDurationRatio).toBeGreaterThanOrEqual(1.15);
    expect(normalDurationRatio).toBeLessThanOrEqual(1.2);
    expect(exposedDurationRatio).toBeGreaterThanOrEqual(1.15);
    expect(exposedDurationRatio).toBeLessThanOrEqual(1.2);
  });

  it("keeps each complete ultimate burst near or below fifteen percent during one exposure", () => {
    const exposedDamage = (rawDamage: number): number =>
      Math.max(1, Math.round(rawDamage * VELGRAN_COMBAT.exposedDamageMultiplier));
    const ultimateBursts = {
      kyle: exposedDamage(58),
      nadi: exposedDamage(18) * 3 + exposedDamage(38),
      meru: exposedDamage(64),
    };

    expect(ultimateBursts).toEqual({ kyle: 45, nadi: 72, meru: 50 });
    expect(Math.max(...Object.values(ultimateBursts)) / VELGRAN_COMBAT.maxHp).toBeLessThanOrEqual(0.15);
  });

  it("closes the exposed-core window after the shortened 1.56 seconds", () => {
    const boss = new VelgranBossController();
    const party = createParty();
    boss.setForQa("core");
    boss.update(1.55, party, "kyle", hooks);
    expect(boss.phase).toBe("coreExposed");
    boss.update(0.02, party, "kyle", hooks);
    expect(boss.phase).toBe("recovering");
    expect(boss.armor).toBe(90);
  });

  it("can repeat armor break, core exposure, and recovery without retaining the prior phase", () => {
    const boss = new VelgranBossController();
    const party = createParty();
    boss.setForQa("active");

    for (let cycle = 0; cycle < 3; cycle += 1) {
      while (boss.phase === "active") boss.receiveHit("kyle", 1, 30);
      expect(boss.phase).toBe("coreExposed");
      expect(boss.attack).toBeNull();

      boss.update(VELGRAN_COMBAT.exposedDuration + 0.01, party, "kyle", hooks);
      expect(boss.phase).toBe("recovering");
      expect(boss.armor).toBe(90);

      boss.update(0.71, party, "kyle", hooks);
      expect(boss.phase).toBe("active");
      expect(boss.attack).toBeNull();
    }
  });

  it("widens stomp and root hazards and raises damage below half HP", () => {
    const party = createParty();
    const damage: number[] = [];
    const damageHooks = {
      ...hooks,
      damageCharacter: (_id: string, amount: number) => { damage.push(amount); },
    };
    const stomp = new VelgranBossController();
    stomp.setForQa("stomp");
    party.forEach((member) => { member.pos = { ...stomp.pos }; });
    expect(stomp.snapshot.hazards[0]?.radius).toBe(84);
    stomp.update(0.8, party, "kyle", damageHooks);
    expect(damage).toContain(22);

    damage.length = 0;
    const enragedStomp = new VelgranBossController();
    enragedStomp.setForQa("stomp");
    enragedStomp.hp = enragedStomp.snapshot.maxHp / 2;
    party.forEach((member) => { member.pos = { ...enragedStomp.pos }; });
    enragedStomp.update(0.8, party, "kyle", damageHooks);
    expect(damage).toContain(26);

    damage.length = 0;
    const roots = new VelgranBossController();
    roots.setForQa("roots");
    const normalRoot = roots.snapshot.hazards[1]!;
    party.forEach((member) => { member.pos = { ...normalRoot.start }; });
    roots.update(0.75, party, "kyle", damageHooks);
    expect(damage).toContain(16);

    damage.length = 0;
    const enragedRoots = new VelgranBossController();
    enragedRoots.setForQa("roots");
    enragedRoots.hp = enragedRoots.snapshot.maxHp / 2;
    const root = enragedRoots.snapshot.hazards[1]!;
    party.forEach((member) => { member.pos = { ...root.start }; });
    expect(root.radius).toBe(18);
    enragedRoots.update(0.75, party, "kyle", damageHooks);
    expect(damage).toContain(19);
  });

  it("raises the crystal volley from five shots at speed 128 to seven at speed 148 below half HP", () => {
    const normal = new VelgranBossController();
    const normalParty = createParty();
    normal.setForQa("shards");
    normal.update(0.65, normalParty, "kyle", hooks);

    expect(normal.snapshot.crystalProjectiles).toHaveLength(5);
    for (const shot of normal.snapshot.crystalProjectiles) {
      expect(Math.hypot(shot.velocity.x, shot.velocity.y)).toBeCloseTo(128, 5);
    }

    const boss = new VelgranBossController();
    const party = createParty();
    boss.setForQa("shards");
    boss.hp = boss.snapshot.maxHp / 2;
    boss.update(0.65, party, "kyle", hooks);

    expect(boss.snapshot.crystalProjectiles).toHaveLength(7);
    for (const shot of boss.snapshot.crystalProjectiles) {
      expect(Math.hypot(shot.velocity.x, shot.velocity.y)).toBeCloseTo(148, 5);
    }
  });

  it("raises crystal-shot damage from 14 to 16 below half HP", () => {
    const party = createParty();
    const damage: number[] = [];
    const damageHooks = {
      ...hooks,
      damageCharacter: (_id: string, amount: number) => { damage.push(amount); },
    };
    const normal = new VelgranBossController();
    normal.setForQa("shards");
    normal.update(0.65, party, "kyle", damageHooks);
    party[0]!.pos = { ...normal.snapshot.crystalProjectiles[0]!.pos };
    normal.update(0.001, party, "kyle", damageHooks);
    expect(damage).toContain(14);

    damage.length = 0;
    const enraged = new VelgranBossController();
    enraged.setForQa("shards");
    enraged.hp = enraged.snapshot.maxHp / 2;
    enraged.update(0.65, party, "kyle", damageHooks);
    party[0]!.pos = { ...enraged.snapshot.crystalProjectiles[0]!.pos };
    enraged.update(0.001, party, "kyle", damageHooks);
    expect(damage).toContain(16);
  });

  it("expands Forest Crystal Ring outward and hits each crossed member only once", () => {
    const boss = new VelgranBossController();
    const party = createParty();
    const hits: Array<{ id: CharacterId; damage: number }> = [];
    const ringHooks = {
      ...hooks,
      damageCharacter: (id: CharacterId, damage: number) => { hits.push({ id, damage }); },
    };
    boss.setForQa("forestRing");
    party[0]!.pos = { x: boss.pos.x + 110, y: boss.pos.y };
    party[1]!.pos = { x: boss.pos.x + 20, y: boss.pos.y };
    party[2]!.pos = { x: boss.pos.x + 285, y: boss.pos.y };

    boss.update(0.99, party, "kyle", ringHooks);
    expect(hits).toHaveLength(0);
    boss.update(0.22, party, "kyle", ringHooks);
    expect(hits).toEqual([{ id: "kyle", damage: 22 }]);

    party[0]!.pos = { x: boss.pos.x + 55, y: boss.pos.y };
    boss.update(0.7, party, "kyle", ringHooks);
    expect(hits).toEqual([{ id: "kyle", damage: 22 }]);
  });

  it("guarantees Forest Crystal Ring by the fourth attack and immediately after crossing half HP", () => {
    const target = { x: 400, y: 300 };
    const periodic = new VelgranBossController();
    periodic.setForQa("active");
    const periodicInternals = periodic as unknown as {
      attacksSinceForestRing: number;
      beginAttack(target: { x: number; y: number }, hooks: VelgranUpdateHooks): void;
    };
    periodicInternals.attacksSinceForestRing = 3;
    periodicInternals.beginAttack(target, hooks);
    expect(periodic.attack).toBe("forestRing");

    const enraged = new VelgranBossController();
    enraged.setForQa("active");
    enraged.hp = enraged.snapshot.maxHp / 2 + 10;
    enraged.armor = 0;
    enraged.receiveHit("meru", 15, 0);
    const enragedInternals = enraged as unknown as {
      beginAttack(target: { x: number; y: number }, hooks: VelgranUpdateHooks): void;
    };
    enragedInternals.beginAttack(target, hooks);
    expect(enraged.attack).toBe("forestRing");
  });

  it("raises Forest Crystal Ring damage from 22 to 28 below half HP", () => {
    const boss = new VelgranBossController();
    const party = createParty();
    const damage: number[] = [];
    boss.setForQa("forestRing");
    boss.hp = boss.snapshot.maxHp / 2;
    party.forEach((member, index) => {
      member.pos = { x: boss.pos.x + 100 + index * 80, y: boss.pos.y };
    });
    boss.update(1.3, party, "kyle", {
      ...hooks,
      damageCharacter: (_id, amount) => { damage.push(amount); },
    });
    expect(damage).toContain(28);
  });

  it("uses the shorter 0.30 second next-attack delay below half HP", () => {
    const boss = new VelgranBossController();
    const party = createParty();
    boss.setForQa("stomp");
    boss.hp = boss.snapshot.maxHp / 2;
    while (boss.attack) boss.update(0.05, party, "kyle", hooks);

    expect((boss as unknown as { attackCooldown: number }).attackCooldown).toBeCloseTo(0.3, 5);
  });

  it("resets the full encounter after retreat", () => {
    const boss = new VelgranBossController();
    boss.setForQa("core");
    boss.receiveHit("meru", 80, 0);
    boss.resetForRetreat();

    expect(boss.phase).toBe("dormant");
    expect(boss.hp).toBe(boss.snapshot.maxHp);
    expect(boss.armor).toBe(boss.snapshot.maxArmor);
    expect(boss.snapshot.crystalProjectiles).toHaveLength(0);
  });

  it("starts only after the party crosses the intro line", () => {
    const boss = new VelgranBossController();
    const party = createParty();
    expect(boss.beginIfNeeded(CRYSTAL_ALTAR.introTriggerY + 1)).toBe(false);
    expect(boss.beginIfNeeded(CRYSTAL_ALTAR.introTriggerY - 1)).toBe(true);
    expect(boss.combatActive).toBe(true);
    expect(party).toHaveLength(3);
  });

  it("walks to a new position before opening its active attack loop", () => {
    const boss = new VelgranBossController();
    const party = createParty();
    boss.setForQa("active");
    const start = { ...boss.pos };

    for (let index = 0; index < 12; index += 1) boss.update(0.1, party, "kyle", hooks);

    expect(boss.snapshot.moving).toBe(true);
    expect(Math.hypot(boss.pos.x - start.x, boss.pos.y - start.y)).toBeGreaterThan(20);
    expect(boss.attack).toBeNull();
  });

  it("keeps the boss's ground point inside the central combat floor during movement and attacks", () => {
    const boss = new VelgranBossController();
    const party = createParty();
    boss.setForQa("active");
    party[0]!.pos = { x: CRYSTAL_ALTAR.spawn.x, y: CRYSTAL_ALTAR.introTriggerY - 20 };
    let moved = false;
    let attacked = false;
    for (let index = 0; index < 900; index += 1) {
      boss.update(1 / 60, party, "kyle", hooks);
      moved ||= boss.moving;
      attacked ||= boss.attack !== null;
      expect(isCrystalAltarPositionWalkable(boss.pos, 0)).toBe(true);
      expect(boss.pos.x).toBeGreaterThanOrEqual(CRYSTAL_ALTAR.bossCombatBounds.left);
      expect(boss.pos.x).toBeLessThanOrEqual(CRYSTAL_ALTAR.bossCombatBounds.right);
      expect(boss.pos.y).toBeGreaterThanOrEqual(CRYSTAL_ALTAR.bossCombatBounds.top);
      expect(boss.pos.y).toBeLessThanOrEqual(CRYSTAL_ALTAR.bossCombatBounds.bottom);
    }
    expect(moved).toBe(true);
    expect(attacked).toBe(true);
  });

  it("stops movement and clears attacks immediately when defeated", () => {
    const boss = new VelgranBossController();
    const party = createParty();
    boss.setForQa("active");
    for (let index = 0; index < 8; index += 1) boss.update(0.1, party, "kyle", hooks);
    boss.setForQa("core");

    while (boss.hp > 0) boss.receiveHit("meru", 100, 0);

    expect(boss.phase).toBe("defeatStagger");
    expect(boss.snapshot.moving).toBe(false);
    expect(boss.attack).toBeNull();
    expect(boss.snapshot.crystalProjectiles).toHaveLength(0);
  });

  it("repositions after an attack before starting another one", () => {
    const boss = new VelgranBossController();
    const party = createParty();
    boss.setForQa("stomp");
    let attackFinished = false;
    let movedAfterAttack = false;

    for (let index = 0; index < 40; index += 1) {
      boss.update(0.1, party, "kyle", hooks);
      if (boss.attack === null) attackFinished = true;
      if (attackFinished && boss.snapshot.moving) movedAfterAttack = true;
      if (movedAfterAttack) break;
    }

    expect(attackFinished).toBe(true);
    expect(movedAfterAttack).toBe(true);
    expect(boss.attack).toBeNull();
  });

  it("uses a telegraphed repel after the party remains inside its body space", () => {
    const boss = new VelgranBossController();
    const party = createParty();
    const hits: Array<{ id: CharacterId; damage: number; knockback?: number }> = [];
    const repelHooks: VelgranUpdateHooks = {
      ...hooks,
      damageCharacter: (id, damage, _direction, knockback) => {
        hits.push({ id, damage, knockback });
      },
    };
    boss.setForQa("active");
    const internals = boss as unknown as {
      recoveryTimer: number;
      repositionPending: boolean;
      moveTarget: { x: number; y: number } | null;
      attackCooldown: number;
    };
    internals.recoveryTimer = 0;
    internals.repositionPending = false;
    internals.moveTarget = null;
    internals.attackCooldown = 99;
    party[0]!.pos = { x: boss.pos.x + 46, y: boss.pos.y };
    party[1]!.pos = { x: boss.pos.x + 240, y: boss.pos.y };
    party[2]!.pos = { x: boss.pos.x - 240, y: boss.pos.y };

    boss.update(VELGRAN_COMBAT.proximityHold - 0.01, party, "kyle", repelHooks);
    expect(boss.attack).toBeNull();
    boss.update(0.02, party, "kyle", repelHooks);
    expect(boss.attack).toBe("repel");

    boss.update(VELGRAN_COMBAT.repel.windupDuration - 0.01, party, "kyle", repelHooks);
    expect(hits).toHaveLength(0);
    boss.update(0.02, party, "kyle", repelHooks);
    boss.update(0.1, party, "kyle", repelHooks);
    expect(hits).toEqual([{
      id: "kyle",
      damage: VELGRAN_COMBAT.repel.damage,
      knockback: VELGRAN_COMBAT.repel.knockback,
    }]);
  });

  it("remains stopped through every post-defeat presentation phase", () => {
    const boss = new VelgranBossController();
    const party = createParty();
    boss.setForQa("core");
    while (boss.hp > 0) boss.receiveHit("meru", 100, 0);
    const defeatedAt = { ...boss.pos };

    for (let index = 0; index < 40; index += 1) {
      boss.update(0.1, party, "kyle", hooks);
      expect(boss.snapshot.moving).toBe(false);
      expect(boss.attack).toBeNull();
      expect(boss.pos).toEqual(defeatedAt);
    }

    expect(boss.phase).toBe("sealReady");
  });
});
