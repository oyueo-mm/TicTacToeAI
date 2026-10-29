import { it, expect } from "vitest";
import { defaults, update, episode } from "./qlearning";
import { type QTable } from "../ai/search";
import { seeded } from "../core/game";
import { validateModel, type Model } from "../storage/models";
import { createGame, play } from "../core/game";
import { search } from "../ai/search";
it("Q-learning의 Bellman 업데이트", () => {
  const q: QTable = { s: { 2: 0.5 } };
  expect(update(q, "s", 2, 1, 0.8, 0.2, 0.9)).toBeCloseTo(0.244);
  expect(q.s[2]).toBeCloseTo(0.744);
});
it("실제 대국을 학습하고 재현 가능하다", () => {
  const q: QTable = {},
    r: QTable = {},
    a = seeded(14),
    b = seeded(14);
  for (let i = 0; i < 100; i++) {
    expect(episode(q, defaults, i, a)).toEqual(episode(r, defaults, i, b));
  }
  expect(Object.keys(q).length).toBeGreaterThan(100);
  expect(
    Object.values(q).some((row) => Object.values(row).some((v) => v !== 0)),
  ).toBe(true);
});
it("모델을 JSON으로 복원하며 버전·게임·숫자를 검증한다", () => {
  const model: Model = {
    id: "a",
    version: 1,
    game: "classic",
    algorithm: "q",
    name: "test",
    created: "2026-10-29",
    episodes: 1,
    settings: defaults,
    q: { "---------": { 4: 0.2 } },
  };
  expect(validateModel(JSON.parse(JSON.stringify(model)))).toEqual(model);
  expect(() => validateModel({ ...model, game: "ultimate" })).toThrow();
  expect(() => validateModel({ ...model, version: 2 })).toThrow();
  expect(() =>
    validateModel({ ...model, q: { "---------": { 9: 2 } } }),
  ).toThrow();
  expect(() =>
    validateModel({ ...model, q: { "---------": { 2: Infinity } } }),
  ).toThrow();
});
it("학습한 Q 정책은 고정된 Random 평가에서 무학습 정책보다 덜 패배한다", () => {
  const q: QTable = {},
    rng = seeded(81);
  for (let i = 0; i < 10000; i++)
    episode(q, { ...defaults, epsilon: 0.8, decay: 0.9995 }, i, rng);
  const losses = (table: QTable) => {
    const random = seeded(52);
    let count = 0;
    for (let i = 0; i < 300; i++) {
      let g = createGame();
      const mark = i % 2 ? "X" : "O";
      while (!g.result)
        g = play(
          g,
          search(g, g.turn === mark ? "q" : "random", 0, table, random).move,
        );
      if (g.result !== "draw" && g.result !== mark) count++;
    }
    return count;
  };
  expect(losses(q)).toBeLessThan(losses({}));
});
