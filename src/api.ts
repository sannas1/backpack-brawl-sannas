import { CATALOG } from "./items";
import { BACKPACK_SIZE } from "./shop";
import type { HallOfFameEntry, Opponent, RunSubmission } from "./types";

/** Give up on a request after this many milliseconds. */
export const REQUEST_TIMEOUT_MS = 8000;

/** An error from our API. `status` is the HTTP status code (0 if the server could not be reached). */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Sends one request to the API and returns the JSON answer.
 * Every problem (no server, timeout, error status) becomes an `ApiError` with a readable message.
 */
async function request(url: string, options: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new ApiError("Could not reach the arena server.", 0);
  }
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new ApiError(body?.error ?? `Request failed (${response.status}).`, response.status);
  return body;
}

/** Checks that the server's answer really is a usable opponent. */
function isValidOpponent(data: unknown): data is Opponent {
  const o = data as Partial<Opponent> | null;
  return (
    typeof o?.id === "string" &&
    typeof o.name === "string" &&
    typeof o.icon === "string" &&
    typeof o.hp === "number" &&
    o.hp > 0 &&
    Number.isInteger(o.round) &&
    Array.isArray(o.items) &&
    o.items.length <= BACKPACK_SIZE &&
    o.items.every((id) => CATALOG.some((item) => item.id === id))
  );
}

/** Asks the API for this round's opponent. */
export async function fetchOpponent(round: number): Promise<Opponent> {
  const data = await request(`/api/opponents?round=${round}`);
  if (!isValidOpponent(data)) throw new ApiError("The arena sent an invalid challenger.", 200);
  return data;
}

/** Sends a finished run to the hall of fame. A run that is already stored fails with status 409. */
export async function submitRun(submission: RunSubmission): Promise<void> {
  await request("/api/hall-of-fame", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submission),
  });
}

/** Loads the best runs. */
export async function fetchHallOfFame(): Promise<HallOfFameEntry[]> {
  const data = (await request("/api/hall-of-fame")) as { entries?: HallOfFameEntry[] } | null;
  if (!Array.isArray(data?.entries)) throw new ApiError("The hall of fame sent invalid data.", 200);
  return data.entries;
}
