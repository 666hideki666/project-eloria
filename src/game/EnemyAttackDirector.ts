import { ENEMY_AI } from "../config";
import type { EnemyState } from "./types";

/**
 * Grants a small number of attack tokens and keeps a separate ready queue.
 * Archetypes such as `swarm` may opt into a higher local concurrency limit.
 */
export class EnemyAttackDirector {
  private readonly activeIds = new Set<number>();
  private readonly readyIds = new Set<number>();
  private grantCooldown = 0;
  private lastGrantedId = 0;

  public update(delta: number, enemies: readonly EnemyState[]): void {
    this.grantCooldown = Math.max(0, this.grantCooldown - delta);

    for (const enemy of enemies) {
      if (this.activeIds.has(enemy.id)) {
        enemy.tokenAge += delta;
        const tokenExpired =
          enemy.tokenAge >= ENEMY_AI.tokenMaxDuration &&
          enemy.aiState !== "windup" &&
          enemy.aiState !== "attack";
        if (!enemy.alive || !enemy.aware || tokenExpired) {
          this.release(enemy.id);
        }
      }
      if (!enemy.alive || !enemy.aware) this.readyIds.delete(enemy.id);
    }

    this.purgeInvalidIds(enemies);
    const eligible = this.getEligible(enemies);

    if (this.grantCooldown <= 0) {
      const candidate = this.pickNext(
        eligible.filter((enemy) => !this.activeIds.has(enemy.id)),
      );
      if (candidate && this.canGrant(candidate)) this.grant(candidate);
    }

    this.fillReadyQueue(eligible);
    for (const enemy of enemies) {
      enemy.hasAttackToken = this.activeIds.has(enemy.id);
      enemy.isReadySlot = this.readyIds.has(enemy.id);
    }
  }

  public release(enemyId: number): void {
    if (!this.activeIds.delete(enemyId)) return;
    this.grantCooldown = Math.max(
      this.grantCooldown,
      ENEMY_AI.minAttackInterval,
    );
  }

  public remove(enemyId: number): void {
    this.activeIds.delete(enemyId);
    this.readyIds.delete(enemyId);
  }

  public reset(enemies: readonly EnemyState[] = []): void {
    this.activeIds.clear();
    this.readyIds.clear();
    this.grantCooldown = 0;
    this.lastGrantedId = 0;
    for (const enemy of enemies) {
      enemy.hasAttackToken = false;
      enemy.isReadySlot = false;
      enemy.tokenAge = 0;
    }
  }

  public hasToken(enemyId: number): boolean {
    return this.activeIds.has(enemyId);
  }

  private getEligible(enemies: readonly EnemyState[]): EnemyState[] {
    return enemies
      .filter(
        (enemy) =>
          enemy.alive &&
          enemy.aware &&
          (enemy.aiState === "reposition" || enemy.aiState === "approach"),
      )
      .sort((a, b) => a.id - b.id);
  }

  private canGrant(candidate: EnemyState): boolean {
    if (this.activeIds.size < ENEMY_AI.meleeAttackSlots) return true;
    const override =
      ENEMY_AI.behavior[candidate.archetype].maxConcurrentAttackers;
    return this.activeIds.size < override;
  }

  private grant(enemy: EnemyState): void {
    this.readyIds.delete(enemy.id);
    this.activeIds.add(enemy.id);
    enemy.tokenAge = 0;
    enemy.hasAttackToken = true;
    this.lastGrantedId = enemy.id;
    this.grantCooldown = ENEMY_AI.minAttackInterval;
  }

  private fillReadyQueue(eligible: readonly EnemyState[]): void {
    for (const readyId of [...this.readyIds]) {
      if (
        !eligible.some((enemy) => enemy.id === readyId) ||
        this.activeIds.has(readyId)
      ) {
        this.readyIds.delete(readyId);
      }
    }

    while (this.readyIds.size < ENEMY_AI.readySlots) {
      const candidate = this.pickNext(
        eligible.filter(
          (enemy) =>
            !this.activeIds.has(enemy.id) && !this.readyIds.has(enemy.id),
        ),
      );
      if (!candidate) break;
      this.readyIds.add(candidate.id);
    }
  }

  private pickNext(candidates: readonly EnemyState[]): EnemyState | null {
    if (candidates.length === 0) return null;
    return (
      candidates.find((enemy) => enemy.id > this.lastGrantedId) ??
      candidates[0] ??
      null
    );
  }

  private purgeInvalidIds(enemies: readonly EnemyState[]): void {
    const validIds = new Set(
      enemies.filter((enemy) => enemy.alive).map((enemy) => enemy.id),
    );
    for (const id of [...this.activeIds]) {
      if (!validIds.has(id)) this.activeIds.delete(id);
    }
    for (const id of [...this.readyIds]) {
      if (!validIds.has(id)) this.readyIds.delete(id);
    }
  }
}
