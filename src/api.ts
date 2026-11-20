import { CATALOG } from "./items";
import { BACKPACK_SIZE } from "./shop";
import type { HallOfFameEntry, Opponent, RunSubmission } from "./types";

/** Give up on the opponent search after this many milliseconds. */
export const SEARCH_TIMEOUT_MS = 8000;

const knownItem = (id: unknown) => CATALOG.some((item) => item.id === id);

/** Checks that the server's answer really is a usable opponent. */
export function isValidOpponent(data: unknown): data is Opponent {
  if (typeof data !== "object" || data === null) return false;
  const o = data as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.icon === "string" &&
    typeof o.hp === "number" &&
    o.hp > 0 &&
    Number.isInteger(o.round) &&
    Array.isArray(o.items) &&
    o.items.length <= BACKPACK_SIZE &&
    o.items.every(knownItem)
  );
}

/** Asks the API for this round's opponent; throws an Error with an understandable message on any failure. */
export async function fetchOpponent(round: number): Promise<Opponent> {
  let response: Response;
  try {
    response = await fetch(`/api/opponents?round=${encodeURIComponent(round)}`, { signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS) });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") throw new Error("No challenger answered in time.", { cause: error });
    throw new Error("Could not reach the arena server.", { cause: error });
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Opponent search failed (${response.status}).`);
  }
  const data: unknown = await response.json().catch(() => null);
  if (!isValidOpponent(data)) throw new Error("The arena sent an invalid challenger.");
  return data;
}

/** Reads the error text of a failed response, or a generic message with the status code. */
async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `${fallback} (${response.status}).`;
}

/** Thrown by `submitRun` when the server already has this run (HTTP 409). */
export class AlreadySubmittedError extends Error {}

/** Sends a finished run to the hall of fame. */
export async function submitRun(submission: RunSubmission): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/hall-of-fame", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    });
  } catch (error) {
    throw new Error("Could not reach the arena server.", { cause: error });
  }
  if (response.status === 409) throw new AlreadySubmittedError(await errorMessage(response, "Already submitted"));
  if (!response.ok) throw new Error(await errorMessage(response, "Submitting failed"));
}

/** Loads the best runs. */
export async function fetchHallOfFame(): Promise<HallOfFameEntry[]> {
  let response: Response;
  try {
    response = await fetch("/api/hall-of-fame");
  } catch (error) {
    throw new Error("Could not reach the arena server.", { cause: error });
  }
  if (!response.ok) throw new Error(await errorMessage(response, "Loading the hall of fame failed"));
  const data = (await response.json().catch(() => null)) as { entries?: HallOfFameEntry[] } | null;
  if (!Array.isArray(data?.entries)) throw new Error("The hall of fame sent invalid data.");
  return data.entries;
}
