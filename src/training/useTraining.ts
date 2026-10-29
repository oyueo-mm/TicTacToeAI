import { useEffect, useRef, useState } from "react";
import { defaults, type Settings, type Episode } from "./qlearning";
import { type QTable } from "../ai/search";
import { compute } from "../workers/client";
import { createGame, replay, type Game } from "../core/game";
import { read, write } from "../storage/models";
export interface TrainingState {
  q: QTable;
  samples: Episode[];
  settings: Settings;
  total: number;
}
export function useTraining() {
  const [saved] = useState(() =>
    read<TrainingState>("training", {
      q: {},
      samples: [],
      settings: defaults,
      total: 0,
    }),
  );
  const [q, setQ] = useState<QTable>(saved.q),
    [samples, setSamples] = useState(saved.samples),
    [total, setTotal] = useState(saved.total),
    [settings, setSettings] = useState<Settings>(saved.settings),
    [running, setRunning] = useState(false),
    [turbo, setTurbo] = useState(false),
    [speed, setSpeed] = useState(150),
    [board, setBoard] = useState<Game>(createGame()),
    [rate, setRate] = useState(0),
    [error, setError] = useState("");
  const target = useRef(0),
    pending = useRef<{
      q: QTable;
      samples: Episode[];
      ms: number;
      cursor: number;
    } | null>(null),
    qRef = useRef(q),
    samplesRef = useRef(samples),
    totalRef = useRef(total);
  qRef.current = q;
  samplesRef.current = samples;
  totalRef.current = total;
  useEffect(() => {
    if (!running) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const commit = (r: { q: QTable; samples: Episode[]; ms: number }) => {
      // Advance the scheduler atomically; React may render after the next timer.
      qRef.current = r.q;
      samplesRef.current = [...samplesRef.current, ...r.samples].slice(-10000);
      totalRef.current += r.samples.length;
      setQ(qRef.current);
      setSamples(samplesRef.current);
      setTotal(totalRef.current);
      setRate(r.samples.length / Math.max(r.ms / 1000, 0.001));
      pending.current = null;
    };
    const tick = async () => {
      try {
        if (totalRef.current >= target.current) {
          setRunning(false);
          return;
        }
        let p = pending.current;
        if (!p) {
          const r = await compute<{
            q: QTable;
            samples: Episode[];
            ms: number;
          }>(
            {
              type: "train",
              q: qRef.current,
              settings,
              index: totalRef.current,
              count: turbo
                ? Math.min(100, target.current - totalRef.current)
                : 1,
            },
            controller.signal,
          );
          if (controller.signal.aborted) return;
          p = { ...r, cursor: 0 };
          pending.current = p;
        }
        if (turbo) {
          setBoard(replay("classic", p.samples.at(-1)!.moves));
          commit(p);
        } else {
          const moves = p.samples[0].moves;
          p.cursor++;
          setBoard(replay("classic", moves.slice(0, p.cursor)));
          if (p.cursor > moves.length) {
            commit(p);
          }
        }
        if (!controller.signal.aborted)
          timer = setTimeout(tick, turbo ? 0 : speed);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError(String(e));
          setRunning(false);
        }
      }
    };
    timer = setTimeout(tick, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [running, turbo, speed, settings]);
  useEffect(() => {
    try {
      write("training", { q, samples, total, settings });
    } catch {
      setError("저장 공간이 부족합니다. 모델을 내보내 주세요.");
    }
  }, [q, samples, total, settings]);
  const start = (fast: boolean, count = settings.episodes) => {
    target.current = totalRef.current + count;
    setTurbo(fast);
    setRunning(true);
  };
  const reset = () => {
    setRunning(false);
    pending.current = null;
    setQ({});
    setSamples([]);
    setTotal(0);
    setRate(0);
    setBoard(createGame());
  };
  const load = (table: QTable, episodes = 0, config = settings) => {
    setRunning(false);
    pending.current = null;
    setQ(structuredClone(table));
    setSamples([]);
    setTotal(episodes);
    setSettings(config);
    target.current = episodes;
    setBoard(createGame());
  };
  return {
    q,
    samples,
    total,
    settings,
    setSettings,
    running,
    canResume: total < target.current,
    setRunning,
    turbo,
    speed,
    setSpeed,
    board,
    rate,
    error,
    start,
    reset,
    load,
    stop: () => {
      setRunning(false);
      pending.current = null;
    },
  };
}
export type Training = ReturnType<typeof useTraining>;
