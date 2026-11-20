import { describe, expect, it } from "vitest";
import { createHallOfFame, validateRun } from "./hallOfFame.js";

const victory = { runId: "r1", name: "Anna", outcome: "victory", wins: 5, lives: 2, rounds: 6 };
const defeat = { runId: "r2", name: "Ben", outcome: "defeat", wins: 3, lives: 0, rounds: 6 };

describe("B7 hall of fame validation", () => {
  it("accepts plausible runs and trims the name", () => {
    expect(validateRun({ ...victory, name: "  Anna  " }).run?.name).toBe("Anna");
    expect(validateRun(defeat).error).toBeUndefined();
  });

  it.each([
    [{ ...victory, name: "" }, /name/],
    [{ ...victory, name: "x".repeat(21) }, /name/],
    [{ ...victory, outcome: "draw" }, /outcome/],
    [{ ...victory, wins: 4 }, /victory/],
    [{ ...victory, wins: 99 }, /wins/],
    [{ ...defeat, lives: 1 }, /defeat/],
    [{ ...victory, rounds: 2 }, /rounds/],
    [{ ...victory, runId: undefined }, /runId/],
    [null, /object/],
  ])("rejects %o", (body, message) => {
    expect(validateRun(body).error).toMatch(message);
  });
});

describe("B7 hall of fame storage", () => {
  it("never stores the same run twice", () => {
    const hall = createHallOfFame();
    expect(hall.submit(victory).status).toBe(201);
    expect(hall.submit(victory).status).toBe(409);
    expect(hall.list()).toHaveLength(1);
  });

  it("orders victories first, then more wins, then fewer rounds, then earlier submission", () => {
    const hall = createHallOfFame();
    hall.submit({ ...defeat, runId: "a", name: "Defeat3" });
    hall.submit({ ...victory, runId: "b", name: "Win6Rounds", rounds: 6, lives: 2 });
    hall.submit({ ...victory, runId: "c", name: "Win5Rounds", rounds: 5, lives: 3 });
    hall.submit({ ...defeat, runId: "d", name: "Defeat4", wins: 4, rounds: 7 });
    hall.submit({ ...victory, runId: "e", name: "Win6Later", rounds: 6, lives: 2 });
    expect(hall.list().map((e) => e.name)).toEqual(["Win5Rounds", "Win6Rounds", "Win6Later", "Defeat4", "Defeat3"]);
    expect(hall.list()[0].rank).toBe(1);
  });
});
