import { it, expect } from "vitest";
import { createGame, legal, play, seeded, type Game } from "../core/game";
import { search, algorithms } from "./search";
it("Minimax는 모든 상대 수에 대해 패배하지 않는다 (선공·후공)", () => {
  for (const mark of ["X", "O"]) {
    const walk = (g: Game) => {
      if (g.result) {
        expect(g.result).not.toBe(mark === "X" ? "O" : "X");
        return;
      }
      if (g.turn === mark) walk(play(g, search(g, "minimax").move));
      else for (const m of legal(g)) walk(play(g, m));
    };
    walk(createGame());
  }
});
it("Minimax와 Alpha-Beta의 모든 후보 평가값이 같으며 가지치기 노드가 적다", () => {
  let g = createGame();
  for (const move of [4, 0, 8, 2]) {
    const a = search(g, "minimax"),
      b = search(g, "alphabeta");
    expect(b.candidates).toEqual(a.candidates);
    expect(b.nodes).toBeLessThan(a.nodes);
    g = play(g, move);
  }
});
it("모든 AI가 합법적인 수를 반환한다", () => {
  const rng = seeded(18);
  for (const mode of ["classic", "ultimate"] as const) {
    let g = createGame(mode);
    for (let i = 0; i < 8 && !g.result; i++) {
      for (const a of algorithms(mode)) {
        const r = search(g, a, 20, {}, rng, 2);
        expect(legal(g)).toContain(r.move);
      }
      const m = legal(g);
      g = play(g, m[Math.floor(rng() * m.length)]);
    }
  }
});
it("MCTS의 후보 방문 횟수 합이 반복 횟수와 같다", () => {
  const a = search(createGame("ultimate"), "mcts", 80, {}, seeded(9));
  expect(a.candidates.reduce((n, c) => n + c.visits!, 0)).toBe(80);
  expect(a.candidates.find((c) => c.move === a.move)!.visits).toBe(
    Math.max(...a.candidates.map((c) => c.visits!)),
  );
});
it("MCTS는 즉시 승리 수에 올바른 보상을 누적한다", () => {
  const g = createGame();
  g.cells = ["X", "X", null, "O", "O", null, null, null, null];
  const r = search(g, "mcts", 1500, {}, seeded(1));
  expect(r.move).toBe(2);
  expect(r.candidates.find((c) => c.move === 2)!.value).toBe(1);
});
