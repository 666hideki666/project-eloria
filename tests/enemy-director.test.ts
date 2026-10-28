import { describe, expect, it } from "vitest";
import { ENEMY_AI } from "../src/config";
import { EnemyAttackDirector } from "../src/game/EnemyAttackDirector";
import { createArenaEnemies } from "../src/game/entities";

describe("EnemyAttackDirector", () => {
  it("grants one tutorial attack token, keeps one ready slot, and rotates", () => {
    const enemies = createArenaEnemies();
    for (const enemy of enemies) {
      enemy.aware = true;
      enemy.aiState = "reposition";
    }
    const director = new EnemyAttackDirector();

    director.update(0.01, enemies);
    const firstAttacker = enemies.find((enemy) => enemy.hasAttackToken);
    expect(firstAttacker).toBeDefined();
    expect(enemies.filter((enemy) => enemy.hasAttackToken)).toHaveLength(1);
    expect(enemies.filter((enemy) => enemy.isReadySlot)).toHaveLength(1);

    director.release(firstAttacker?.id ?? -1);
    director.update(ENEMY_AI.minAttackInterval - 0.1, enemies);
    expect(enemies.filter((enemy) => enemy.hasAttackToken)).toHaveLength(0);

    director.update(0.11, enemies);
    const secondAttacker = enemies.find((enemy) => enemy.hasAttackToken);
    expect(secondAttacker).toBeDefined();
    expect(secondAttacker?.id).not.toBe(firstAttacker?.id);
  });

  it("keeps future swarm concurrency as a data-driven override", () => {
    expect(ENEMY_AI.behavior.swarm.maxConcurrentAttackers).toBeGreaterThan(
      ENEMY_AI.meleeAttackSlots,
    );
    expect(ENEMY_AI.behavior.spacing.optimalDistance).toBeGreaterThan(
      ENEMY_AI.behavior.basicMelee.optimalDistance,
    );
  });
});
