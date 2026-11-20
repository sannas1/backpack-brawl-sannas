import { describe, expect, it } from "vitest";
import { buyBlocker, buyItem, moveBlocker, moveItem, newRun, REROLL_COST, rerollShop, sellItem, sellPrice } from "./run";
import type { RunState } from "./types";

/** A run with a fixed shop so the tests don't depend on the random roll. */
function testRun(changes: Partial<RunState> = {}): RunState {
  return { ...newRun(42), shop: ["chipped-dagger", "iron-cleaver", "pot-lid", "hunting-bow"], ...changes };
}

const countItems = (run: RunState) => run.backpack.filter(Boolean).length;

describe("B1 shop economy", () => {
  it("buying moves exactly one item into the backpack and pays its price", () => {
    const run = buyItem(testRun(), 0);
    expect(run.gold).toBe(10 - 2);
    expect(countItems(run)).toBe(1);
    expect(run.shop[0]).toBeNull();
  });

  it("selling gives half the price rounded down and removes the item", () => {
    const bought = buyItem(testRun(), 1); // Iron Cleaver, price 5
    const slot = bought.backpack.findIndex(Boolean);
    const sold = sellItem(bought, slot);
    expect(sellPrice("iron-cleaver")).toBe(2);
    expect(sold.gold).toBe(bought.gold + 2);
    expect(countItems(sold)).toBe(0);
  });

  it("selling an empty slot changes nothing", () => {
    const run = testRun();
    expect(sellItem(run, 0)).toBe(run);
  });

  it("cannot buy when the backpack is full (item would be lost)", () => {
    const full = testRun({ gold: 100, backpack: Array.from({ length: 6 }, (_, i) => ({ uid: `x${i}`, itemId: "pot-lid" })) });
    expect(buyBlocker(full, 0)).toBe("Backpack is full");
    expect(buyItem(full, 0)).toBe(full);
  });

  it("gold never becomes negative", () => {
    const poor = testRun({ gold: 1 });
    expect(buyItem(poor, 1)).toBe(poor);
    const broke = testRun({ gold: 0 });
    expect(rerollShop(broke)).toBe(broke);
  });

  it("reroll costs 1 gold, gives new offers and is deterministic", () => {
    const run = newRun(7);
    const a = rerollShop(run);
    const b = rerollShop(run);
    expect(a.gold).toBe(run.gold - REROLL_COST);
    expect(a.seed).not.toBe(run.seed);
    expect(a.shop).toEqual(b.shop);
  });
});

describe("B2 backpack arrangement", () => {
  const twoItems = () => buyItem(buyItem(testRun(), 0), 2); // dagger in slot 0, pot lid in slot 1

  it("moves an item to an empty slot", () => {
    const run = moveItem(twoItems(), 0, 5);
    expect(run.backpack[0]).toBeNull();
    expect(run.backpack[5]?.itemId).toBe("chipped-dagger");
  });

  it("swaps two items when the target slot is occupied", () => {
    const before = twoItems();
    const run = moveItem(before, 0, 1);
    expect(run.backpack[0]).toEqual(before.backpack[1]);
    expect(run.backpack[1]).toEqual(before.backpack[0]);
    expect(countItems(run)).toBe(2);
  });

  it("rejects moving from an empty slot, onto itself or outside the grid", () => {
    const run = twoItems();
    expect(moveBlocker(run, 4, 0)).toBe("Nothing to move");
    expect(moveBlocker(run, 0, 0)).toBe("Already in this slot");
    expect(moveItem(run, 0, 99)).toBe(run);
  });
});
