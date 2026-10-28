import { describe, expect, it } from "vitest";
import {
  ACCESSIBILITY,
  EFFECT_POOL_SIZE,
  NORMAL_ATTACK_EFFECTS,
} from "../src/config";
import { EffectPool } from "../src/effects/EffectPool";
import {
  GameWorld,
  resolveImpactShake,
} from "../src/game/GameWorld";
import {
  createEnemy,
  createProjectilePool,
} from "../src/game/entities";
import type { ActionName, CharacterId, InputFrame } from "../src/game/types";
import { resolveNormalEffectCoreColor } from "../src/render/Renderer";

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

function advanceAtStep(
  world: GameWorld,
  seconds: number,
  step: number,
): void {
  const frames = Math.ceil(seconds / step);
  for (let index = 0; index < frames; index += 1) {
    world.update(step, frame());
  }
}

function createProjectileWorld(characterId: CharacterId): GameWorld {
  const world = new GameWorld({
    initialPhase: "playing",
    random: () => 0.5,
  });
  world.activeId = characterId;
  for (const enemy of world.enemies) enemy.alive = false;
  world.active.facing = { x: 1, y: 0 };
  return world;
}

function countTrailSpawns(
  characterId: "nadi" | "meru",
  step: number,
): number {
  const world = createProjectileWorld(characterId);
  world.update(step, frame([], ["attack"]));
  const afterLaunch = world.effects.spawnCount;
  advanceAtStep(world, 0.4, step);
  return world.effects.spawnCount - afterLaunch;
}

