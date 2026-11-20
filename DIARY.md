# Development Diary – Backpack Brawl

**Team members:** _[TODO: names]_
**Repository:** https://github.com/sannas1/backpack-brawl-sannas

---

## Development overview

**How we organised the work**
- We copied the starter repo into our own private repo and kept the original `init` commit as the starting point.
- We did **one branch per requirement** (`feature/b1-…` to `feature/b7-…`), one clear commit per feature, and merged each branch into `master` with a merge commit. That way every requirement can be found in the history.
- Order: B1 → B2 (both shop/backpack) → B3 → B4 (both battle) → B5 → B6 → B7 (network and saving). Every step ended with `npm test`, `npm run lint` and `npm run build` passing before the merge.

**Who did what** _[TODO: fill in who is responsible for / can best explain which part]_

| Part | Responsible |
|---|---|
| B1 Shop economy, B2 Backpack | _[name]_ |
| B3 Poison/Heal, B4 Sets/Burn | _[name]_ |
| B5 Matchmaking, B6 Save/Resume | _[name]_ |
| B7 Hall of fame (client + server) | _[name]_ |
| Tests, docs, diary | _[name]_ |

**Requirements not implemented:** none. All of B1–B7 and the quality goals ([docs/QUALITY.md](docs/QUALITY.md)) are done.

