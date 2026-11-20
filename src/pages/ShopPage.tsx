import { useEffect, useState } from "react";
import { fetchOpponent } from "../api";
import { Backpack } from "../components/Backpack";
import { FightBar } from "../components/FightBar";
import { RulesPanel } from "../components/RulesPanel";
import { RunHeader } from "../components/RunHeader";
import { Shop } from "../components/Shop";
import { fightBlocker, searchFailed, startBattle, startSearch, updateRun } from "../game";
import { buyItem, moveItem, rerollShop, sellItem } from "../run";
import { useActiveGame } from "../state/GameContext";

export function ShopPage() {
  const { game, update } = useActiveGame();
  const { run, phase } = game;
  /** Selected backpack slot. Only UI state, so it lives here and not in the game state. */
  const [selected, setSelected] = useState<number | null>(null);

  // Escape cancels the current backpack selection.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleMove(from: number, to: number) {
    update((current) => updateRun(current, (currentRun) => moveItem(currentRun, from, to)));
  }

  function handleBuy(offerIndex: number) {
    update((current) => updateRun(current, (currentRun) => buyItem(currentRun, offerIndex)));
  }

  function handleReroll() {
    update((current) => updateRun(current, rerollShop));
  }

  function handleSell(slot: number) {
    update((current) => updateRun(current, (currentRun) => sellItem(currentRun, slot)));
    setSelected(null);
  }

  // Once the opponent is found the phase becomes "battle" and RequireRoute redirects to the battle page.
  async function handleFindOpponent() {
    if (fightBlocker(game) !== null) return;
    setSelected(null);
    update(startSearch);
    try {
      const opponent = await fetchOpponent(run.round);
      update((current) => startBattle(current, opponent));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Opponent search failed.";
      update((current) => searchFailed(current, message));
    }
  }

  return (
    <>
      <RunHeader run={run} />
      <FightBar phase={phase} blocker={fightBlocker(game)} error={game.error} onFight={handleFindOpponent} />

      {/* While searching, the whole shop/backpack area is disabled so the fighting build can't change. */}
      <fieldset disabled={phase !== "shop"} className="grid min-w-0 gap-4 disabled:opacity-60 lg:grid-cols-[1fr_16rem_18rem]">
        <Shop run={run} onBuy={handleBuy} onReroll={handleReroll} />
        <Backpack run={run} selected={selected} onSelect={setSelected} onSell={handleSell} onMove={handleMove} />
        <aside className="flex flex-col gap-4">
          <RulesPanel open={run.round === 1} />
        </aside>
      </fieldset>
    </>
  );
}
