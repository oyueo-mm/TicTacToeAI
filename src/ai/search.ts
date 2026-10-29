import { type Game, type Mark, legal, play, other, lines } from "../core/game";
export type Algorithm =
  "random" | "rule" | "minimax" | "alphabeta" | "q" | "mcts";
export type QTable = Record<string, Record<number, number>>;
export interface Candidate {
  move: number;
  value: number;
  visits?: number;
}
export interface Search {
  move: number;
  candidates: Candidate[];
  nodes: number;
  ms: number;
  algorithm: Algorithm;
  exploring?: boolean;
  depth?: number;
}
export const key = (g: Game) =>
  g.cells.map((c) => (c === null ? "-" : c === g.turn ? "1" : "2")).join("");
export const algorithms = (mode: string): Algorithm[] =>
  mode === "classic"
    ? ["random", "rule", "minimax", "alphabeta", "q"]
    : ["random", "rule", "alphabeta", "mcts"];
export const names: Record<Algorithm, string> = {
  random: "Random",
  rule: "Rule-based",
  minimax: "Minimax",
  alphabeta: "Alpha-Beta",
  q: "Q-learning",
  mcts: "MCTS",
};
function heuristic(g: Game, p: Mark) {
  let v = 0;
  const score = (c: (string | null)[], weight: number) => {
    for (const l of lines) {
      const a = l.map((i) => c[i]);
      if (!a.includes(other(p)) && !a.includes("draw"))
        v += weight * a.filter((x) => x === p).length ** 2;
      if (!a.includes(p) && !a.includes("draw"))
        v -= weight * a.filter((x) => x === other(p)).length ** 2;
    }
  };
  if (g.mode === "classic") score(g.cells, 1);
  else {
    score(g.local, 35);
    for (let b = 0; b < 9; b++)
      if (!g.local[b]) score(g.cells.slice(b * 9, b * 9 + 9), 1);
  }
  return v;
}
export function search(
  g: Game,
  algorithm: Algorithm,
  budget = 300,
  q: QTable = {},
  rng = Math.random,
  depth = 3,
  onProgress?: (iterations: number) => void,
): Search {
  const start = performance.now(),
    moves = legal(g);
  if (!moves.length) throw new Error("종료된 대국");
  let nodes = 0;
  const root = g.turn;
  let candidates: Candidate[] = [];
  if (algorithm === "random")
    candidates = moves.map((move) => ({ move, value: 0 }));
  else if (algorithm === "q")
    candidates = moves.map((move) => ({ move, value: q[key(g)]?.[move] ?? 0 }));
  else if (algorithm === "rule") {
    candidates = moves.map((move) => {
      const n = play(g, move);
      let value = n.result === root ? 100000 : heuristic(n, root);
      if (g.mode === "classic") {
        const threat = { ...g, turn: other(root) };
        if (play(threat, move).result === other(root)) value += 1000;
        value += move === 4 ? 3 : [0, 2, 6, 8].includes(move) ? 1 : 0;
      }
      return { move, value };
    });
  } else if (algorithm === "mcts") {
    interface Node {
      g: Game;
      parent?: Node;
      children: Node[];
      untried: number[];
      n: number;
      sum: number;
      move: number;
    }
    const tree: Node = {
      g,
      children: [],
      untried: [...moves],
      n: 0,
      sum: 0,
      move: -1,
    };
    for (let it = 0; it < budget; it++) {
      let node = tree;
      while (!node.g.result && !node.untried.length && node.children.length) {
        const sign = node.g.turn === root ? 1 : -1;
        node = node.children.reduce((a, b) =>
          (sign * b.sum) / b.n + Math.sqrt((2 * Math.log(node.n)) / b.n) >
          (sign * a.sum) / a.n + Math.sqrt((2 * Math.log(node.n)) / a.n)
            ? b
            : a,
        );
      }
      if (node.untried.length) {
        const move = node.untried.splice(
            Math.floor(rng() * node.untried.length),
            1,
          )[0],
          s = play(node.g, move);
        const child: Node = {
          g: s,
          parent: node,
          children: [],
          untried: legal(s),
          n: 0,
          sum: 0,
          move,
        };
        node.children.push(child);
        node = child;
      }
      let s = node.g;
      while (!s.result) {
        const a = legal(s);
        s = play(s, a[Math.floor(rng() * a.length)]);
        nodes++;
      }
      const reward = s.result === "draw" ? 0 : s.result === root ? 1 : -1;
      while (node) {
        node.n++;
        node.sum += reward;
        if (!node.parent) break;
        node = node.parent;
      }
      if ((it + 1) % 25 === 0 || it + 1 === budget) onProgress?.(it + 1);
    }
    candidates = tree.children.map((n) => ({
      move: n.move,
      value: (n.sum / n.n + 1) / 2,
      visits: n.n,
    }));
  } else {
    const limit = g.mode === "classic" ? 9 : Math.min(4, Math.max(1, depth));
    const visit = (s: Game, d: number, alpha: number, beta: number): number => {
      nodes++;
      if (s.result)
        return s.result === "draw"
          ? 0
          : s.result === root
            ? 10000 + d
            : -10000 - d;
      if (d === 0) return heuristic(s, root);
      const maximizing = s.turn === root;
      let best = maximizing ? -Infinity : Infinity;
      for (const m of legal(s)) {
        const v = visit(play(s, m), d - 1, alpha, beta);
        best = maximizing ? Math.max(best, v) : Math.min(best, v);
        if (algorithm === "alphabeta") {
          if (maximizing) alpha = Math.max(alpha, best);
          else beta = Math.min(beta, best);
          if (beta <= alpha) break;
        }
      }
      return best;
    };
    candidates = moves.map((move) => ({
      move,
      value: visit(play(g, move), limit - 1, -Infinity, Infinity),
    }));
  }
  let best: Candidate;
  if (algorithm === "random")
    best = candidates[Math.floor(rng() * candidates.length)];
  else
    best = candidates.reduce((a, b) =>
      (
        algorithm === "mcts"
          ? (b.visits ?? 0) > (a.visits ?? 0)
          : b.value > a.value
      )
        ? b
        : a,
    );
  return {
    move: best.move,
    candidates,
    nodes,
    ms: performance.now() - start,
    algorithm,
    depth:
      g.mode === "ultimate" && algorithm === "alphabeta" ? depth : undefined,
  };
}
