import { useEffect, useState, type ReactNode } from "react";
import { newGame } from "../game";
import { loadGame, saveGame } from "../save";
import type { GameState } from "../types";
import { GameContext, type GameContextValue } from "./GameContext";

const randomSeed = () => Math.floor(Math.random() * 2 ** 32);

/** Holds the game state for all routes, so it survives navigating between pages. */
export function GameProvider({ children }: { children: ReactNode }) {
  // Continue a saved run after a refresh (B6); `loadGame` returns null for missing or broken saves.
  const [game, setGame] = useState<GameState | null>(() => loadGame());

  // Save after every change.
  useEffect(() => {
    if (game) saveGame(game);
  }, [game]);

  const value: GameContextValue = {
    game,
    startNewRun: () => setGame(newGame(randomSeed(), crypto.randomUUID())),
    update: (transition) => setGame((current) => (current ? transition(current) : current)),
  };

  return <GameContext value={value}>{children}</GameContext>;
}
