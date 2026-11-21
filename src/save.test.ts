import { describe, expect, it } from "vitest";
import { newGame, startBattle, startSearch } from "./game";
import { buyItem } from "./run";
import { BATTLE_INTERRUPTED, loadGame, SAVE_KEY, SAVE_VERSION, saveGame, SEARCH_INTERRUPTED, toSaveData } from "./save";
import type { GameState, Opponent } from "./types";

/** Minimal in-memory stand-in for localStorage. */
function fakeStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  };
}

const opponent: Opponent = { id: "x", name: "Dummy", icon: "❔", hp: 1, round: 1, items: [] };

function readyGame(): GameState {
  const game = newGame(1);
  return { ...game, run: buyItem({ ...game.run, shop: ["chipped-dagger", null, null, null] }, 0) };
}

/** Save and load once, like a browser refresh. */
const refresh = (game: GameState) => {
  const storage = fakeStorage();
  saveGame(game, storage);
  return loadGame(storage);
};

describe("B6 save and resume", () => {
  it("restores the shop exactly (no free reroll)", () => {
    const game = readyGame();
    expect(refresh(game)).toEqual(game);
  });

  it("a refresh during a search goes back to the shop with a message", () => {
    const restored = refresh(startSearch(readyGame(), "a"))!;
    expect(restored.phase).toBe("shop");
    expect(restored.error).toBe(SEARCH_INTERRUPTED);
  });

  it("a refresh during a battle replay counts the result exactly once", () => {
    const battle = startBattle(startSearch(readyGame(), "a"), opponent, "a");
    expect(battle.run.wins).toBe(0); // the replay has just started
    const restored = refresh(battle)!;
    expect(restored.phase).toBe("shop"); // continue with the next round
    expect(restored.run.round).toBe(2);
    expect(restored.run.wins).toBe(1); // the dummy is knocked out → +1 win
    expect(restored.error).toBe(BATTLE_INTERRUPTED);
    expect(refresh(restored)!.run.wins).toBe(1); // a second refresh doesn't count it again
  });

  it("falls back to the start page for broken, old or impossible saves", () => {
    const good = toSaveData(readyGame());
    const bad = [
      "not json {",
      JSON.stringify(null),
      JSON.stringify({ ...good, version: SAVE_VERSION + 1 }),
      JSON.stringify({ ...good, phase: "dancing" }),
      JSON.stringify({ ...good, run: { ...good.run, gold: -5 } }),
      JSON.stringify({ ...good, run: { ...good.run, gold: 9999 } }),
      JSON.stringify({ ...good, run: { ...good.run, wins: 3 } }), // 3 wins in round 1 is impossible
      JSON.stringify({ ...good, run: { ...good.run, backpack: [] } }),
      JSON.stringify({ ...good, run: { ...good.run, shop: ["no-such-item", null, null, null] } }),
      JSON.stringify({ ...good, submitted: true }), // a run still in progress can't be in the hall of fame
      JSON.stringify({ ...good, runId: 42 }),
    ];
    for (const raw of bad) {
      const storage = fakeStorage({ [SAVE_KEY]: raw });
      expect(loadGame(storage)).toBeNull();
      expect(storage.getItem(SAVE_KEY)).toBeNull(); // broken save is removed
    }
  });
});
