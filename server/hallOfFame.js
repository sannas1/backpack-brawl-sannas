/**
 * Hall of fame (B7): stores finished runs in memory and lists the best ones.
 * Kept separate from index.js so the rules can be tested without a running server.
 */

/** Must match the game rules in src/run.ts. */
export const START_LIVES = 3;
export const WINS_TO_VICTORY = 5;
export const MAX_NAME_LENGTH = 20;
/** How many entries GET /api/hall-of-fame returns. */
export const LIST_LIMIT = 10;

const isInt = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

/**
 * Checks a submitted run. Returns `{ error }` with a clear message, or `{ run }` with the cleaned data.
 * A run is plausible only if its numbers fit the game rules.
 */
export function validateRun(body) {
  if (typeof body !== "object" || body === null) return { error: "Body must be a JSON object" };
  const { runId, name, outcome, wins, lives, rounds } = body;

  if (typeof runId !== "string" || runId.length < 1 || runId.length > 100) return { error: "runId must be a non-empty string" };
  if (typeof name !== "string") return { error: "name must be a string" };
  const cleanName = name.trim();
  if (cleanName.length < 1 || cleanName.length > MAX_NAME_LENGTH) return { error: `name must be 1–${MAX_NAME_LENGTH} characters` };
  if (/[\u0000-\u001f]/.test(cleanName)) return { error: "name contains invalid characters" };
  if (outcome !== "victory" && outcome !== "defeat") return { error: 'outcome must be "victory" or "defeat"' };
  if (!isInt(wins, 0, WINS_TO_VICTORY)) return { error: `wins must be a whole number from 0 to ${WINS_TO_VICTORY}` };
  if (!isInt(lives, 0, START_LIVES)) return { error: `lives must be a whole number from 0 to ${START_LIVES}` };

  // Plausibility: the numbers have to describe a finished run.
  if (outcome === "victory" && (wins !== WINS_TO_VICTORY || lives < 1)) return { error: `A victory needs ${WINS_TO_VICTORY} wins and at least 1 life left` };
  if (outcome === "defeat" && (lives !== 0 || wins >= WINS_TO_VICTORY)) return { error: "A defeat means 0 lives left and fewer than 5 wins" };
  const losses = START_LIVES - lives;
  if (rounds !== wins + losses) return { error: "rounds must equal wins + lives lost (one battle per round)" };

  return { run: { runId, name: cleanName, outcome, wins, lives, rounds } };
}

/** Ranking: victories first, then more wins, then fewer rounds, then whoever submitted first. */
export function compareEntries(a, b) {
  if (a.outcome !== b.outcome) return a.outcome === "victory" ? -1 : 1;
  if (a.wins !== b.wins) return b.wins - a.wins;
  if (a.rounds !== b.rounds) return a.rounds - b.rounds;
  return a.order - b.order;
}

/** An in-memory hall of fame. */
export function createHallOfFame() {
  const entries = [];

  return {
    /** Returns `{ status, body }` ready to send as the HTTP response. */
    submit(body) {
      const { error, run } = validateRun(body);
      if (error) return { status: 400, body: { error } };
      if (entries.some((entry) => entry.runId === run.runId)) {
        return { status: 409, body: { error: "This run is already in the hall of fame" } };
      }
      // `order` = position of submission, used as the last tie-breaker
      const entry = { ...run, order: entries.length, submittedAt: new Date().toISOString() };
      entries.push(entry);
      return { status: 201, body: { entry: publicEntry(entry), rank: ranked().findIndex((e) => e.runId === run.runId) + 1 } };
    },

    /** Best runs first, with their rank. */
    list(limit = LIST_LIMIT) {
      return ranked()
        .slice(0, limit)
        .map((entry, index) => ({ rank: index + 1, ...publicEntry(entry) }));
    },
  };

  function ranked() {
    return [...entries].sort(compareEntries);
  }
}

/** What the API shows of an entry (the runId stays private). */
function publicEntry({ name, outcome, wins, lives, rounds, submittedAt }) {
  return { name, outcome, wins, lives, rounds, submittedAt };
}
