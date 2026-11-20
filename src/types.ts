export interface ItemEffects {
  damage?: number;
  block?: number;
  /** Poison stacks added to the enemy. */
  poison?: number;
  /** HP restored to the item's owner (never above max HP). */
  heal?: number;
}

/** Item sets; collecting 2 items of a set activates its bonus (see sets.ts). */
export type SetId = "fire" | "guardian";

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  price: number;
  /** Cooldown in battle ticks (1 tick = 0.5 s). */
  cooldown: number;
  effects: ItemEffects;
  set?: SetId;
}

/** A concrete item the player owns; several instances may share one `itemId`. */
export interface ItemInstance {
  uid: string;
  itemId: string;
}

/** Fixed-size grid, row by row; `null` marks a free slot. */
export type Backpack = (ItemInstance | null)[];

/** Shop offers by item id; `null` marks an offer that was already bought. */
export type ShopOffers = (string | null)[];

export type Phase = "shop" | "searching" | "battle" | "finished";

export interface RunState {
  round: number;
  gold: number;
  lives: number;
  wins: number;
  /** Seed for the next shop roll — keeps every shop deterministic. */
  seed: number;
  shop: ShopOffers;
  backpack: Backpack;
  /** Counter for generating unique `ItemInstance.uid`s. */
  nextUid: number;
}

export interface Opponent {
  id: string;
  name: string;
  icon: string;
  hp: number;
  round: number;
  items: string[];
}

export type Side = "player" | "opponent";

export interface FighterSnapshot {
  hp: number;
  maxHp: number;
  block: number;
  poison: number;
  burn: number;
}

/** `poison-tick` / `burn-tick` are the damage a fighter takes from its stacks. */
export type BattleEventKind = "damage" | "block" | "poison" | "heal" | "burn" | "poison-tick" | "burn-tick";

export interface BattleEvent {
  tick: number;
  /** Who caused the event. */
  source: Side;
  /** Who is affected by it. */
  target: Side;
  kind: BattleEventKind;
  amount: number;
  /** Emoji shown in the combat log (the item, or the status effect). */
  icon: string;
  message: string;
}

export interface BattleFrame {
  tick: number;
  player: FighterSnapshot;
  opponent: FighterSnapshot;
  /** Events that happened during this tick. */
  events: BattleEvent[];
}

export interface BattleResult {
  winner: Side;
  reason: "knockout" | "timeout";
  frames: BattleFrame[];
  events: BattleEvent[];
}

/** An item as it fights: the catalog values it brings into battle. */
export interface FighterItem {
  itemId: string;
  name: string;
  icon: string;
  cooldown: number;
  effects: ItemEffects;
  set?: SetId;
}

/** Everything `simulateBattle` needs to know about one side. */
export interface Fighter {
  name: string;
  maxHp: number;
  items: FighterItem[];
  /** Sets whose bonus is active for this fighter. */
  sets: SetId[];
}

/** A simulated battle being replayed frame by frame. */
export interface BattleReplay {
  opponent: Opponent;
  player: Fighter;
  enemy: Fighter;
  result: BattleResult;
  /** Index into `result.frames` that is currently shown. */
  frame: number;
}

/** Everything the UI needs: the run plus where in the round loop we are. */
export interface GameState {
  /** Unique id of this run; lets the server reject a second submission of the same run. */
  runId: string;
  phase: Phase;
  run: RunState;
  /** Set while `phase === "battle"`. */
  battle: BattleReplay | null;
  /** Last opponent-search error, shown in the shop. */
  error: string | null;
  /** Id of the running opponent search; only its answer may start a battle. */
  searchId: string | null;
  /** True once this run was sent to the hall of fame. */
  submitted: boolean;
}

/** One finished run as sent to the hall of fame. */
export interface RunSubmission {
  runId: string;
  name: string;
  outcome: "victory" | "defeat";
  wins: number;
  lives: number;
  rounds: number;
}

/** One row of the hall of fame as returned by the API. */
export interface HallOfFameEntry {
  rank: number;
  name: string;
  outcome: "victory" | "defeat";
  wins: number;
  lives: number;
  rounds: number;
  submittedAt: string;
}
