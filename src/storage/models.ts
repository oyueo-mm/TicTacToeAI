import { type QTable } from "../ai/search";
import { type Settings } from "../training/qlearning";
export interface Model {
  version: 1;
  game: "classic";
  algorithm: "q";
  id: string;
  name: string;
  created: string;
  episodes: number;
  settings: Settings;
  q: QTable;
}
export function validateModel(value: unknown): Model {
  const m = value as Model;
  if (
    !m ||
    m.version !== 1 ||
    m.game !== "classic" ||
    m.algorithm !== "q" ||
    typeof m.name !== "string" ||
    typeof m.id !== "string" ||
    !Number.isInteger(m.episodes) ||
    m.episodes < 0 ||
    !m.settings ||
    !m.q ||
    typeof m.q !== "object" ||
    Array.isArray(m.q)
  )
    throw new Error("호환되지 않는 모델입니다.");
  for (const [s, row] of Object.entries(m.q)) {
    if (
      !/^[12-]{9}$/.test(s) ||
      !row ||
      typeof row !== "object" ||
      Array.isArray(row)
    )
      throw new Error("잘못된 Q-table");
    for (const [a, v] of Object.entries(row))
      if (!/^[0-8]$/.test(a) || !Number.isFinite(v))
        throw new Error("잘못된 Q-value");
  }
  for (const k of ["alpha", "gamma", "epsilon", "decay"] as const)
    if (
      !Number.isFinite(m.settings[k]) ||
      m.settings[k] < 0 ||
      m.settings[k] > 1
    )
      throw new Error("잘못된 학습 설정");
  return m;
}
export function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}
export function download(model: Model) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(model)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${model.name.replace(/[^\w가-힣-]/g, "_")}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