| Req. | Commit |
|---|---|
| B1 Shop economy | [0479e7a](https://github.com/sannas1/backpack-brawl-sannas/commit/0479e7a) |
| B2 Backpack arrangement | [8c943ca](https://github.com/sannas1/backpack-brawl-sannas/commit/8c943ca) |
| B3 Status effects | [ac3280c](https://github.com/sannas1/backpack-brawl-sannas/commit/ac3280c) |
| B4 Item sets + Burn | [7391804](https://github.com/sannas1/backpack-brawl-sannas/commit/7391804) |
| B5 Resilient matchmaking | [2170c19](https://github.com/sannas1/backpack-brawl-sannas/commit/2170c19) |
| B6 Save and resume | [acb7b1d](https://github.com/sannas1/backpack-brawl-sannas/commit/acb7b1d) |
| B7 Hall of fame | [ac6be58](https://github.com/sannas1/backpack-brawl-sannas/commit/ac6be58) |

---

## Important decisions

### 1. One "blocker" function per action, used by the UI *and* the rule (B1, B2)
Every action has a function that says *why* it is not possible (`buyBlocker`, `sellBlocker`, `rerollBlocker`, `moveBlocker`, `fightBlocker`). The button shows that text and is disabled, and the action function calls the same blocker and returns the unchanged state.
- **Why:** the requirement says the interface must explain the problem *before* trying, and the same rule must protect the action. One function for both means they can't disagree.
- **Found along the way:** the starter let you buy into a **full backpack**. The gold was paid and the item vanished (`backpack[-1]`). We added "Backpack is full" to `buyBlocker` ([0479e7a](https://github.com/sannas1/backpack-brawl-sannas/commit/0479e7a)).

### 2. Burn comes from the Fire *set bonus*, not from an item effect (B4)
Fire items only deal normal damage. When a fighter has 2+ Fire items, every Fire item that fires also adds 4 burn. The Guardian set (existing shield items) gives 6 starting block.
- **Why:** the requirement says "the Fire set adds Burn", so it should really be a reward for collecting the set. All set values live in one file (`src/sets.ts`) and `buildFighter` computes `activeSets` the same way for the player and opponents.
- **Burn vs. poison:** poison hurts every 2 ticks (1 per stack), ignores block and stays forever. Burn hurts **every tick** (more damage), comes in **4 stacks per hit** (stacks faster), **is absorbed by block** and **decays by 1 per tick**. We lowered Toxic Spores from 4 to 3 poison so that burn really stacks faster than any poison item.

### 3. Every opponent search has an id (B5)
`startSearch` stores a `searchId`. `startBattle` and `searchFailed` only do something if that id is still the running search, *and* the opponent is for the current round.
- **Why:** before, a failed search left the game stuck in "searching", and the button could be clicked again during a search. Checking the phase alone wouldn't be enough: an old answer could arrive while a *new* search is running. The id handles this.
- **Alternative we didn't use:** cancelling requests with `AbortController`. That makes the request stop, but it doesn't protect the state if an answer still gets through. The id check is simpler and always works.

### 4. Save the run, *re-simulate* the battle (B6)
We save phase + run (+ the opponent during a battle + "result already applied?"). We do **not** save the battle frames. On load the battle is simulated again, which is possible because the simulation is deterministic.
- **Why:** less data to store and to validate. A faked battle result in localStorage can't be loaded, because the result is always recomputed.
- **Refresh policy:** during a search → back to the shop (same opponent per round, shop is saved → no free reroll). During a replay → jump to the end and apply the result exactly once (no escaping a loss). This is explained in the rules panel ("💾 Saving").
- **Validation:** besides types and ranges, we check that the numbers describe a *possible* run: `wins + lives lost = rounds played`, gold not higher than all gold ever paid out, unique item ids. Anything else is discarded.

### 5. "Never submit twice" on the client *and* the server (B7)
Each run gets a `runId`. The server rejects a second submission of the same id (409). The client stores `submitted` in the (saved) game state and treats a 409 as "already done".
- **Why:** the client alone can't guarantee it (refresh, double click, a lost response after the server already stored the run), and the server alone would show the player an error. Both together are safe and friendly.
- The server also checks plausibility (e.g. a victory needs 5 wins and ≥1 life; `rounds = wins + lost lives`).

---

## Challenges

- **Heal after knockout:** in the first version a fighter at 0 HP could heal back up later in the same tick and survive. Fixed: a knocked-out fighter can't heal.
- **Tick order with statuses:** we had to decide when poison/burn happen. We chose "statuses first, then items" and wrote it in the rules panel and as a comment above `simulateBattle`.
- **Save format changed in B7:** adding `runId`/`submitted` changed the saved shape. We raised `SAVE_VERSION` to 2, so old saves are simply ignored. This is the "incompatible save" case from B6.

---

## Verification

- **44 automated tests** (Vitest): shop/backpack invariants, poison/heal/burn/sets, every search race condition, broken/impossible saves, hall-of-fame validation, duplicates and ordering. Run with `npm test`.
- `npm run lint` and `npm run build` (TypeScript type check) pass.
- API checked by hand with curl (valid run → 201, same run → 409, impossible run → 400, broken JSON → 400).
- Manual checklist for the UI: see [docs/QUALITY.md](docs/QUALITY.md).

---

## AI usage

- **Tool:** Claude Code (Anthropic, model Claude Opus 5.5), used as a coding agent in the terminal.
- **How:** we gave it the starter repository and the requirements. It read the existing code, then implemented the requirements one by one on separate branches, wrote the tests and drafted the documentation and this diary. Commits it made are marked with `Co-Authored-By: Claude`.
- **Why:** AI tools were allowed for the implementation phase, and it let us spend our time on understanding and checking the solution instead of typing.
- **Our part:** we asked for a simple, understandable solution (no extra libraries, small functions, comments explaining *why*). _[TODO: describe what you reviewed or changed yourselves, e.g. tested the UI by hand, adjusted values, asked for explanations of B5/B6.]_
- **Risk we are aware of:** in the exam we have to explain the code without AI. So for every decision above we made sure we understand the *reason*, not only the code.

---

## Final reflection and lessons learned

- **Pure functions pay off:** because the rules don't depend on React, almost everything could be tested with simple unit tests, including the tricky timing cases of B5.
- **Think about "what if this arrives late / twice / broken?"** B5, B6 and B7 were mostly about that, not about new features.
- **One place for numbers:** generating the rule texts from constants meant the explanations never got out of date when we changed values.
- _[TODO: one or two personal sentences: what was hardest for you, what you would do differently.]_
