import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ApiError, submitRun } from "../api";
import { ROUTES } from "../game";
import { START_LIVES, type RunOutcome } from "../run";
import type { GameState } from "../types";

const MAX_NAME_LENGTH = 20;

interface SubmitRunProps {
  game: GameState;
  outcome: RunOutcome;
  /** Called once the server has the run, so it's never sent twice. */
  onSubmitted: () => void;
}

/** Name form at the end of a run. Keeps the name after an error so the player can just retry. */
export function SubmitRun({ game, outcome, onSubmitted }: SubmitRunProps) {
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (game.submitted) {
    return (
      <p role="status" className="text-center text-gold">
        ✅ Your run is in the <Link to={ROUTES.hallOfFame} className="underline">hall of fame</Link>.
      </p>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (sending || name.trim() === "") return; // the button is disabled too; this protects the action itself
    setSending(true);
    setError(null);
    const { run } = game;
    try {
      await submitRun({ runId: game.runId, name: name.trim(), outcome, wins: run.wins, lives: run.lives, rounds: run.round });
      onSubmitted();
    } catch (err) {
      const alreadyStored = err instanceof ApiError && err.status === 409;
      if (alreadyStored) onSubmitted(); // the server already has this run: nothing left to do
      else setError(err instanceof Error ? err.message : "Submitting failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-lg flex-col gap-2 rounded-lg border border-panel-edge bg-panel p-4">
      <label htmlFor="hof-name" className="font-bold">
        🏛️ Enter the hall of fame
      </label>
      <p className="text-xs text-muted">
        {game.run.wins} wins, {START_LIVES - game.run.lives} lost lives, {game.run.round} rounds.
      </p>
      <div className="flex gap-2">
        <input
          id="hof-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Your name"
          disabled={sending}
          className="min-w-0 flex-1 rounded-md border border-panel-edge bg-ink px-3 py-1.5"
        />
        <button
          type="submit"
          disabled={sending || name.trim() === ""}
          title={name.trim() === "" ? "Enter a name first" : undefined}
          className="rounded-md bg-gold px-4 py-1.5 font-bold text-ink hover:brightness-110 disabled:bg-panel-edge disabled:text-muted"
        >
          {sending ? "Sending…" : error ? "Retry" : "Submit"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-life">
          ⚠️ {error} Your name is kept — just press Retry.
        </p>
      )}
    </form>
  );
}
