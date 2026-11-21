import { BURN_DAMAGE_PER_STACK, BURN_DECAY, HERO_BASE_HP, MAX_TICKS, POISON_DAMAGE_PER_STACK, POISON_INTERVAL, TICK_SECONDS } from "./battle";
import { SET_BONUS_MIN_ITEMS, SETS } from "./sets";
import { GOLD_PER_ROUND, REROLL_COST, START_GOLD, START_LIVES, WINS_TO_VICTORY } from "./run";
import { BACKPACK_COLS, BACKPACK_ROWS, SHOP_SIZE } from "./shop";
import type { ItemEffects } from "./types";

/**
 * Player-facing explanations of the rules. Built from the game constants so
 * the texts stay correct when numbers are rebalanced.
 */

const BATTLE_SECONDS = MAX_TICKS * TICK_SECONDS;
const POISON_SECONDS = POISON_INTERVAL * TICK_SECONDS;

/** Tooltip per item effect. */
export const EFFECT_HELP: Record<keyof ItemEffects, string> = {
  damage: "Damage: hits the enemy. Block absorbs it first, the rest is lost from HP.",
  block: "Block: absorbs incoming damage until used up. Unused block stays for the rest of the battle.",
  poison: `Poison: adds stacks to the enemy. Every ${POISON_SECONDS} s they lose ${POISON_DAMAGE_PER_STACK} HP per stack. Ignores block, stacks up and never wears off.`,
  heal: "Heal: restores your own HP, but never above your max HP.",
};

export const COOLDOWN_HELP = `Cooldown: the item fires every time this much battle time has passed (1 tick = ${TICK_SECONDS} s).`;

/** Tooltip per fighter status shown in battle. */
export const STATUS_HELP = {
  hp: "HP: reaching 0 is a knockout.",
  block: EFFECT_HELP.block,
  poison: EFFECT_HELP.poison,
  burn: `Burn: every ${TICK_SECONDS} s a burning fighter takes ${BURN_DAMAGE_PER_STACK} damage per stack (block absorbs it first), then loses ${BURN_DECAY} stack until it wears off.`,
  timer: `After ${BATTLE_SECONDS} s the fighter with the higher share of HP wins; a tie counts as your loss.`,
};

export interface RuleSection {
  title: string;
  rules: string[];
}

export const RULES: RuleSection[] = [
  {
    title: "🏆 The run",
    rules: [
      `Reach ${WINS_TO_VICTORY} wins before you lose all ${START_LIVES} lives.`,
      `Each battle is one round: a win gives +1 win, a loss costs 1 life.`,
      `Opponents get tougher every round.`,
    ],
  },
  {
    title: "🏪 Shop & backpack",
    rules: [
      `You start with ${START_GOLD} 🪙 and earn ${GOLD_PER_ROUND} 🪙 at the start of every new round. Unspent gold carries over.`,
      `The shop offers ${SHOP_SIZE} new items every round. Reroll them for ${REROLL_COST} 🪙.`,
      `Select an item in your backpack to sell it for half its price (rounded down).`,
      `Bought items go to the first free slot of your ${BACKPACK_COLS}×${BACKPACK_ROWS} backpack. Select an item and click another slot to move it there; on an occupied slot the two items swap.`,
      `Only items in your backpack fight. Their position doesn't matter.`,
    ],
  },
  {
    title: "⚔️ Battle",
    rules: [
      `Battles run on their own. Your hero has ${HERO_BASE_HP} HP; every item fires whenever its cooldown is up.`,
      `Damage hits block first; only the rest is lost from HP. Unused block stays for the rest of the battle.`,
      `Knock the enemy out to win. ${STATUS_HELP.timer} If both fall at once, you lose.`,
    ],
  },
  {
    title: "🧪 Status effects",
    rules: [
      `☠️ ${EFFECT_HELP.poison}`,
      `💚 ${EFFECT_HELP.heal}`,
      `🔥 ${STATUS_HELP.burn} Burn stacks faster and hurts more often than poison, but block stops it and it fades.`,
      `Order of a tick (${TICK_SECONDS} s): first poison and burn hurt, then items fire (your items first).`,
    ],
  },
  {
    title: "💾 Saving",
    rules: [
      "Your run is saved in this browser after every action. Refresh and you continue on the same screen.",
      "Refresh while searching: you are back in the shop and search again. Every round has a fixed opponent, so you meet the same one.",
      "Refresh during a battle: the result is already decided and counts. You continue with the next round.",
      "A broken or outdated save is thrown away and you start on the start page.",
    ],
  },
  {
    title: "🧩 Item sets",
    rules: [
      `Some items belong to a set. With ${SET_BONUS_MIN_ITEMS} or more items of a set in a backpack, its bonus is active — for opponents too.`,
      ...Object.values(SETS).map((set) => `${set.icon} ${set.name}: ${set.bonus}`),
    ],
  },
];
