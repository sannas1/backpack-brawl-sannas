import { describe, expect, it } from "vitest";
import { fightBlocker, newGame, searchFailed, skipReplay, startBattle, startSearch, updateRun } from "./game";
import { buyItem } from "./run";
import type { GameState, Opponent } from "./types";

const opponent = (round = 1): Opponent => ({ id: "x", name: "Dummy", icon: "❔", hp: 1, round, items: [] });

/** A new game where the player already bought one item, so a search is allowed. */
function readyGame(): GameState {
  const game = newGame(1);
  const run = { ...game.run, shop: ["chipped-dagger", null, null, null] };
  return { ...game, run: buyItem(run, 0) };
}

describe("B5 matchmaking", () => {
  it("cannot start a second search while one is running", () => {
    const searching = startSearch(readyGame(), "a");
    expect(fightBlocker(searching)).toBe("Searching…");
    expect(startSearch(searching, "b")).toBe(searching);
  });

  it("locks shop and backpack while searching", () => {
    const searching = startSearch(readyGame(), "a");
    expect(updateRun(searching, (run) => ({ ...run, gold: 999 }))).toBe(searching);
  });

  it("starts the battle only for the running search", () => {
    const searching = startSearch(readyGame(), "a");
    expect(startBattle(searching, opponent(), "old").phase).toBe("searching");
    expect(startBattle(searching, opponent(), "a").phase).toBe("battle");
  });

  it("ignores a duplicate answer once the battle has started", () => {
    const battle = startBattle(startSearch(readyGame(), "a"), opponent(), "a");
    expect(startBattle(battle, opponent(), "a")).toBe(battle);
  });

  it("never starts a battle without a search", () => {
    const game = readyGame();
    expect(startBattle(game, opponent(), "a")).toBe(game);
  });

  it("rejects an opponent for another round", () => {
    const result = startBattle(startSearch(readyGame(), "a"), opponent(2), "a");
    expect(result.phase).toBe("shop");
    expect(result.error).toMatch(/wrong round/);
  });

  it("a failed search returns to a usable shop with a message", () => {
    const failed = searchFailed(startSearch(readyGame(), "a"), "Server down.", "a");
    expect(failed.phase).toBe("shop");
    expect(failed.error).toBe("Server down.");
    expect(fightBlocker(failed)).toBeNull(); // can try again
  });

  it("a late failure does not touch a newer state", () => {
    const battle = startBattle(startSearch(readyGame(), "a"), opponent(), "a");
    expect(searchFailed(battle, "late", "a")).toBe(battle);
  });

  it("applies a battle result only once", () => {
    const battle = startBattle(startSearch(readyGame(), "a"), opponent(), "a");
    const done = skipReplay(battle);
    expect(skipReplay(done)).toBe(done);
    expect(done.run.wins + (3 - done.run.lives)).toBe(1);
  });
});
