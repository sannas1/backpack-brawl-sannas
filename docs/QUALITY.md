# Quality goals

We picked three quality goals that matter for a small browser game that people play in one sitting and refresh whenever they like.

## 1. Correct and fair game state

**Why:** A game feels broken (or can be cheated) if gold goes negative, items disappear, or a battle counts twice.

**Decisions / trade-offs**
- All game rules are **pure functions** in plain TypeScript (`run.ts`, `battle.ts`, `game.ts`, `save.ts`). They take a state and return a new one, with no React and no side effects, so they are easy to test.
- Every action has a matching `…Blocker` function (`buyBlocker`, `sellBlocker`, `rerollBlocker`, `moveBlocker`, `fightBlocker`). The **same function** disables the button in the UI *and* protects the action itself. An action either fully happens or returns the unchanged state.
- Opponent searches carry an id (`searchId`). Only the answer to the running search for the current round can start a battle.
- Trade-off: a bit more code in the rule functions, but the UI stays "dumb" and can't get out of sync with the rules.

**How we check it:** unit tests (`npm test`) for every invariant: no negative gold, no lost/duplicated items, results applied once, stale answers ignored.

## 2. Robustness against failures and bad data

**Why:** The API can be slow or down, the browser can be refreshed at any moment, and saved data or submitted runs can be broken or faked.

**Decisions / trade-offs**
- The API client has a timeout, understandable error messages and checks the shape of the server answer.
- Saved games are versioned and fully validated (types, ranges, *and* whether the numbers describe a possible run). Anything invalid is thrown away → start page. Trade-off: a really broken save loses the run instead of trying to "repair" it, which is simpler and safer.
- The battle is **not saved**. During a battle we save the run *with the result already applied*, so a refresh can't change the outcome and there is no battle data to validate.
- The server validates every hall-of-fame submission and rejects implausible runs and duplicates (409).

**How we check it:** tests with broken saves and invalid submissions; manual tests with `?fail=true`, `API_FAIL=true`, a stopped API server and refreshes in every phase (checklist below).

## 3. Understandability (maintainability)

**Why:** The code has to be explained in the exam by every team member, and "more code or greater complexity does not mean a better solution".

**Decisions / trade-offs**
- One module per topic, and one helper where code repeated (all API calls go through `request` in `api.ts`).
- One module per topic: `sets.ts` for sets, `save.ts` for saving, `server/hallOfFame.js` for the hall of fame.
- All numbers (poison interval, burn decay, set bonus values, reroll cost …) are named constants. The rules panel and tooltips are **built from those constants**, so the explanation can never be out of date.
- No new libraries, no global state library, no database (in-memory storage is enough per the requirements).
- Battle tick order is written once as a comment above `simulateBattle` and followed step by step in the code.

**How we check it:** `npm run lint` and `npm run build` (type check) pass; each feature is one commit on its own branch, so it can be reviewed separately.

## Manual test checklist

| Scenario | Expected |
|---|---|
| Fill the backpack (6 items), look at the shop | Buy buttons say "Backpack is full" |
| Gold = 0 | Reroll button says "Not enough gold to reroll" |
| Select item → click empty slot / other item / Esc | Moves / swaps / cancels |
| Click "Find opponent" twice quickly | Only one search; button shows "Searching…" |
| Start the server with `API_FAIL=true` (or stop it), search | Shop unlocks, error message, retry works |
| Refresh during search | Shop with "search was interrupted" message, same shop offers |
| Refresh during battle replay | Shop of the next round (or end screen) with a message, result counted once |
| Put `{}` into `localStorage["backpack-brawl-save"]`, refresh | Start page, no crash |
| End a run, submit name with the API stopped, start API, press Retry | Name still there, submission works once, form disappears |
| Open `/hall-of-fame` with the API stopped / empty / with entries | Error + retry / empty text / table |
