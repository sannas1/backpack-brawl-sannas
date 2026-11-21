# Backpack Brawl

Backpack Brawl is a small browser-based inventory auto-battler. You are a travelling hero entering the arena with nothing but an empty backpack and a few coins. Between fights you buy items in a shop and pack them into your backpack. The fights themselves run on their own: every item in the backpack fires whenever its cooldown is up, and you watch the battle play out.

This is a partially completed starter for the Advanced Web Development practical exam. It is playable, but it is not yet a finished game. Investigate its existing behavior and extend it according to the requirements.

## How the game works

### The run

A run is a series of rounds. Every round you shop, then fight one opponent.

| Rule | Value |
|---|---:|
| Lives at the start | 3 |
| Wins needed for victory | 5 |
| Starting gold | 10 🪙 |
| Gold at the start of every new round | +5 🪙 |
| Hero base HP | 40 |

A won battle gives +1 win, a lost battle costs one life. The run ends with a victory screen after the fifth win, or a game-over screen when the last life is gone. Unspent gold and the whole backpack carry over from round to round. Opponents get tougher every round.

### Shop and backpack

- The shop shows **4 offers**, rolled from the catalog at the start of every round. The same offer may appear more than once.
- **Buy** pays the price and puts the item into the first free slot of the backpack. A bought offer is marked as sold until the next round. Buying is not possible when the backpack is full.
- **Reroll** (1 🪙) replaces all offers with a new seeded roll.
- **Sell**: select a backpack item and sell it for half its price (rounded down).
- The backpack is a **2×3 grid** (2 columns, 3 rows, 6 slots), and every item takes exactly one slot. Select an item and click another slot to move it; on an occupied slot the two items swap. Esc or Cancel ends the selection. Hover over an item to see its details.
- Only items in the backpack fight. Their position in the grid does not matter.

Shop rolls are driven by a seeded random number generator stored in the run state, so the same seed always produces the same offers.

### Battles

Press **Find opponent** to request this round's opponent from the local API. The request is deliberately slow, so there is a short "searching" phase. While searching, the shop and the backpack are locked.

Once the opponent arrives, the whole battle is simulated at once and then replayed on screen, one step every 250 ms. **Skip** jumps straight to the end. The result is applied to the run when the replay reaches its last step; the button below the result then leads to the next round's shop or to the end screen.

Battle time runs in **ticks of 0.5 s**:

- Every item has a **cooldown** in ticks. Each tick, every item charges by one. When the charge reaches the cooldown, the item fires and starts charging again.
- **Damage** hits the enemy. **Block** absorbs incoming damage first. Only the rest is lost from HP. Unused block stays for the rest of the battle.
- A fighter at 0 HP is knocked out. If both fall in the same tick, the hero loses.
- A battle lasts at most **60 ticks (30 s)**. If time runs out, the fighter with the higher share of their max HP wins. A tie counts as a loss for the hero.

The battle screen shows HP and block for both fighters, their items, a timer, and a combat log. Hover over values to see an explanation of each rule.

### Item catalog

| Item | Price | Cooldown (ticks) | Effect |
|---|---:|---:|---|
| 🗡️ Chipped Dagger | 2 | 4 | 3 damage |
| 🏹 Hunting Bow | 4 | 4 | 5 damage |
| 🪓 Iron Cleaver | 5 | 8 | 12 damage |
| 🛡️ Oak Buckler | 3 | 5 | +4 block |
| 🍳 Pot Lid | 2 | 3 | +2 block |
| ⚔️ Spiked Shield | 4 | 6 | 3 damage, +3 block |
| 🧪 Venom Vial | 3 | 5 | +2 poison |
| 🐍 Viper Fang | 4 | 4 | 2 damage, +1 poison |
| 🍄 Toxic Spores | 5 | 7 | +3 poison |
| 🌿 Healing Herb | 2 | 5 | heal 3 |
| 🩸 Troll Blood | 4 | 6 | heal 6 |
| 🔰 Blessed Shield | 5 | 6 | +3 block, heal 3 |
| 🔥 Fire Torch | 3 | 3 | 2 damage |
| 🔨 Magma Hammer | 5 | 5 | 5 damage |
| 💣 Fire Bomb | 4 | 7 | 7 damage |

### Status effects

| Status | How it works |
|---|---|
| ☠️ Poison | Every 2 ticks (1 s): 1 HP per stack. Ignores block, never wears off. |
| 💚 Heal | Restores own HP, never above max HP. |
| 🔥 Burn | Every tick (0.5 s): 1 damage per stack, block absorbs it first, then −1 stack. |

