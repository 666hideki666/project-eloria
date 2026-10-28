import { describe, expect, it } from "vitest";
import { COMBAT } from "../src/config";
import { GameWorld } from "../src/game/GameWorld";
import { createEnemy } from "../src/game/entities";
import type { ActionName, InputFrame } from "../src/game/types";

function frame(action?: ActionName): InputFrame {
  return {
    move: { x: 0, y: 0 },
    pressed: new Set(action ? [action] : []),
    held: new Set(action === "attack" ? ["attack"] : []),
    mode: "keyboard",
  };
}

function advance(world: GameWorld, seconds: number): void {
  for (let step = 0; step < Math.round(seconds * 60); step += 1) {
    world.update(1 / 60, frame());
  }
}

function quietWorld(mode: "arena" | "stage" = "stage"): GameWorld {
  const world = new GameWorld({ mode, initialPhase: "playing", random: () => 0.99 });
  if (mode === "arena") {
    // Keep the arena from entering its cleared phase during a long idle test.
    const spectator = createEnemy(50, "mossPlun", 550, 100);
    spectator.hp = 999;
    spectator.maxHp = 999;
    spectator.aiState = "windup";
    spectator.stateTimer = 999;
    world.enemies = [spectator];
  } else {
    world.enemies = [];
  }
  return world;
}

describe("continuous three-stage technique gauge", () => {
  it("fills every character by play time in exploration and combat, then caps at three", () => {
    expect(COMBAT.techSecondsPerSegment).toBe(5);
    for (const mode of ["arena", "stage"] as const) {
      const world = quietWorld(mode);
      advance(world, 2.5);
      for (const member of world.party) expect(member.techCharge).toBeCloseTo(0.5, 5);
      advance(world, 2.5);
      for (const member of world.party) expect(member.techCharge).toBeCloseTo(1, 5);
      advance(world, 10);
      for (const member of world.party) expect(member.techCharge).toBe(3);
      advance(world, 2);
      for (const member of world.party) expect(member.techCharge).toBe(3);
    }
  });

  it("does not award an instant charge for a normal hit or a miss", () => {
    const world = quietWorld("arena");
    const kyle = world.active;
    kyle.facing = { x: 1, y: 0 };
    const enemy = createEnemy(1, "mossPlun", kyle.pos.x + 20, kyle.pos.y);
    enemy.hp = 999;
    enemy.maxHp = 999;
    world.enemies = [enemy];
    world.update(0, frame("attack"));
    expect(enemy.hp).toBeLessThan(999);
    expect(kyle.techCharge).toBe(0);
    world.enemies = [];
    kyle.cooldowns.normal = 0;
    world.update(0, frame("attack"));
    expect(kyle.techCharge).toBe(0);
  });

  it("spends only on K/L activation and preserves the fractional remainder", () => {
    const world = quietWorld();
    const kyle = world.active;
    world.update(0, frame("special"));
    world.update(0, frame("ultimate"));
    expect(kyle.techCharge).toBe(0);
    expect(kyle.cooldowns.special).toBe(0);
    expect(kyle.cooldowns.ultimate).toBe(0);

    kyle.techCharge = 1.6;
    world.update(0, frame("special"));
    expect(kyle.techCharge).toBeCloseTo(0.6, 6);
    expect(kyle.actionKind).toBe("special");
    world.update(0, frame("ultimate"));
    expect(kyle.techCharge).toBeCloseTo(0.6, 6);

    advance(world, 2.5);
    expect(kyle.techCharge).toBeCloseTo(1.1, 5);
    world.update(0, frame("special"));
    expect(kyle.techCharge).toBeCloseTo(0.1, 5);
    kyle.techCharge = 3;
    world.update(0, frame("ultimate"));
    expect(kyle.techCharge).toBe(0);
    expect(kyle.actionKind).toBe("ultimate");
    advance(world, 2.5);
    expect(kyle.techCharge).toBeCloseTo(0.5, 5);
  });

  it("stops during intro, pause, dialogue, and hit-stop, then resumes", () => {
    const intro = new GameWorld({ initialPhase: "intro", random: () => 0.99 });
    advance(intro, 1);
    expect(intro.active.techCharge).toBe(0);

    const world = quietWorld();
    advance(world, 2.5);
    expect(world.active.techCharge).toBeCloseTo(0.5, 5);
    world.togglePause();
    advance(world, 2);
    expect(world.active.techCharge).toBeCloseTo(0.5, 5);
    world.togglePause();
    world.hitStop = 0.2;
    world.update(0.05, frame());
    expect(world.active.techCharge).toBeCloseTo(0.5, 5);
    world.hitStop = 0;
    advance(world, 2.5);
    expect(world.active.techCharge).toBeCloseTo(1, 5);
    world.setDialogueForQa("crystal-touch");
    const beforeDialogue = world.active.techCharge;
    advance(world, 1);
    expect(world.active.techCharge).toBe(beforeDialogue);
  });

  it("retains each character's fractional charge across switches and resets on retry", () => {
    const world = quietWorld();
    advance(world, 2.5);
    world.active.techCharge = 1.6;
    world.switchCharacter(true);
    expect(world.activeId).toBe("nadi");
    expect(world.active.techCharge).toBeCloseTo(0.5, 5);
    expect(world.party.find((member) => member.id === "kyle")?.techCharge).toBeCloseTo(1.6, 5);
    advance(world, 2.5);
    expect(world.party.find((member) => member.id === "kyle")?.techCharge).toBeCloseTo(2.1, 5);
    expect(world.active.techCharge).toBeCloseTo(1, 5);
    world.retryArena();
    expect(world.party.every((member) => member.techCharge === 0)).toBe(true);
  });

  it("uses one segment for Meru's manual heal and no segment for automatic heal", () => {
    const world = quietWorld("arena");
    const meru = world.party.find((member) => member.id === "meru");
    if (!meru) throw new Error("Missing Meru");
    world.activeId = "meru";
    meru.techCharge = 1.6;
    meru.mp = 0;
    meru.hp -= 35;
    world.update(0, frame("special"));
    expect(meru.techCharge).toBeCloseTo(0.6, 6);
    expect(meru.mp).toBe(0);
    expect(meru.hp).toBeGreaterThan(meru.maxHp - 35);

    world.activeId = "kyle";
    world.active.hp = 20;
    meru.techCharge = 2.4;
    meru.mp = meru.maxMp;
    meru.cooldowns.autoHeal = 0;
    world.update(1 / 60, frame());
    expect(meru.techCharge).toBeCloseTo(2.4 + 1 / 300, 5);
    expect(meru.mp).toBeLessThan(meru.maxMp);
  });
});
