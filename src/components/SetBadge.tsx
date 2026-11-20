import { SET_BONUS_MIN_ITEMS, SETS } from "../sets";
import type { SetId } from "../types";

/** Small pill that shows which set an item belongs to. Hover for the set bonus. */
export function SetBadge({ set }: { set: SetId }) {
  const def = SETS[set];
  return (
    <span
      title={`${def.name} set (${SET_BONUS_MIN_ITEMS}+ items): ${def.bonus}`}
      className="inline-flex cursor-help items-center gap-0.5 rounded-full border border-gold/50 bg-gold/10 px-1.5 text-xs whitespace-nowrap text-gold"
    >
      {def.icon} {def.name}
    </span>
  );
}

/** List of set bonuses with progress, e.g. "🔥 Fire 1/2" (inactive) or "🔥 Fire 2/2 ✅" (active). */
export function SetBonusList({ counts }: { counts: Record<SetId, number> }) {
  return (
    <ul className="flex flex-col gap-1 text-xs" aria-label="Set bonuses">
      {Object.values(SETS).map((def) => {
        const active = counts[def.id] >= SET_BONUS_MIN_ITEMS;
        return (
          <li key={def.id} title={def.bonus} className={`cursor-help ${active ? "font-bold text-gold" : "text-muted"}`}>
            {def.icon} {def.name} {Math.min(counts[def.id], SET_BONUS_MIN_ITEMS)}/{SET_BONUS_MIN_ITEMS} {active ? "✅ " + def.bonus : ""}
          </li>
        );
      })}
    </ul>
  );
}
