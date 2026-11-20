import type { ReactNode } from "react";
import { TICK_SECONDS } from "../battle";
import { describeEffects } from "../items";
import { COOLDOWN_HELP, EFFECT_HELP } from "../rules";
import type { ItemDef } from "../types";
import { SetBadge } from "./SetBadge";

interface ItemCardProps {
  item: ItemDef;
  /** Extra content below the stats, e.g. a buy button. */
  children?: ReactNode;
}

export function ItemCard({ item, children }: ItemCardProps) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border-2 border-gold/40 bg-ink/40 p-3">
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none" aria-hidden>
          {item.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display font-bold">{item.name}</h3>
          {item.set && <SetBadge set={item.set} />}
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
        {describeEffects(item.effects).map(({ effect, label }) => (
          <li key={effect} title={EFFECT_HELP[effect]} className={HELP}>
            {label}
          </li>
        ))}
        <li title={COOLDOWN_HELP} className={`text-muted ${HELP}`}>
          ⏱️ every {item.cooldown * TICK_SECONDS}s
        </li>
      </ul>
      {children}
    </article>
  );
}

/** Hover hint styling for texts that have an explanatory tooltip. */
const HELP = "cursor-help underline decoration-dotted decoration-muted/60 underline-offset-2";
