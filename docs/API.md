# Backpack Brawl API

The local API is a small Express server in `server/index.js`. It listens on port 4200 (override with the `PORT` environment variable). During Vite development, `/api` is proxied to it, so the frontend uses relative URLs such as `/api/opponents?round=1`. All responses are JSON. The opponent endpoint keeps no state; only the hall of fame is stored (in memory).

## `GET /api/health`

Always answers immediately with status 200:

```json
{ "ok": true, "service": "backpack-brawl" }
```

## `GET /api/opponents`

Returns the opponent for one round of a run. The opponent table lives in `server/opponents.js`.

### Query parameters

| Parameter | Required | Meaning |
|---|---|---|
| `round` | yes | The 1-based round number. Must be a positive whole number written in digits (`1`, `2`, …). |
| `latency` | no | Response delay in milliseconds, clamped to 0–5000. Defaults to 1200. A value that is not a number falls back to the default. |
| `fail` | no | `fail=true` forces a 503 response (see below). |

### Success — 200

```json
{
  "id": "mossback-hermit",
  "name": "Mossback Hermit",
  "icon": "🐢",
  "hp": 25,
  "items": ["chipped-dagger", "pot-lid"],
  "round": 1
}
```

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable identifier of the opponent |
| `name` | string | Display name |
| `icon` | string | Emoji shown in the battle view |
| `hp` | number | Maximum (and starting) HP |
| `items` | string[] | Item ids from the catalog in `src/items.ts`; the same id may appear several times |
| `round` | number | The round this opponent was requested for (echoes `round`) |

The response matches the `Opponent` type in `src/types.ts`.

The answer is deterministic: the same `round` always returns the same opponent. There is one hand-built opponent per round for rounds 1–7. Every round past the table returns the last opponent with +6 HP per additional round. The table never needs more than 7 rounds (5 wins + 3 lives − 1), and an opponent never carries more than 6 items, the size of the player's 2×3 backpack.

### Errors

Every error response has the shape:

```json
{ "error": "human-readable explanation" }
```

| Status | When | `error` |
|---|---|---|
| 400 | `round` is missing, not a whole number, or less than 1 | `round must be a positive whole number` |
| 503 | `fail=true`, or the server was started with `API_FAIL=true` | `The arena gates are shut. No challenger answered the call.` |

An invalid `round` is reported as 400 even when failure is forced. All responses from this endpoint, errors included, arrive after the configured delay.

## Environment variables

| Variable | Effect |
|---|---|
| `PORT` | Port to listen on (default 4200). The Vite proxy expects 4200. |
| `API_LATENCY` | Default delay in milliseconds when a request has no `latency` parameter. |
| `API_FAIL` | `true` makes every opponent request fail with 503. |

Example: `API_FAIL=true pnpm server`.

## Client

`fetchOpponent(round)` in `src/api.ts` performs the request. It resolves with the `Opponent` on success and throws an `ApiError` carrying the server's `error` text (or a generic message with the status code) for any non-2xx response, a network failure, a timeout (8 s) or an answer that is not a valid opponent.

## `GET /api/hall-of-fame`

Lists the best finished runs (at most 10). Entries are stored **in memory**: restarting the server empties the list.

**Ranking:** victories first, then more wins, then fewer rounds; on a tie the run that was submitted first ranks higher.

### Success — 200

```json
{
  "entries": [
    { "rank": 1, "name": "Anna", "outcome": "victory", "wins": 5, "lives": 2, "rounds": 6, "submittedAt": "2026-11-20T18:00:00.000Z" }
  ]
}
```

An empty hall of fame answers `{ "entries": [] }`.

## `POST /api/hall-of-fame`

Submits one finished run. Body (JSON):

| Field | Type | Rule |
|---|---|---|
| `runId` | string | 1–100 characters. Unique per run; a second submission of the same `runId` is rejected. |
| `name` | string | Trimmed, 1–20 characters, no control characters. |
| `outcome` | `"victory"` \| `"defeat"` | |
| `wins` | integer | 0–5 |
| `lives` | integer | Lives left, 0–3 |
| `rounds` | integer | Number of rounds played |

**Plausibility checks** (the numbers must describe a finished run):

- `victory` needs `wins = 5` and `lives ≥ 1`.
- `defeat` needs `lives = 0` and `wins < 5`.
- `rounds = wins + (3 − lives)`: every round is exactly one battle, won or lost.

### Responses

| Status | When | Body |
|---|---|---|
| 201 | Stored | `{ "entry": { …without rank… }, "rank": 3 }` |
| 400 | Invalid JSON, a field fails validation or the run is implausible | `{ "error": "…" }` e.g. `"A victory needs 5 wins and at least 1 life left"` |
| 409 | This `runId` was already submitted | `{ "error": "This run is already in the hall of fame" }` |

The `runId` is never returned by the API.

### Client

`submitRun(submission)` and `fetchHallOfFame()` in `src/api.ts`. All requests go through one helper (`request`) that turns every problem into an `ApiError` with a readable message and the HTTP `status`. A 409 is treated by the result page as "already done". The game also remembers (and saves) that the run was submitted, so the form disappears after one successful submission, even after a refresh.
