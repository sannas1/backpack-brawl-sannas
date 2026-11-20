import { describe, expect, it } from "vitest";
import { buildFighter, POISON_INTERVAL, simulateBattle } from "./battle";
import type { Fighter } from "./types";

/** A fighter with one custom item, so each test controls the numbers exactly. */
function fighter(name: string, maxHp: number, effects: Fighter["items"][number]["effects"], cooldown = 1): Fighter {
  return { name, maxHp, items: [{ itemId: "test", name: `${name}'s item`, icon: "❔", cooldown, effects }] };
}

/** An opponent that does nothing for the whole battle. */
const dummy = (maxHp = 1000): Fighter => ({ name: "Dummy", maxHp, items: [] });

describe("battle basics", () => {
  it("is deterministic", () => {
    const a = buildFighter(["hunting-bow", "venom-vial"], 40, "Hero");
    const b = buildFighter(["iron-cleaver", "healing-herb"], 40, "Enemy");
    expect(simulateBattle(a, b)).toEqual(simulateBattle(a, b));
  });
});

describe("B3 poison", () => {
  it("stacks up and hurts every POISON_INTERVAL ticks for every stack", () => {
    const result = simulateBattle(fighter("Hero", 40, { poison: 1 }), dummy());
    // Tick 1 adds 1 stack, tick 2 adds 1 stack, and at tick 2 poison has hit for 1 (stacks before the items fire).
    const ticks = result.events.filter((e) => e.kind === "poison-tick");
    expect(ticks[0].tick).toBe(POISON_INTERVAL);
    expect(ticks[0].amount).toBe(1);
    expect(ticks[1].amount).toBe(3); // tick 4: 3 stacks
  });

  it("ignores block", () => {
    const poisoner = fighter("Hero", 40, { poison: 5 });
    const wall = fighter("Wall", 50, { block: 10 });
    const result = simulateBattle(poisoner, wall);
    const firstTick = result.events.find((e) => e.kind === "poison-tick")!;
    const frame = result.frames[firstTick.tick];
    expect(frame.opponent.block).toBeGreaterThan(0); // the wall has block…
    expect(frame.opponent.hp).toBe(50 - firstTick.amount); // …but poison went straight to HP
  });
});

describe("B3 heal", () => {
  it("never heals above max HP", () => {
    const result = simulateBattle(fighter("Hero", 40, { heal: 5 }), dummy());
    for (const frame of result.frames) expect(frame.player.hp).toBeLessThanOrEqual(40);
    expect(result.events.find((e) => e.kind === "heal")?.amount).toBe(0); // already at full HP
  });

  it("restores lost HP", () => {
    const attacker = fighter("Enemy", 100, { damage: 4 }, 1);
    const healer = fighter("Hero", 40, { heal: 3 }, 1);
    const result = simulateBattle(healer, attacker);
    // After tick 1: hero hit by 4 (40 → 36), heal was resolved first at full HP (0), so 36.
    // After tick 2: +3 heal then -4 → 35.
    expect(result.frames[1].player.hp).toBe(36);
    expect(result.frames[2].player.hp).toBe(35);
  });
});
