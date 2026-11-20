import { RunHeader } from "../components/RunHeader";
import { RunOver } from "../components/RunOver";
import { SubmitRun } from "../components/SubmitRun";
import { markSubmitted } from "../game";
import { runOutcome } from "../run";
import { useActiveGame } from "../state/GameContext";

export function ResultPage() {
  const { game, startNewRun, update } = useActiveGame();
  const outcome = runOutcome(game.run);
  if (!outcome) return null;

  // Starting a new run moves the phase to "shop", so RequireRoute redirects to the shop.
  return (
    <>
      <RunHeader run={game.run} />
      <RunOver run={game.run} outcome={outcome} onNewRun={startNewRun} />
      <SubmitRun key={game.runId} game={game} outcome={outcome} onSubmitted={() => update(markSubmitted)} />
    </>
  );
}
