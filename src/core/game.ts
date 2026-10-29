export type Mark = "X" | "O";
export type Cell = Mark | null;
export type Result = Mark | "draw" | null;
export type Mode = "classic" | "ultimate";
export interface Game {
  mode: Mode;
  cells: Cell[];
  turn: Mark;
  target: number | null;
  local: Result[];
  result: Result;
  history: number[];
}
export const lines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
export const other = (p: Mark): Mark => (p === "X" ? "O" : "X");
export function outcome(c: (Cell | "draw")[]): Result {
  for (const [a, b, d] of lines)
    if ((c[a] === "X" || c[a] === "O") && c[a] === c[b] && c[a] === c[d])
      return c[a];
  return c.every(Boolean) ? "draw" : null;
}
export function createGame(mode: Mode = "classic"): Game {
  return {
    mode,
    cells: Array(mode === "classic" ? 9 : 81).fill(null),
    turn: "X",
    target: null,
    local: Array(9).fill(null),
    result: null,
    history: [],
  };
}
export function legal(g: Game): number[] {
  if (g.result) return [];
  return g.cells.flatMap((v, i) =>
    !v &&
    (g.mode === "classic" ||
      (!g.local[Math.floor(i / 9)] &&
        (g.target === null || g.target === Math.floor(i / 9))))
      ? [i]
      : [],
  );
}
export function play(g: Game, m: number): Game {
  if (!Number.isInteger(m) || !legal(g).includes(m))
    throw new Error("불법 착수");
  const n: Game = {
    ...g,
    cells: [...g.cells],
    local: [...g.local],
    history: [...g.history, m],
    turn: other(g.turn),
  };
  n.cells[m] = g.turn;
  if (g.mode === "classic") n.result = outcome(n.cells);
  else {
    const b = Math.floor(m / 9);
    n.local[b] = outcome(n.cells.slice(b * 9, b * 9 + 9));
    n.result = outcome(n.local);
    n.target = n.local[m % 9] ? null : m % 9;
  }
  return n;
}
export function replay(mode: Mode, moves: number[]): Game {
  return moves.reduce(play, createGame(mode));
}
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