describe("normal attack presentation", () => {
  it("spawns Kyle's short double blade arc without changing the hit count", () => {
    const world = new GameWorld({
      initialPhase: "playing",
      random: () => 0.5,
    });
    const enemy = world.enemies[0];
    if (!enemy) throw new Error("Expected an enemy.");
    enemy.armor = 0;
    enemy.pos = {
      x: world.active.pos.x + 17,
      y: world.active.pos.y,
    };
    const hpBefore = enemy.hp;

    world.update(1 / 60, frame([], ["attack"]));

    const arc = world.effects.effects.find(
      (effect) => effect.active && effect.kind === "bladeArc",
    );
    const hitSparks = world.effects.effects.filter(
      (effect) => effect.active && effect.kind === "spark",
    );
    expect(arc).toEqual(
      expect.objectContaining({
        maxLife: NORMAL_ATTACK_EFFECTS.kyle.slashLife,
        size: NORMAL_ATTACK_EFFECTS.kyle.slashSize,
        color: NORMAL_ATTACK_EFFECTS.kyle.outerColor,
      }),
    );
    expect(hitSparks).toHaveLength(
      NORMAL_ATTACK_EFFECTS.kyle.hitSparkCount +
        NORMAL_ATTACK_EFFECTS.kyle.hitFragmentCount,
    );
    expect(enemy.hp).toBe(hpBefore - 18);

    advanceAtStep(world, 0.22, 1 / 60);
    expect(
      world.effects.effects.some(
        (effect) => effect.active && effect.kind === "bladeArc",
      ),
    ).toBe(false);
    expect(enemy.hp).toBe(hpBefore - 18);
  });

  it("does not emit a character hit effect when Kyle misses", () => {
    const world = new GameWorld({
      initialPhase: "playing",
      random: () => 0.5,
    });

    world.update(1 / 60, frame([], ["attack"]));

    expect(
      world.effects.effects.some(
        (effect) => effect.active && effect.kind === "bladeArc",
      ),
    ).toBe(true);
    expect(
      world.effects.effects.some(
        (effect) =>
          effect.active &&
          (effect.kind === "spark" ||
            effect.kind === "impactRing" ||
            effect.kind === "phosphorMote"),
      ),
    ).toBe(false);
  });

  it("keeps armored Kyle hits restrained and leaves stone fragments visible", () => {
    const world = new GameWorld({
      initialPhase: "playing",
      random: () => 0.5,
    });
    const enemy = createEnemy(3, "iwaUroko", 505, 178);
    world.enemies[2] = enemy;
    enemy.pos = {
      x: world.active.pos.x + 17,
      y: world.active.pos.y,
    };

    world.update(1 / 60, frame([], ["attack"]));

    expect(
      world.effects.effects.filter(
        (effect) => effect.active && effect.kind === "dust",
      ),
    ).toHaveLength(2);
    expect(
      world.effects.effects.filter(
        (effect) => effect.active && effect.kind === "spark",
      ),
    ).toHaveLength(3);
  });

  it("spawns distinct Nadi and Meru launch and trail shapes", () => {
    const nadiWorld = createProjectileWorld("nadi");
    nadiWorld.update(1 / 60, frame([], ["attack"]));
    expect(
      nadiWorld.effects.effects.some(
        (effect) =>
          effect.active &&
          effect.kind === "impactRing" &&
          effect.maxLife === NORMAL_ATTACK_EFFECTS.nadi.launchLife,
      ),
    ).toBe(true);
    expect(
      nadiWorld.effects.effects.some(
        (effect) => effect.active && effect.kind === "moonTrail",
      ),
    ).toBe(true);

    const meruWorld = createProjectileWorld("meru");
    const mpBefore = meruWorld.active.mp;
    meruWorld.update(1 / 60, frame([], ["attack"]));
    expect(
      meruWorld.effects.effects.some(
        (effect) =>
          effect.active &&
          effect.kind === "impactRing" &&
          effect.maxLife === NORMAL_ATTACK_EFFECTS.meru.launchLife,
      ),
    ).toBe(true);
    expect(
      meruWorld.effects.effects.some(
        (effect) => effect.active && effect.kind === "phosphorMote",
      ),
    ).toBe(true);
    expect(meruWorld.active.mp).toBe(mpBefore);
  });

  it("generates nearly equal trail counts at 30fps and 60fps", () => {
    const nadi30 = countTrailSpawns("nadi", 1 / 30);
    const nadi60 = countTrailSpawns("nadi", 1 / 60);
    const meru30 = countTrailSpawns("meru", 1 / 30);
    const meru60 = countTrailSpawns("meru", 1 / 60);

    expect(Math.abs(nadi30 - nadi60)).toBeLessThanOrEqual(1);
    expect(Math.abs(meru30 - meru60)).toBeLessThanOrEqual(1);
    expect(nadi60).toBeLessThanOrEqual(11);
    expect(meru60).toBeLessThanOrEqual(9);
  });

  it("initializes trail timers both initially and when a pooled projectile is reused", () => {
    expect(createProjectilePool()[0]?.trailTimer).toBe(0);
    const world = createProjectileWorld("nadi");
    world.update(1 / 60, frame([], ["attack"]));
    const projectile = world.projectiles.find(
      (item) => item.active && item.kind === "moonBlade",
    );
    if (!projectile) throw new Error("Expected a moon blade.");
    projectile.trailTimer = 99;
    projectile.active = false;
    world.active.cooldowns.normal = 0;

    world.update(1 / 60, frame([], ["attack"]));

    const reused = world.projectiles.find(
      (item) => item.active && item.kind === "moonBlade",
    );
    expect(reused).toBe(projectile);
    expect(reused?.trailTimer).toBeCloseTo(
      NORMAL_ATTACK_EFFECTS.nadi.trailInterval - 1 / 60,
    );
  });

  it("preserves the moon blade return and phosphor weak homing behavior", () => {
    const nadiWorld = createProjectileWorld("nadi");
    nadiWorld.update(1 / 60, frame([], ["attack"]));
    const moonBlade = nadiWorld.projectiles.find(
      (item) => item.active && item.kind === "moonBlade",
    );
    if (!moonBlade) throw new Error("Expected a moon blade.");
    expect(Math.hypot(moonBlade.velocity.x, moonBlade.velocity.y)).toBeCloseTo(154);
    expect(moonBlade.radius).toBe(7);
    expect(moonBlade.maxLife).toBe(0.92);
    advanceAtStep(nadiWorld, 0.5, 1 / 60);
    expect(moonBlade.returning).toBe(true);
    expect(Math.hypot(moonBlade.velocity.x, moonBlade.velocity.y)).toBeCloseTo(176);

    const meruWorld = new GameWorld({
      initialPhase: "playing",
      random: () => 0.5,
    });
    meruWorld.activeId = "meru";
    const target = meruWorld.enemies[0];
    if (!target) throw new Error("Expected an enemy.");
    target.pos = {
      x: meruWorld.active.pos.x + 70,
      y: meruWorld.active.pos.y + 45,
    };
    meruWorld.active.facing = { x: 1, y: 0 };
    meruWorld.update(1 / 60, frame([], ["attack"]));
    const phosphor = meruWorld.projectiles.find(
      (item) => item.active && item.kind === "phosphor",
    );
    if (!phosphor) throw new Error("Expected a phosphor bolt.");
    expect(phosphor.radius).toBe(4);
    expect(phosphor.maxLife).toBe(1.25);
    expect(phosphor.damage).toBe(13);
    expect(phosphor.velocity.y).toBeGreaterThan(0);
    expect(phosphor.velocity.y).toBeLessThan(5);
  });

  it("keeps effect storage bounded and honors accessibility helpers", () => {
    const pool = new EffectPool();
    for (let index = 0; index < EFFECT_POOL_SIZE * 3; index += 1) {
      pool.spawn({
        kind: index % 2 === 0 ? "moonTrail" : "phosphorMote",
        pos: { x: index, y: 0 },
      });
    }

    expect(pool.effects).toHaveLength(EFFECT_POOL_SIZE);
    expect(pool.effects.filter((effect) => effect.active)).toHaveLength(
      EFFECT_POOL_SIZE,
    );
    expect(resolveNormalEffectCoreColor("#ffffff", "#9fb8b0", false)).toBe(
      "#9fb8b0",
    );
    expect(resolveImpactShake(1.25, 3, false)).toBe(1.25);
    expect(resolveImpactShake(0, 1, ACCESSIBILITY.screenShake)).toBe(
      ACCESSIBILITY.screenShake ? 2.4 : 0,
    );
  });
});
