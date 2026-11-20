import { getItem } from "./items";
import { itemIdsOf } from "./shop";
import type { Backpack, BattleEvent, BattleResult, Fighter, FighterItem, FighterSnapshot, Opponent, Side } from "./types";

/** Seconds per battle tick. */
export const TICK_SECONDS = 0.5;
/** Battles that last longer are decided by the timeout rule. */
export const MAX_TICKS = 60;
export const HERO_BASE_HP = 40;

/** Poison hurts every POISON_INTERVAL ticks (= every 1 s). */
export const POISON_INTERVAL = 2;
/** HP lost per poison stack each time poison hurts. Poison ignores block and never wears off. */
export const POISON_DAMAGE_PER_STACK = 1;

/** Turns a list of item ids into a fighter with the catalog values of each item. */
export function buildFighter(itemIds: string[], baseHp: number, name = "Fighter"): Fighter {
  const items: FighterItem[] = itemIds.map((id) => {
    const def = getItem(id);
    return { itemId: def.id, name: def.name, icon: def.icon, cooldown: def.cooldown, effects: { ...def.effects } };
  });
  return { name, maxHp: baseHp, items };
}

/** The player's fighter: every backpack item and the hero's base HP. */
export function buildPlayerFighter(backpack: Backpack): Fighter {
  return buildFighter(itemIdsOf(backpack), HERO_BASE_HP, "Hero");
}

export function buildOpponentFighter(opponent: Opponent): Fighter {
  return buildFighter(opponent.items, opponent.hp, opponent.name);
}

interface FighterState {
  fighter: Fighter;
  hp: number;
  block: number;
  poison: number;
  /** Ticks each item has charged towards its cooldown. */
  charge: number[];
}

type Emit = (event: Omit<BattleEvent, "tick">) => void;

const other = (side: Side): Side => (side === "player" ? "opponent" : "player");

const snapshot = (s: FighterState): FighterSnapshot => ({
  hp: Math.max(0, s.hp),
  maxHp: s.fighter.maxHp,
  block: s.block,
  poison: s.poison,
});

const isDown = (s: FighterState) => s.hp <= 0;

/**
 * Runs a full battle. Pure and deterministic: the same fighters always give
 * the same result.
 *
 * Each tick:
 * 1. Status effects: every POISON_INTERVAL ticks, poisoned fighters lose HP (player first).
 * 2. Each fighter charges all items by one tick; items whose charge reaches their cooldown fire.
 * 3. Fired items resolve (player first, then opponent). Both sides fire "simultaneously":
 *    which items fire is decided before any effect is applied.
 * After step 3 the battle ends if someone is down; if both are down, the player loses.
 * After `MAX_TICKS` the higher HP percentage wins; a tie is a player loss.
 */
export function simulateBattle(player: Fighter, opponent: Fighter): BattleResult {
  const state: Record<Side, FighterState> = {
    player: initState(player),
    opponent: initState(opponent),
  };
  const frames: BattleResult["frames"] = [
    { tick: 0, player: snapshot(state.player), opponent: snapshot(state.opponent), events: [] },
  ];
  const events: BattleEvent[] = [];

  const knockoutWinner = (): Side | null => {
    if (isDown(state.player)) return "opponent";
    if (isDown(state.opponent)) return "player";
    return null;
  };

  let winner: Side | null = null;
  let tick = 0;
  while (winner === null && tick < MAX_TICKS) {
    tick += 1;
    const tickEvents: BattleEvent[] = [];
    const emit: Emit = (event) => tickEvents.push({ tick, ...event });

    // 1. Status effects
    for (const side of ["player", "opponent"] as const) applyStatusEffects(state[side], side, tick, emit);

    // 2. + 3. Items
    const fired: Record<Side, FighterItem[]> = {
      player: chargeItems(state.player),
      opponent: chargeItems(state.opponent),
    };
    for (const side of ["player", "opponent"] as const) {
      for (const item of fired[side]) resolveItem(item, state[side], state[other(side)], side, emit);
    }
    winner = knockoutWinner();

    frames.push({ tick, player: snapshot(state.player), opponent: snapshot(state.opponent), events: tickEvents });
    events.push(...tickEvents);
  }

  if (winner !== null) return { winner, reason: "knockout", frames, events };
  return { winner: timeoutWinner(state.player, state.opponent), reason: "timeout", frames, events };
}

function initState(fighter: Fighter): FighterState {
  return { fighter, hp: fighter.maxHp, block: 0, poison: 0, charge: fighter.items.map(() => 0) };
}

/** Damage over time at the start of a tick. Poison ignores block. */
function applyStatusEffects(self: FighterState, side: Side, tick: number, emit: Emit) {
  if (self.poison > 0 && tick % POISON_INTERVAL === 0) {
    const damage = self.poison * POISON_DAMAGE_PER_STACK;
    self.hp -= damage;
    emit({ source: side, target: side, kind: "poison-tick", amount: damage, icon: "☠️", message: `${self.fighter.name} takes ${damage} poison damage` });
  }
}

/** Advances one tick of cooldowns and returns the items that fire this tick. */
function chargeItems(s: FighterState): FighterItem[] {
  const fired: FighterItem[] = [];
  s.fighter.items.forEach((item, i) => {
    s.charge[i] += 1;
    if (s.charge[i] >= item.cooldown) {
      s.charge[i] = 0;
      fired.push(item);
    }
  });
  return fired;
}

/** Damage that hits block first; only the rest is lost from HP. Returns how much was blocked. */
function hitThroughBlock(target: FighterState, damage: number): number {
  const absorbed = Math.min(target.block, damage);
  target.block -= absorbed;
  target.hp -= damage - absorbed;
  return absorbed;
}

function resolveItem(item: FighterItem, self: FighterState, enemy: FighterState, side: Side, emit: Emit) {
  const { damage, block, poison, heal } = item.effects;
  const base = { source: side, icon: item.icon };
  const enemySide = other(side);

  if (damage) {
    const absorbed = hitThroughBlock(enemy, damage);
    const note = absorbed > 0 ? ` (${absorbed} blocked)` : "";
    emit({ ...base, target: enemySide, kind: "damage", amount: damage, message: `${item.name} hits ${enemy.fighter.name} for ${damage}${note}` });
  }
  if (block) {
    self.block += block;
    emit({ ...base, target: side, kind: "block", amount: block, message: `${item.name} grants ${self.fighter.name} ${block} block` });
  }
  if (poison) {
    enemy.poison += poison;
    emit({ ...base, target: enemySide, kind: "poison", amount: poison, message: `${item.name} poisons ${enemy.fighter.name} (+${poison}, now ${enemy.poison})` });
  }
  if (heal && !isDown(self)) {
    // A knocked-out fighter can't heal back up. Never heal above max HP; the log shows how much was really restored.
    const healed = Math.max(0, Math.min(heal, self.fighter.maxHp - self.hp));
    self.hp += healed;
    emit({ ...base, target: side, kind: "heal", amount: healed, message: `${item.name} heals ${self.fighter.name} for ${healed}` });
  }
}

function timeoutWinner(player: FighterState, opponent: FighterState): Side {
  const ratio = (s: FighterState) => s.hp / s.fighter.maxHp;
  return ratio(player) > ratio(opponent) ? "player" : "opponent";
}
