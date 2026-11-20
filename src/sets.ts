import { getItem } from "./items";
import type { SetId } from "./types";

/** A set bonus is active while a fighter has at least this many items of the set. */
export const SET_BONUS_MIN_ITEMS = 2;
/** Fire bonus: burn stacks added to the enemy every time a Fire item fires. */
export const FIRE_BURN_STACKS = 4;
/** Guardian bonus: block the fighter starts the battle with. */
export const GUARDIAN_START_BLOCK = 6;

export interface SetDef {
  id: SetId;
  name: string;
  icon: string;
  /** Short explanation of the bonus, shown in badges, tooltips and the rules panel. */
  bonus: string;
}

export const SETS: Record<SetId, SetDef> = {
  fire: {
    id: "fire",
    name: "Fire",
    icon: "🔥",
    bonus: `Every Fire item that fires also adds ${FIRE_BURN_STACKS} 🔥 burn to the enemy.`,
  },
  guardian: {
    id: "guardian",
    name: "Guardian",
    icon: "🏰",
    bonus: `Start every battle with ${GUARDIAN_START_BLOCK} 🛡️ block.`,
  },
};

export const SET_IDS = Object.keys(SETS) as SetId[];

/** How many items of each set are in the list, e.g. `{ fire: 2, guardian: 0 }`. */
export function countSets(itemIds: string[]): Record<SetId, number> {
  const counts = { fire: 0, guardian: 0 };
  for (const id of itemIds) {
    const set = getItem(id).set;
    if (set) counts[set] += 1;
  }
  return counts;
}

/** The sets whose bonus is active for these items. Works the same for the player and opponents. */
export function activeSets(itemIds: string[]): SetId[] {
  const counts = countSets(itemIds);
  return SET_IDS.filter((id) => counts[id] >= SET_BONUS_MIN_ITEMS);
}
