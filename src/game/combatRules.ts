import { COMBAT, PARTY_ORDER } from "../config";
import type { CharacterId, CharacterState } from "./types";

export function findNextLivingCharacter(
  party: readonly CharacterState[],
  current: CharacterId,
): CharacterId | null {
  const start = PARTY_ORDER.indexOf(current);
  for (let offset = 1; offset <= PARTY_ORDER.length; offset += 1) {
    const id = PARTY_ORDER[(start + offset) % PARTY_ORDER.length];
    const candidate = party.find((member) => member.id === id);
    if (candidate && !candidate.downed && candidate.hp > 0) return candidate.id;
  }
  return null;
}

export function lowestHealthMember(
  party: readonly CharacterState[],
  includeFull = false,
): CharacterState | null {
  const living = party.filter((member) => !member.downed && member.hp > 0);
  const sorted = [...living].sort(
    (a, b) => a.hp / a.maxHp - b.hp / b.maxHp,
  );
  const lowest = sorted[0] ?? null;
  if (!includeFull && lowest && lowest.hp >= lowest.maxHp) return null;
  return lowest;
}

export function canMeruAutoHeal(
  party: readonly CharacterState[],
  activeId: CharacterId,
): boolean {
  const meru = party.find((member) => member.id === "meru");
  if (!meru || meru.downed || activeId === "meru") return false;
  if (
    meru.mp < COMBAT.autoHeal.mpCost ||
    meru.cooldowns.autoHeal > 0
  ) {
    return false;
  }
  return party.some(
    (member) =>
      !member.downed &&
      member.hp > 0 &&
      member.hp / member.maxHp <= COMBAT.autoHeal.threshold,
  );
}

export function reviveAfterCombat(party: readonly CharacterState[]): void {
  for (const member of party) {
    if (!member.downed) continue;
    member.downed = false;
    member.hp = Math.max(1, Math.ceil(member.maxHp * COMBAT.reviveRatio));
    member.invulnerable = 1;
  }
}

export function restoreForRetry(party: readonly CharacterState[]): void {
  for (const member of party) {
    member.downed = false;
    member.hp = member.maxHp;
    member.mp = member.maxMp;
    member.invulnerable = 1;
    member.barrier = 0;
    member.velocity.x = 0;
    member.velocity.y = 0;
    member.actionTimer = 0;
    member.actionKind = null;
    member.actionDuration = 0;
    member.actionFacing = { ...member.facing };
    member.techCharge = 0;
    member.cooldowns.normal = 0;
    member.cooldowns.special = 0;
    member.cooldowns.ultimate = 0;
    member.cooldowns.autoHeal = 0;
  }
}
