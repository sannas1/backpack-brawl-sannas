import type { Phase } from "../types";

interface FightBarProps {
  phase: Phase;
  blocker: string | null;
  error: string | null;
  onFight: () => void;
}

export function FightBar({ phase, blocker, error, onFight }: FightBarProps) {
  const searching = phase === "searching";

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-panel-edge bg-panel p-4 sm:flex-row sm:items-center sm:justify-between">
      <div aria-live="polite">
        {error ? (
          <p role="alert" className="text-life">
            ⚠️ {error}
          </p>
        ) : searching ? (
          <p className="animate-pulse font-bold text-gold">🔭 Searching the arena for a challenger…</p>
        ) : (
          <p className="text-sm text-muted">Only items in your backpack fight. Ready when you are.</p>
        )}
      </div>
      <button
        type="button"
        onClick={onFight}
        disabled={blocker !== null}
        title={blocker ?? undefined}
        className="shrink-0 rounded-md bg-life px-4 py-2 font-display font-bold text-parchment hover:brightness-110 disabled:bg-panel-edge disabled:text-muted"
      >
        {searching ? "Searching…" : (blocker ?? "⚔️ Find opponent")}
      </button>
    </section>
  );
}
