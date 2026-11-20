import { TICK_SECONDS } from "../battle";
import { describeEffects, getItem } from "../items";
import { moveBlocker, sellBlocker, sellPrice } from "../run";
import { countSets } from "../sets";
import { BACKPACK_COLS, itemIdsOf } from "../shop";
import type { ItemDef, RunState } from "../types";
import { SetBadge, SetBonusList } from "./SetBadge";

/** Hover text for a backpack slot: name, effects and cooldown. */
const tooltip = (item: ItemDef) =>
  [item.name, ...describeEffects(item.effects).map(({ label }) => label), `⏱️ every ${item.cooldown * TICK_SECONDS}s`].join("\n");

interface BackpackProps {
  run: RunState;
  /** Index of the selected slot, or `null` if nothing is selected. */
  selected: number | null;
  onSelect: (slot: number | null) => void;
  onSell: (slot: number) => void;
  onMove: (from: number, to: number) => void;
}

export function Backpack({ run, selected, onSelect, onSell, onMove }: BackpackProps) {
  const { backpack } = run;
  const selectedItem = selected !== null && backpack[selected] ? getItem(backpack[selected].itemId) : null;

  /** A slot is a possible move target if the selected item could be moved there. */
  const canMoveTo = (index: number) => selected !== null && moveBlocker(run, selected, index) === null;

  function handleSlotClick(index: number) {
    if (index === selected) onSelect(null); // clicking the selected item again cancels
    else if (canMoveTo(index)) {
      onMove(selected!, index);
      onSelect(null);
    } else if (backpack[index]) onSelect(index);
  }

  return (
    <section className="rounded-lg border border-panel-edge bg-panel p-4">
      <h2 className="font-display text-xl font-bold">🎒 Backpack</h2>
      <p className="mb-3 text-sm text-muted">
        {selected === null
          ? "Click an item to select it. Hover to see its stats."
          : "Click a marked slot to move the item there (or swap). Press Esc or Cancel to stop."}
      </p>
      <ul className="grid gap-2" style={{ gridTemplateColumns: `repeat(${BACKPACK_COLS}, minmax(0, 1fr))` }}>
        {backpack.map((slot, index) => {
          const item = slot ? getItem(slot.itemId) : null;
          const isSelected = index === selected;
          const isTarget = canMoveTo(index);
          return (
            <li key={slot?.uid ?? `empty-${index}`}>
              <button
                type="button"
                onClick={() => handleSlotClick(index)}
                disabled={!item && !isTarget}
                title={item ? tooltip(item) : undefined}
                aria-label={(item ? item.name : `Empty slot ${index + 1}`) + (isTarget ? (item ? " (swap here)" : " (move here)") : "")}
                aria-pressed={isSelected}
                className={[
                  "flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-md border-2 p-1",
                  "relative",
                  isSelected
                    ? "border-gold bg-gold/20 ring-2 ring-gold"
                    : isTarget
                      ? "border-dashed border-block bg-block/10 hover:bg-block/25"
                      : item
                      ? "border-gold/40 bg-ink/40 hover:border-gold"
                      : "border-dashed border-panel-edge",
                ].join(" ")}
              >
                {isTarget && (
                  <span className="absolute top-0.5 right-1 text-xs font-bold text-block" aria-hidden>
                    {item ? "🔁 swap" : "➡️ move"}
                  </span>
                )}
                {item && (
                  <>
                    <span className="text-3xl leading-none sm:text-4xl" aria-hidden>
                      {item.icon}
                    </span>
                    <span className="text-center text-xs leading-tight">{item.name}</span>
                    {item.set && <SetBadge set={item.set} />}
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3">
        <h3 className="mb-1 text-sm font-bold">🧩 Set bonuses</h3>
        <SetBonusList counts={countSets(itemIdsOf(backpack))} />
      </div>

      {selected !== null && selectedItem && (
        <div className="mt-3 flex flex-col gap-2 rounded-md border border-gold/40 bg-ink/40 p-2 text-sm">
          <p>
            Selected: <b>{selectedItem.icon} {selectedItem.name}</b>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSell(selected)}
              disabled={sellBlocker(run, selected) !== null}
              title={sellBlocker(run, selected) ?? "Sell for half the price, rounded down"}
              className="flex-1 rounded-md bg-gold px-2 py-1 font-bold text-ink hover:brightness-110 disabled:bg-panel-edge disabled:text-muted"
            >
              Sell for {sellPrice(selectedItem.id)} 🪙
            </button>
            <button type="button" onClick={() => onSelect(null)} className="rounded-md border border-panel-edge px-2 py-1 hover:bg-panel-edge/40">
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
