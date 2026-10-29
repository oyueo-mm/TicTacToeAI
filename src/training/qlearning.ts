import { createGame, legal, play, type Game, type Mark } from "../core/game";
import { key, search, type QTable, type Algorithm } from "../ai/search";
export interface Settings {
  alpha: number;
  gamma: number;
  epsilon: number;
  decay: number;
  episodes: number;
  opponent: Algorithm | "self";
}
export const defaults: Settings = {
  alpha: 0.2,
  gamma: 0.95,
  epsilon: 1,
  decay: 0.999,
  episodes: 1000,
  opponent: "random",
};
export interface Decision {
  move: number;
  exploring: boolean;
  before: number;
  after: number;
}
export interface Episode {
  result: "win" | "draw" | "loss";
  reward: number;
  epsilon: number;
  delta: number;
  moves: number[];
  decisions: Decision[];
}
export function update(
  q: QTable,
  state: string,
  action: number,
  reward: number,
  nextMax: number,
  alpha: number,
  gamma: number,
) {
  const row = q[state] ?? (q[state] = {});
  const before = row[action] ?? 0;
  row[action] = before + alpha * (reward + gamma * nextMax - before);
  return row[action] - before;
}
export function episode(
  q: QTable,
  cfg: Settings,
  index: number,
  rng = Math.random,
): Episode {
  let g = createGame();
  const learner: Mark = index % 2 ? "O" : "X",
    epsilon = cfg.epsilon * cfg.decay ** index;
  let delta = 0;
  const decisions: Decision[] = [];
  const pending: Partial<
    Record<Mark, { state: string; move: number; decision: Decision }>
  > = {};
  const finish = (p: Mark, reward: number, next?: Game) => {
    const old = pending[p];
    if (!old) return;
    const max = next
      ? Math.max(...legal(next).map((m) => q[key(next)]?.[m] ?? 0))
      : 0;
    delta += Math.abs(
      update(q, old.state, old.move, reward, max, cfg.alpha, cfg.gamma),
    );
    old.decision.after = q[old.state][old.move];
    delete pending[p];
  };
  while (!g.result) {
    const p = g.turn,
      learning = cfg.opponent === "self" || p === learner;
    if (learning) finish(p, 0, g);
    const moves = legal(g),
      exploring = learning && rng() < epsilon;
    const move = learning
      ? exploring
        ? moves[Math.floor(rng() * moves.length)]
        : search(g, "q", 0, q, rng).move
      : search(g, cfg.opponent as Algorithm, 100, q, rng).move;
    if (learning) {
      const decision = {
        move,
        exploring,
        before: q[key(g)]?.[move] ?? 0,
        after: q[key(g)]?.[move] ?? 0,
      };
      decisions.push(decision);
      pending[p] = { state: key(g), move, decision };
    }
    g = play(g, move);
  }
  for (const p of ["X", "O"] as Mark[])
    finish(p, g.result === "draw" ? 0.2 : g.result === p ? 1 : -1);
  const result =
    g.result === "draw" ? "draw" : g.result === learner ? "win" : "loss";
  return {
    result,
    reward: result === "draw" ? 0.2 : result === "win" ? 1 : -1,
    epsilon,
    delta,
    moves: g.history,
    decisions,
  };
}
