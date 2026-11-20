/**
 * Hand-built opponents, one per round. A run lasts at most 7 rounds (5 wins + 3 lives − 1),
 * so the table covers every round. Item ids must exist in src/items.ts.
 * Rounds past the table reuse the last opponent with more HP (see `opponentForRound`).
 */
export const OPPONENTS = [
  { id: "mossback-hermit", name: "Mossback Hermit", icon: "🐢", hp: 25, items: ["chipped-dagger", "pot-lid"] },
  { id: "grave-tinker", name: "Grave Tinker", icon: "🦴", hp: 36, items: ["hunting-bow", "chipped-dagger", "oak-buckler"] },
  { id: "tollgate-ogre", name: "Tollgate Ogre", icon: "👹", hp: 44, items: ["hunting-bow", "viper-fang", "chipped-dagger", "oak-buckler"] },
  { id: "rusted-knight", name: "Rusted Knight", icon: "🪖", hp: 46, items: ["iron-cleaver", "hunting-bow", "chipped-dagger", "oak-buckler", "pot-lid"] },
  { id: "pit-gladiator", name: "Pit Gladiator", icon: "🦁", hp: 50, items: ["iron-cleaver", "hunting-bow", "chipped-dagger", "oak-buckler", "healing-herb"] },
  { id: "ash-golem", name: "Ash Golem", icon: "🗿", hp: 56, items: ["iron-cleaver", "hunting-bow", "spiked-shield", "chipped-dagger", "oak-buckler"] },
  { id: "hollow-king", name: "Hollow King", icon: "👑", hp: 64, items: ["iron-cleaver", "hunting-bow", "venom-vial", "spiked-shield", "oak-buckler", "troll-blood"] },
];

/** Extra HP per round past the end of the table. */
export const HP_PER_EXTRA_ROUND = 6;
/** Item added per round past the end of the table (only while there is room, see `MAX_ITEMS`). */
export const EXTRA_ITEM = "chipped-dagger";
/** Opponents never carry more items than the player's backpack can hold (2×3). */
export const MAX_ITEMS = 6;

/** Deterministic opponent for a 1-based round number. */
export function opponentForRound(round) {
  const last = OPPONENTS[OPPONENTS.length - 1];
  const base = OPPONENTS[round - 1] ?? last;
  const extra = Math.max(0, round - OPPONENTS.length);
  const items = [...base.items, ...Array(extra).fill(EXTRA_ITEM)].slice(0, MAX_ITEMS);
  return { ...base, round, hp: base.hp + extra * HP_PER_EXTRA_ROUND, items };
}

/** Parses `?round=`; returns a positive integer or `null` if invalid. */
export function parseRound(value) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const round = Number(value);
  return Number.isSafeInteger(round) && round >= 1 ? round : null;
}
