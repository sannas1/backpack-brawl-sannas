import { describe, expect, it } from "vitest";
import { buildFighter, buildOpponentFighter, POISON_INTERVAL, simulateBattle } from "./battle";
import { activeSets, FIRE_BURN_STACKS, GUARDIAN_START_BLOCK } from "./sets";
import type { Fighter } from "./types";

/** A fighter with one custom item, so each test controls the numbers exactly. */
function fighter(name: string, maxHp: number, effects: Fighter["items"][number]["effects"], cooldown = 1): Fighter {
  return { name, maxHp, sets: [], items: [{ itemId: "test", name: `${name}'s item`, icon: "❔", cooldown, effects }] };
}

/** An opponent that does nothing for the whole battle. */
const dummy = (maxHp = 1000): Fighter => ({ name: "Dummy", maxHp, items: [], sets: [] });

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

describe("B4 sets", () => {
  it("activates a set bonus with 2 or more items of the set", () => {
    expect(activeSets(["fire-torch"])).toEqual([]);
    expect(activeSets(["fire-torch", "fire-bomb"])).toEqual(["fire"]);
    expect(activeSets(["oak-buckler", "pot-lid", "fire-torch", "fire-torch"])).toEqual(["fire", "guardian"]);
  });

  it("Guardian: starts the battle with extra block, for opponents too", () => {
    const opponent = buildOpponentFighter({ id: "x", name: "X", icon: "❔", hp: 30, round: 1, items: ["oak-buckler", "pot-lid"] });
    const result = simulateBattle(fighter("Hero", 40, {}, 100), opponent);
    expect(result.frames[0].opponent.block).toBe(GUARDIAN_START_BLOCK);
    expect(result.frames[0].player.block).toBe(0);
  });

  it("Fire: no burn with only one Fire item", () => {
    const result = simulateBattle(buildFighter(["fire-torch"], 40, "Hero"), dummy());
    expect(result.events.some((e) => e.kind === "burn")).toBe(false);
  });

  it("Fire: burn hurts every tick, is absorbed by block and decays", () => {
    // Fire Torch (cooldown 3) + Fire Bomb (cooldown 7): first burn at tick 3.
    const hero = buildFighter(["fire-torch", "fire-bomb"], 40, "Hero");
    const result = simulateBattle(hero, dummy());
    const burns = result.events.filter((e) => e.kind === "burn-tick");
    expect(result.frames[3].opponent.burn).toBe(FIRE_BURN_STACKS);
    expect(burns[0].tick).toBe(4);
    expect(burns[0].amount).toBe(FIRE_BURN_STACKS);
    expect(result.frames[4].opponent.burn).toBe(FIRE_BURN_STACKS - 1); // decayed by 1

    // Against block, burn is absorbed first.
    const wall: Fighter = { ...dummy(), sets: ["guardian"] };
    const blocked = simulateBattle(hero, wall).events.find((e) => e.kind === "burn-tick")!;
    expect(blocked.message).toContain("blocked");
  });
});
