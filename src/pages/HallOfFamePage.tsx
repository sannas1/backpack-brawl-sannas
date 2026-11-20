import { useCallback, useEffect, useState } from "react";
import { fetchHallOfFame } from "../api";
import type { HallOfFameEntry } from "../types";

/** What the page shows: loading, an error, or the loaded entries (which may be empty). */
type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "done"; entries: HallOfFameEntry[] };

export function HallOfFamePage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      setState({ status: "done", entries: await fetchHallOfFame() });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Loading failed." });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading data on mount is what this effect is for
    void load();
  }, [load]);

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-lg border border-panel-edge bg-panel p-6">
      <h2 className="font-display text-2xl font-bold">🏛️ Hall of fame</h2>
      <p className="text-sm text-muted">Ranking: victories first, then more wins, then fewer rounds. On a tie, whoever was first.</p>

      {state.status === "loading" && <p className="animate-pulse text-gold">Loading the champions…</p>}

      {state.status === "error" && (
        <div role="alert" className="flex items-center justify-between gap-2 text-life">
          <p>⚠️ {state.message}</p>
          <button type="button" onClick={load} className="rounded-md border border-life px-3 py-1 hover:bg-life/10">
            Try again
          </button>
        </div>
      )}

      {state.status === "done" && state.entries.length === 0 && <p className="text-muted">No runs yet. Finish a run and be the first!</p>}

      {state.status === "done" && state.entries.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="py-1">#</th>
              <th>Name</th>
              <th>Result</th>
              <th className="text-right">Wins</th>
              <th className="text-right">Rounds</th>
            </tr>
          </thead>
          <tbody>
            {state.entries.map((entry) => (
              <tr key={entry.rank} className="border-t border-panel-edge">
                <td className="py-1.5 font-bold">{entry.rank}</td>
                <td>{entry.name}</td>
                <td>{entry.outcome === "victory" ? "👑 Victory" : "🪦 Defeat"}</td>
                <td className="text-right">{entry.wins}</td>
                <td className="text-right">{entry.rounds}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
