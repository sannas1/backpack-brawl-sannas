import { skipReplay } from "./game";
import { CATALOG } from "./items";
import { GOLD_PER_ROUND, runOutcome, START_GOLD, START_LIVES, WINS_TO_VICTORY } from "./run";
import { BACKPACK_SIZE, SHOP_SIZE } from "./shop";
import type { GameState, Phase, RunState } from "./types";

/**
 * Save & resume (B6).
 *
 * What is saved: the run id, whether the run was sent to the hall of fame, the phase and the
 * whole run (round, gold, lives, wins, seed, shop, backpack).
 *
 * Refresh policy:
 * - During a search: back to the shop, search again. Every round has a fixed opponent and the
 *   shop is saved, so this gives no free reroll and no other opponent.
 * - During a battle replay: the result is already decided. We always save the run *with the
 *   result applied*, so after a refresh the battle counts and you continue with the next round
 *   (or the end screen). Refreshing can't avoid a loss or give a second result.
 * - Broken, old or impossible saves are thrown away and the start page is shown.
 */

export const SAVE_KEY = "backpack-brawl-save";
/** Increase when the saved shape changes; older saves are then ignored. */
export const SAVE_VERSION = 3;

export const SEARCH_INTERRUPTED = "Your search was interrupted by the refresh. Search again — it's the same opponent.";
export const BATTLE_INTERRUPTED = "You refreshed during the battle. It was already decided and has been counted.";

export interface SaveData {
  version: number;
  runId: string;
  /** Already sent to the hall of fame? Saved so a refresh can't send it twice. */
  submitted: boolean;
  phase: Phase;
  run: RunState;
}

export function toSaveData(game: GameState): SaveData {
  // During a battle, save the run as it will be after the battle (skipReplay applies the result once).
  const run = game.phase === "battle" ? skipReplay(game).run : game.run;
  return { version: SAVE_VERSION, runId: game.runId, submitted: game.submitted, phase: game.phase, run };
}

/** Turns saved data back into a game, or returns `null` if it is broken, incompatible or impossible. */
export function fromSaveData(data: unknown): GameState | null {
  if (!isObject(data) || data.version !== SAVE_VERSION || !isValidRun(data.run)) return null;
  if (typeof data.runId !== "string" || data.runId === "" || typeof data.submitted !== "boolean") return null;

  const run = data.run;
  const over = runOutcome(run) !== null;
  if (data.submitted && !over) return null; // only finished runs can be in the hall of fame

  const game: GameState = { runId: data.runId, phase: "shop", run, battle: null, error: null, searchId: null, submitted: data.submitted };
  if (over) return { ...game, phase: "finished" };

  switch (data.phase) {
    case "shop":
      return game;
    case "searching":
      return { ...game, error: SEARCH_INTERRUPTED };
    case "battle":
      return { ...game, error: BATTLE_INTERRUPTED };
    default:
      return null; // "finished" with a run that isn't over, or an unknown phase
  }
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
  // Selling always returns less than the price, so gold can never be more than the rounds paid out.
  if (gold > START_GOLD + GOLD_PER_ROUND * (round - 1)) return false;

  if (!Array.isArray(shop) || shop.length !== SHOP_SIZE || !shop.every((offer) => offer === null || isItemId(offer))) return false;

  if (!Array.isArray(backpack) || backpack.length !== BACKPACK_SIZE) return false;
  const uids = new Set<string>();
  for (const slot of backpack) {
    if (slot === null) continue;
    if (!isObject(slot) || typeof slot.uid !== "string" || !isItemId(slot.itemId)) return false;
    const number = /^item-(\d+)$/.exec(slot.uid);
    if (!number || Number(number[1]) >= nextUid || uids.has(slot.uid)) return false; // unique and already handed out
    uids.add(slot.uid);
  }

  // Every finished round was one battle: battles = round - 1, or = round if the last battle ended the run.
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
