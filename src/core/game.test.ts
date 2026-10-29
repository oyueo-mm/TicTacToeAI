import { describe, it, expect } from "vitest";
import {
  createGame,
  play,
  legal,
  replay,
  seeded,
  outcome,
  type Game,
} from "./game";
describe("공통 규칙 엔진", () => {
  it("일반 승리와 종료 후 불법 수", () => {
    const g = replay("classic", [0, 3, 1, 4, 2]);
    expect(g.result).toBe("X");
    expect(legal(g)).toEqual([]);
    expect(() => play(g, 6)).toThrow();
  });
  it("일반 무승부, 중복 착수 차단", () => {
    expect(replay("classic", [0, 4, 8, 1, 7, 6, 2, 5, 3]).result).toBe("draw");
    expect(() => play(play(createGame(), 0), 0)).toThrow();
    expect(() => play(createGame(), -1)).toThrow();
  });
  it("궁극의 강제 이동 및 불법 수 차단", () => {
    const g = play(createGame("ultimate"), 13);
    expect(g.target).toBe(4);
    expect(legal(g)).toEqual([36, 37, 38, 39, 40, 41, 42, 43, 44]);
    expect(() => play(g, 0)).toThrow();
  });
  it("작은 판 점령과 종료 판의 착수 금지", () => {
    const g = createGame("ultimate");
    g.cells[0] = "X";
    g.cells[1] = "X";
    const n = play(g, 2);
    expect(n.local[0]).toBe("X");
    expect(n.result).toBe(null);
    n.target = null;
    expect(legal(n).some((m) => m < 9)).toBe(false);
  });
  it("종료 판으로 보내면 자유 착수", () => {
    const g = createGame("ultimate");
    g.local[4] = "draw";
    const n = play(g, 4);
    expect(n.target).toBe(null);
    expect(legal(n).length).toBe(71);
  });
  it("큰 판 승리", () => {
    const g = createGame("ultimate");
    g.local[0] = "X";
    g.local[1] = "X";
    g.cells[18] = "X";
    g.cells[19] = "X";
    expect(play(g, 20).result).toBe("X");
  });
  it("전체 무승부 (작은 판의 draw가 승리로 오인되지 않음)", () => {
    expect(
      outcome(["draw", "draw", "draw", null, null, null, null, null, null]),
    ).toBe(null);
    const g = createGame("ultimate");
    g.local = ["X", "O", "X", "X", "O", "O", "O", "X", null];
    g.cells.splice(72, 9, "X", "O", "X", "X", "O", "O", "O", "X", null);
    expect(play(g, 80).result).toBe("draw");
  });
  it("시드 기반 무작위 게임의 불변식", () => {
    const rng = seeded(42);
    for (let i = 0; i < 50; i++) {
      let g = createGame("ultimate");
      while (!g.result) {
        const moves = legal(g);
        expect(moves.length).toBeGreaterThan(0);
        const n = play(g, moves[Math.floor(rng() * moves.length)]);
        expect(n.history.length).toBe(g.history.length + 1);
        expect(g.cells.filter(Boolean).length).toBe(g.history.length);
        g = n;
      }
      expect(legal(g)).toEqual([]);
    }
  });
});
