import { buildOpponentFighter, buildPlayerFighter, simulateBattle } from "./battle";
import { applyBattleResult, newRun, runOutcome } from "./run";
import { itemIdsOf } from "./shop";
import type { BattleReplay, GameState, Opponent, RunState } from "./types";

/**
 * Phase transitions of one run: shop → searching → battle → shop … → finished.
 * Every function is pure, so they can be passed straight to `setState`.
 */

export function newGame(seed: number, runId: string = crypto.randomUUID()): GameState {
  return { runId, phase: "shop", run: newRun(seed), battle: null, error: null, searchId: null, submitted: false };
}

/** Applies a shop/backpack action; only allowed while shopping. */
export function updateRun(game: GameState, action: (run: RunState) => RunState): GameState {
  if (game.phase !== "shop") return game;
  const run = action(game.run);
  return run === game.run ? game : { ...game, run };
}

/** Why the player can't look for an opponent right now, or `null` if they can. */
export function fightBlocker(game: GameState): string | null {
  if (game.phase === "searching") return "Searching…";
  if (game.phase !== "shop") return "Only possible in the shop";
  if (itemIdsOf(game.run.backpack).length === 0) return "Buy at least one item first";
  return null;
}

/** Starts a search with a fresh id. Only one search can run at a time. */
export function startSearch(game: GameState, searchId: string): GameState {
  if (fightBlocker(game) !== null) return game;
  return { ...game, phase: "searching", error: null, searchId };
}

/** True if an answer belongs to the search that is running right now. Late or duplicate answers return false. */
export function isCurrentSearch(game: GameState, searchId: string): boolean {
  return game.phase === "searching" && game.searchId === searchId;
}

/** A failed search unlocks the shop again and shows why, so the player can retry. */
export function searchFailed(game: GameState, error: string, searchId: string): GameState {
  if (!isCurrentSearch(game, searchId)) return game; // a stale failure must not touch a newer state
  return { ...game, phase: "shop", error: `${error} Try again.`, searchId: null };
}

/**
 * Simulates the battle against `opponent` and starts its replay at the first frame.
 * Ignored unless the answer is for the running search and for the current round.
 */
export function startBattle(game: GameState, opponent: Opponent, searchId: string): GameState {
  if (!isCurrentSearch(game, searchId)) return game;
  if (opponent.round !== game.run.round) return searchFailed(game, "The arena sent a challenger for the wrong round.", searchId);
  const player = buildPlayerFighter(game.run.backpack);
  const enemy = buildOpponentFighter(opponent);
  const result = simulateBattle(player, enemy);
  return { ...game, phase: "battle", searchId: null, battle: { opponent, player, enemy, result, frame: 0 } };
}

export const isReplayDone = (battle: BattleReplay) => battle.frame >= battle.result.frames.length - 1;

/** Shows the given frame; reaching the last frame applies the battle result to the run (exactly once). */
export function showFrame(game: GameState, frame: number): GameState {
  const { battle } = game;
  if (game.phase !== "battle" || !battle || isReplayDone(battle)) return game;
  const last = battle.result.frames.length - 1;
  const next = { ...battle, frame: Math.min(Math.max(frame, battle.frame), last) };
  if (!isReplayDone(next)) return { ...game, battle: next };
  return { ...game, battle: next, run: applyBattleResult(game.run, battle.result.winner) };
}

export const advanceReplay = (game: GameState) => showFrame(game, (game.battle?.frame ?? 0) + 1);
export const skipReplay = (game: GameState) => showFrame(game, Infinity);

/** Leaves a finished replay: back to the shop, or to the end screen if the run is over. */
export function leaveBattle(game: GameState): GameState {
  if (game.phase !== "battle" || !game.battle || !isReplayDone(game.battle)) return game;
  return { ...game, phase: runOutcome(game.run) ? "finished" : "shop", battle: null };
}

/** Marks the run as sent to the hall of fame, so it is never sent again. */
export function markSubmitted(game: GameState): GameState {
  return game.phase === "finished" ? { ...game, submitted: true } : game;
}

/** URL paths of the app's screens. */
export const ROUTES = { start: "/", shop: "/shop", battle: "/battle", result: "/result", hallOfFame: "/hall-of-fame" } as const;
/** Pages that follow the game phase (the hall of fame is always reachable). */
export type GameRoute = (typeof ROUTES)["start" | "shop" | "battle" | "result"];

/**
 * The screen that matches the game's phase. Shop, battle and result pages
 * redirect here when they don't match, so the URL always follows the phase.
 */
export function routeForGame(game: GameState | null): GameRoute {
  if (!game) return ROUTES.start;
  switch (game.phase) {
    case "shop":
    case "searching":
      return ROUTES.shop;
    case "battle":
      return ROUTES.battle;
    case "finished":
      return ROUTES.result;
  }
}