Order of one tick: poison and burn first, then items fire (player first).

### Item sets (bonus with 2+ items of a set, for player and opponents)

| Set | Items | Bonus |
|---|---|---|
| 🔥 Fire | Fire Torch, Magma Hammer, Fire Bomb | Every Fire item that fires also adds 4 burn to the enemy |
| 🏰 Guardian | Oak Buckler, Pot Lid, Spiked Shield | Start every battle with 6 block |

### Saving

The run is saved in `localStorage` after every action. Refresh during a search → back to the shop, search again (same opponent). Refresh during a battle → the battle was already decided: its result counts once and you continue with the next round (or the end screen). Broken or outdated saves are discarded.

### Hall of fame

At the end of a run you can enter your name. The page `/hall-of-fame` lists the best runs: victories first, then more wins, then fewer rounds. The "How it works" panel in the shop summarises these rules in the game itself.

## Current starter features

- A start page, a shop page, a battle page and a result page, each with its own URL.
- A run with rounds, gold, lives and wins, ending in victory or defeat.
- A seeded shop with buying.
- A fixed 2×3 backpack grid with item tooltips.
- A deterministic battle simulation with damage and block.
- A replayed battle view with HP and block bars, a timer, a combat log and a skip button.
- A delayed local opponent API with success and failure responses.
- Tooltips and a rules panel explaining every mechanic.
- A responsive React interface styled with Tailwind CSS.

Automated tests (Vitest) live next to the code they test (`src/*.test.ts`, `server/*.test.js`). Our quality goals and a manual test checklist are in [docs/QUALITY.md](docs/QUALITY.md), the development diary is [DIARY.md](DIARY.md) (PDF: [docs/DIARY.pdf](docs/DIARY.pdf)). A technical walkthrough of every requirement (in German) is in [docs/TECHNICAL.html](docs/TECHNICAL.html).

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm (comes with Node).

```bash
npm install
npm run dev
```

Open the game at **`http://localhost:5174`**. The API runs at `http://localhost:4200` (opening that in the browser only shows "Cannot GET /", which is normal). During development Vite forwards every `/api` request to the API, so the frontend only ever calls relative `/api/...` URLs.

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite frontend and the Express API together |
| `npm run server` | Start only the API on port 4200 |
| `npm run build` | Type-check and create a production frontend build |
| `npm run lint` | Run ESLint over the project |
| `npm run test` | Run all Vitest tests once |
| `npm run preview` | Preview a previously created production build |

## API

- `GET /api/health`
- `GET /api/opponents?round=1`
- `GET /api/hall-of-fame`, `POST /api/hall-of-fame`

The opponent for each round is fixed. Add `?latency=2500` to change the delay (default 1200 ms, at most 5000 ms) or `?fail=true` to force a failed request. Starting the server with `API_FAIL=true` makes every opponent request fail.

See [docs/API.md](docs/API.md) for the full contract.

## Project orientation

Game rules live in plain TypeScript modules that do not depend on React. Every rule function takes the current state and returns a new one.

- `src/types.ts` defines items, the run, opponents, phases, battle frames and events, and the overall game state.
- `src/items.ts` contains the item catalog and the effect labels.
- `src/shop.ts` contains the seeded random number generator, shop rolls and the backpack size.
- `src/run.ts` contains the run rules: starting values, buying, round progression and win/loss.
- `src/battle.ts` turns item lists into fighters and contains the battle simulation (`simulateBattle`).
- `src/game.ts` contains the phase transitions of a run (`shop → searching → battle → shop … → finished`), the replay steps and the mapping from phase to page.
- `src/sets.ts` contains the item sets, their bonus values and `activeSets`.
- `src/save.ts` saves, loads and validates the game in `localStorage`.
- `src/rules.ts` builds the rule explanations and tooltips from the game constants.
- `src/api.ts` contains the opponent HTTP request.
- `src/state/` holds the game state for all pages (`GameProvider`, `useGame`) and `RequireRoute`, which redirects every page to the one matching the current phase.
- `src/pages/` contains one component per screen; `src/App.tsx` defines the routes.
- `src/components/` contains the presentational parts: run header, shop, backpack, item card, rules panel, fight bar, battle view and end-of-run screen.
- `server/index.js` implements the local API; `server/opponents.js` contains the opponent table; `server/hallOfFame.js` stores and validates hall-of-fame runs.
