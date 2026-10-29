import { useEffect, useRef, useState } from "react";
import { createGame, play, replay, type Game, type Mode } from "../core/game";
import {
  algorithms,
  names,
  type Algorithm,
  type QTable,
  type Search,
} from "../ai/search";
import { compute } from "../workers/client";
import { Board } from "../components/Board";
import {
  Panel,
  Select,
  NumberField,
  modeOptions,
  Status,
} from "../components/ui";
import { type RecordGame } from "./Playroom";
import { ModelPicker, type ModelSelection } from "../components/ModelPicker";
export function Arena({
  q,
  onRecord,
  modelSelection,
  watchRequest = 0,
}: {
  q: QTable;
  onRecord: (r: RecordGame) => void;
  modelSelection: ModelSelection;
  watchRequest?: number;
}) {
  const [mode, setMode] = useState<Mode>("classic"),
    [a, setA] = useState<Algorithm>("alphabeta"),
    [b, setB] = useState<Algorithm>("minimax"),
    [count, setCount] = useState(10),
    [alternate, setAlternate] = useState(true),
    [fast, setFast] = useState(false),
    [running, setRunning] = useState(false),
    [game, setGame] = useState<Game>(createGame()),
    [results, setResults] = useState<(RecordGame & { aMark: string })[]>([]),
    [searches, setSearches] = useState<Search[]>([]),
    [view, setView] = useState<RecordGame | null>(null),
    [cursor, setCursor] = useState(0),
    [filter, setFilter] = useState("all"),
    [error, setError] = useState("");
  const aMark = alternate && results.length % 2 ? "O" : "X";
  const cancelCurrentRun = useRef<() => void>(() => {});
  useEffect(() => {
    if (!watchRequest) return;
    cancelCurrentRun.current();
    setMode("classic");
    setA("alphabeta");
    setB("minimax");
    setCount(10);
    setAlternate(true);
    setFast(false);
    setGame(createGame());
    setResults([]);
    setSearches([]);
    setView(null);
    setCursor(0);
    setFilter("all");
    setError("");
    setRunning(true);
  }, [watchRequest]);
  useEffect(() => {
    if (!running) return;
    if (results.length >= count) {
      setRunning(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        try {
          if (game.result) {
            const r = {
              mode,
              moves: game.history,
              result: game.result,
              label: `${names[a]} vs ${names[b]}`,
              searches,
              aMark,
            };
            setResults((s) => [...s, r]);
            onRecord(r);
            setGame(createGame(mode));
            setSearches([]);
            return;
          }
          const r = await compute<Search>(
            {
              type: "search",
              game,
              algorithm: game.turn === aMark ? a : b,
              budget: 200,
              depth: 2,
              q,
            },
            controller.signal,
          );
          if (controller.signal.aborted) return;
          setSearches((s) => [...s, r]);
          setGame((g) => play(g, r.move));
        } catch (e) {
          if ((e as Error).name !== "AbortError") {
            setError(String(e));
            setRunning(false);
          }
        }
      },
      fast ? 0 : 400,
    );
    const cancel = () => {
      clearTimeout(timer);
      controller.abort();
    };
    cancelCurrentRun.current = cancel;
    return cancel;
  }, [running, game, results.length, count, a, b, mode, alternate, fast, q]);
  const wins = results.filter((r) => r.result === r.aMark).length,
    draws = results.filter((r) => r.result === "draw").length;
  const shown = view ? replay(view.mode, view.moves.slice(0, cursor)) : game;
  return (
    <div className="lab-layout">
      <aside className="settings">
        <Panel title="Arena 설정">
          <Select
            label="게임 모드"
            disabled={running}
            value={mode}
            options={modeOptions}
            onChange={(v) => {
              setMode(v as Mode);
              setGame(createGame(v as Mode));
              setResults([]);
              setSearches([]);
              setView(null);
              if (!algorithms(v).includes(a)) setA("alphabeta");
              if (!algorithms(v).includes(b)) setB("mcts");
            }}
          />
          {(
            [
              ["AI A", a, setA],
              ["AI B", b, setB],
            ] as const
          ).map(([label, value, set]) => (
            <Select
              key={label}
              disabled={running}
              label={label}
              value={value}
              options={algorithms(mode).map((v) => [v, names[v]])}
              onChange={(v) => {
                set(v as Algorithm);
                setGame(createGame(mode));
                setResults([]);
                setSearches([]);
                setView(null);
              }}
            />
          ))}
          {(a === "q" || b === "q") && <ModelPicker {...modelSelection} />}
          <NumberField
            label="대국 횟수"
            disabled={running}
            min={1}
            max={1000}
            value={count}
            onChange={setCount}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={alternate}
              disabled={running || game.history.length > 0}
              onChange={(e) => setAlternate(e.target.checked)}
            />{" "}
            선공·후공 교대
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={fast}
              onChange={(e) => setFast(e.target.checked)}
            />{" "}
            고속 대국
          </label>
          <div className="button-row">
            <button
              className="primary"
              onClick={() => {
                setView(null);
                setRunning(!running);
              }}
            >
              {running ? "일시정지" : results.length ? "재개" : "연속 대국"}
            </button>
            <button
              disabled={running}
              onClick={() => {
                setCount(results.length + 1);
                setRunning(true);
                setView(null);
              }}
            >
              단일 대국
            </button>
          </div>
          <button
            disabled={running}
            onClick={() => {
              setResults([]);
              setSearches([]);
              setGame(createGame(mode));
              setView(null);
            }}
          >
            Arena 초기화
          </button>
        </Panel>
        <Panel title="AI A 기준 결과">
          <div className="arena-score">
            <div>
              <strong>{wins}</strong>
              <small>승</small>
            </div>
            <div>
              <strong>{draws}</strong>
              <small>무</small>
            </div>
            <div>
              <strong>{results.length - wins - draws}</strong>
              <small>패</small>
            </div>
          </div>
          <p className="muted">
            {results.length} / {count} 대국 완료
          </p>
        </Panel>
      </aside>
      <div className="game-stage">
        <div className="stage-heading">
          <span>AI ARENA</span>
          <Status
            text={view ? "기록 재생" : running ? "대국 진행 중" : "대기"}
          />
        </div>
        <div className="board-wrap">
          <Board game={shown} />
        </div>
        <div className="stage-hint">
          {view
            ? `${cursor} / ${view.moves.length}수`
            : `AI A ${names[a]} · AI B ${names[b]}`}
        </div>
        {view && (
          <div className="floating-toolbar">
            <button onClick={() => setCursor(Math.max(0, cursor - 1))}>
              이전 수
            </button>
            <input
              aria-label="기록 재생 위치"
              type="range"
              min={0}
              max={view.moves.length}
              value={cursor}
              onChange={(e) => setCursor(Number(e.target.value))}
            />
            <button
              onClick={() => setCursor(Math.min(view.moves.length, cursor + 1))}
            >
              다음 수
            </button>
          </div>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
      <aside className="inspector">
        <Panel title="결과별 대국 기록">
          <Select
            label="결과 필터"
            value={filter}
            options={[
              ["all", "모든 결과"],
              ["win", "AI A 승리"],
              ["draw", "무승부"],
              ["loss", "AI A 패배"],
            ]}
            onChange={setFilter}
          />
          <div className="history">
            {results
              .map((r, i) => ({ ...r, index: i }))
              .filter(
                (r) =>
                  filter === "all" ||
                  (filter === "draw" && r.result === "draw") ||
                  (filter === "win" && r.result === r.aMark) ||
                  (filter === "loss" &&
                    r.result !== "draw" &&
                    r.result !== r.aMark),
              )
              .map((r) => (
                <button
                  key={r.index}
                  onClick={() => {
                    setRunning(false);
                    setView(r);
                    setCursor(r.moves.length);
                  }}
                >
                  <span>대국 {r.index + 1}</span>
                  <strong>
                    {r.result === "draw"
                      ? "무승부"
                      : r.result === r.aMark
                        ? "A 승리"
                        : "B 승리"}
                  </strong>
                </button>
              ))}
          </div>
          {!results.length && (
            <p className="muted">
              AI 대국이 끝나면 결과와 전체 기록을 볼 수 있습니다.
            </p>
          )}
        </Panel>
      </aside>
    </div>
  );
}
