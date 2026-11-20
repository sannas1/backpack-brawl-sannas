import { isValidOpponent } from "./api";
import { buildOpponentFighter, buildPlayerFighter, simulateBattle } from "./battle";
import { isReplayDone } from "./game";
import { CATALOG } from "./items";
import { applyBattleResult, GOLD_PER_ROUND, runOutcome, START_GOLD, START_LIVES, WINS_TO_VICTORY } from "./run";
import { BACKPACK_SIZE, SHOP_SIZE } from "./shop";
import type { GameState, Opponent, Phase, RunState } from "./types";

/**
 * Save & resume (B6).
 *
 * What is saved: the phase, the whole run (gold, lives, wins, round, seed, shop, backpack)
 * and, during a battle, the opponent plus whether its result was already applied.
 * The battle itself is not saved: it is deterministic, so it is simulated again on load.
 *
 * Refresh policy:
 * - During a search: you are back in the shop and can search again. The opponent of a round
 *   is always the same and the shop is saved, so this gives no advantage.
 * - During a battle replay: the result is already decided. On load the replay jumps to the end
 *   and the result is applied (once). Refreshing can't avoid a loss or give a second result.
 * - Broken, old or impossible saves are thrown away and the start page is shown.
 */

export const SAVE_KEY = "backpack-brawl-save";
/** Increase when the saved shape changes; older saves are then ignored. */
export const SAVE_VERSION = 1;

export const SEARCH_INTERRUPTED = "Your search was interrupted by the refresh. Search again — you will meet the same challenger.";

export interface SaveData {
  version: number;
  phase: Phase;
  run: RunState;
  /** Opponent of the battle being replayed (only in phase "battle"). */
  opponent: Opponent | null;
  /** True if the battle result was already applied to `run`. */
  resultApplied: boolean;
}

export function toSaveData(game: GameState): SaveData {
  return {
    version: SAVE_VERSION,
    phase: game.phase,
    run: game.run,
    opponent: game.battle?.opponent ?? null,
    resultApplied: game.battle ? isReplayDone(game.battle) : false,
  };
}

/** Turns saved data back into a game, or returns `null` if it is broken, incompatible or impossible. */
export function fromSaveData(data: unknown): GameState | null {
  if (!isObject(data) || data.version !== SAVE_VERSION || !isValidRun(data.run)) return null;
  const run = data.run;
  const over = runOutcome(run) !== null;
  const base: GameState = { phase: "shop", run, battle: null, error: null, searchId: null };

  switch (data.phase) {
    case "shop":
      return over ? null : base;
    case "searching":
      return over ? null : { ...base, error: SEARCH_INTERRUPTED };
    case "finished":
      return over ? { ...base, phase: "finished" } : null;
    case "battle":
      return restoreBattle(base, data.opponent, data.resultApplied === true);
    default:
      return null;
  }
}

/** Rebuilds a battle at its last frame; applies the result if that hadn't happened before the refresh. */
function restoreBattle(base: GameState, opponent: unknown, resultApplied: boolean): GameState | null {
  if (!isValidOpponent(opponent)) return null;
  const { run } = base;
  const over = runOutcome(run) !== null;

  // The opponent must belong to this run's round: the current one if the result is still open,
  // otherwise the previous round (or the current one if that battle ended the run).
  const expectedRound = resultApplied && !over ? run.round - 1 : run.round;
  if (opponent.round !== expectedRound || (!resultApplied && over)) return null;

  const player = buildPlayerFighter(run.backpack);
  const enemy = buildOpponentFighter(opponent);
  const result = simulateBattle(player, enemy);
  const battle = { opponent, player, enemy, result, frame: result.frames.length - 1 };
  const finalRun = resultApplied ? run : applyBattleResult(run, result.winner);
  return { ...base, phase: "battle", run: finalRun, battle };
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isInt = (value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
const isItemId = (value: unknown) => CATALOG.some((item) => item.id === value);

/** Checks types, ranges and that the numbers fit together (a possible run). */
export function isValidRun(value: unknown): value is RunState {
  if (!isObject(value)) return false;
  const { round, gold, lives, wins, seed, shop, backpack, nextUid } = value;
  if (!isInt(round, 1) || !isInt(gold, 0) || !isInt(lives, 0, START_LIVES) || !isInt(wins, 0, WINS_TO_VICTORY)) return false;
  if (!isInt(seed, 0, 2 ** 32) || !isInt(nextUid, 1)) return false;
  // Selling always returns less than the price, so gold can never exceed what the rounds paid out.
  if (gold > START_GOLD + GOLD_PER_ROUND * (round - 1)) return false;

  if (!Array.isArray(shop) || shop.length !== SHOP_SIZE || !shop.every((offer) => offer === null || isItemId(offer))) return false;

  if (!Array.isArray(backpack) || backpack.length !== BACKPACK_SIZE) return false;
  const uids = new Set<string>();
  for (const slot of backpack) {
    if (slot === null) continue;
    if (!isObject(slot) || typeof slot.uid !== "string" || !isItemId(slot.itemId)) return false;
    const number = /^item-(\d+)$/.exec(slot.uid);
    if (!number || Number(number[1]) >= nextUid || uids.has(slot.uid)) return false; // unique, already handed out
    uids.add(slot.uid);
  }

  // Every finished round was a win or a loss: battles = round - 1, or = round if the last battle ended the run.
  const battles = wins + (START_LIVES - lives);
  const over = wins >= WINS_TO_VICTORY || lives <= 0;
  return battles === round - 1 || (over && battles === round);
}

/** Loads the saved game; anything unusable is removed and `null` (start page) is returned. */
export function loadGame(storage: Storage = localStorage): GameState | null {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw === null) return null;
    const game = fromSaveData(JSON.parse(raw));
    if (!game) storage.removeItem(SAVE_KEY);
    return game;
  } catch {
    storage.removeItem(SAVE_KEY);
    return null;
  }
}

export function saveGame(game: GameState, storage: Storage = localStorage) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(toSaveData(game)));
  } catch {
    // Storage full or blocked (e.g. private mode): the game still works, it just isn't saved.
  }
}
