import { useEffect, useRef, useState } from "react";
import { RotateCcw, Undo2, Pause, Play } from "lucide-react";
import {
  createGame,
  play,
  replay,
  type Game,
  type Mode,
  type Mark,
} from "../core/game";
import {
  names,
  algorithms,
  type Algorithm,
  type QTable,
  type Search,
} from "../ai/search";
import { compute } from "../workers/client";
import { read, write } from "../storage/models";
import { Board } from "../components/Board";
import {
  Select,
  NumberField,
  Panel,
  modeOptions,
  Status,
} from "../components/ui";
export interface RecordGame {
  mode: Mode;
  moves: number[];
  result: string;
  label: string;
  searches: Search[];
}
export function SearchView({ data }: { data: Search | null }) {
  return (
    <Panel title="AI의 생각">
      {!data ? (
        <p className="muted">AI가 착수하면 후보 수와 탐색 결과가 표시됩니다.</p>
      ) : (
        <>
          <div className="search-meta">
            {names[data.algorithm]} · {data.nodes.toLocaleString()} 노드 ·{" "}
            {data.ms.toFixed(1)} ms{data.depth && ` · 깊이 ${data.depth}`}
          </div>
          <p className="muted">
            {data.algorithm === "mcts"
              ? "추정 승점률 (승 1 / 무 0.5 / 패 0). 방문 횟수가 가장 많은 수를 선택합니다."
              : data.algorithm === "q"
                ? "학습된 Q-value가 가장 높은 수를 선택합니다."
                : data.algorithm === "random"
                  ? "합법적인 수 중 무작위 선택"
                  : data.algorithm === "rule"
                    ? "승리·방어 및 위치 휴리스틱 점수"
                    : data.depth
                      ? "깊이 제한 휴리스틱 평가 (양수: 유리)"
                      : "완전 탐색 · 양수: 승리 / 0: 무승부 / 음수: 패배"}
          </p>
          <div className="candidates">
            {[...data.candidates]
              .sort((a, b) => (b.visits ?? b.value) - (a.visits ?? a.value))
              .map((c) => (
                <div
                  key={c.move}
                  className={c.move === data.move ? "best" : ""}
                >
                  <span>
                    {c.move === data.move ? "★ " : ""}
                    {c.move >= 9 ? `${Math.floor(c.move / 9) + 1}판 ` : ""}
                    {(c.move % 9) + 1}번
                  </span>
                  <strong>
                    {data.algorithm === "mcts"
                      ? `${(c.value * 100).toFixed(0)}% · ${c.visits}회`
                      : c.value.toFixed(data.algorithm === "q" ? 3 : 0)}
                  </strong>
                </div>
              ))}
          </div>
        </>
      )}
    </Panel>
  );
}
export function Playroom({
  q,
  onRecord,
}: {
  q: QTable;
  onRecord: (r: RecordGame) => void;
}) {
  const [initial] = useState(() =>
    read("match-settings", {
      method: "human-ai",
      human: "X" as Mark,
      ai: "alphabeta" as Algorithm,
      budget: 300,
      depth: 3,
      speed: 650,
      paused: false,
    }),
  );
  const [g, setG] = useState<Game>(() => {
      try {
        const s = read<{ mode: Mode; history: number[] }>("match", {
          mode: "classic",
          history: [],
        });
        return replay(s.mode, s.history);
      } catch {
        return createGame();
      }
    }),
    [method, setMethod] = useState(initial.method),
    [human, setHuman] = useState<Mark>(initial.human),
    [ai, setAi] = useState<Algorithm>(initial.ai),
    [budget, setBudget] = useState(initial.budget),
    [depth, setDepth] = useState(initial.depth),
    [speed, setSpeed] = useState(initial.speed),
    [paused, setPaused] = useState(initial.paused),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [data, setData] = useState<Search | null>(null),
    [analysisGame, setAnalysisGame] = useState<Game | null>(null),
    [comparison, setComparison] = useState<{
      plain: Search;
      pruned: Search;
    } | null>(null),
    [comparing, setComparing] = useState(false),
    [searches, setSearches] = useState<Search[]>([]),
    [cursor, setCursor] = useState<number | null>(null),
    [error, setError] = useState("");
  const isAI =
    method === "ai-ai" || (method === "human-ai" && g.turn !== human);
  const recorded = useRef(Boolean(g.result));
  useEffect(() => {
    try {
      write("match-settings", {
        method,
        human,
        ai,
        budget,
        depth,
        speed,
        paused,
      });
    } catch {
      setError("대국 설정을 저장하지 못했습니다.");
    }
  }, [method, human, ai, budget, depth, speed, paused]);
  useEffect(() => {
    try {
      write("match", { mode: g.mode, history: g.history });
    } catch {
      setError("브라우저 저장 공간이 부족합니다.");
    }
  }, [g]);
  useEffect(() => {
    if (!g.result) {
      recorded.current = false;
      return;
    }
    if (recorded.current) return;
    recorded.current = true;
    onRecord({
      mode: g.mode,
      moves: g.history,
      result: g.result,
      label: "대국실",
      searches,
    });
  }, [g.result]);
  useEffect(() => {
    if (!isAI || g.result || paused || cursor !== null) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      setBusy(true);
      setProgress(0);
      compute<Search>(
        { type: "search", game: g, algorithm: ai, budget, depth, q },
        controller.signal,
        setProgress,
      )
        .then((r) => {
          setAnalysisGame(g);
          setComparison(null);
          setData(r);
          setSearches((s) => [...s, r]);
          setG((s) => play(s, r.move));
        })
        .catch((e) => {
          if (e.name !== "AbortError") setError(String(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, speed);
    return () => {
      clearTimeout(t);
      controller.abort();
      setBusy(false);
    };
  }, [g, isAI, paused, cursor, ai, budget, depth, speed, q]);
  const reset = (mode = g.mode) => {
    setPaused(false);
    setG(createGame(mode));
    setData(null);
    setComparison(null);
    setSearches([]);
    setCursor(null);
  };
  const shown =
    cursor === null ? g : replay(g.mode, g.history.slice(0, cursor));
  return (
    <div className="lab-layout">
      <aside className="settings">
        <Panel title="대국 설정">
          <Select
            label="게임 모드"
            value={g.mode}
            options={modeOptions}
            onChange={(v) => {
              reset(v as Mode);
              if (!algorithms(v).includes(ai)) setAi("alphabeta");
            }}
          />
          <Select
            label="대국 방식"
            value={method}
            options={[
              ["human-human", "사람 vs 사람"],
              ["human-ai", "사람 vs AI"],
              ["ai-ai", "AI vs AI"],
            ]}
            onChange={setMethod}
          />
          <Select
            label="AI 알고리즘"
            value={ai}
            options={algorithms(g.mode).map((a) => [a, names[a]])}
            onChange={(v) => setAi(v as Algorithm)}
          />
          {method === "human-ai" && (
            <Select
              label="나의 차례"
              value={human}
              options={[
                ["X", "선공 · X"],
                ["O", "후공 · O"],
              ]}
              onChange={(v) => {
                setHuman(v as Mark);
                reset();
              }}
            />
          )}
          {g.mode === "ultimate" && ai === "mcts" && (
            <NumberField
              label="MCTS 반복 횟수"
              value={budget}
              onChange={setBudget}
              min={10}
              max={5000}
            />
          )}
          {g.mode === "ultimate" && ai === "alphabeta" && (
            <NumberField
              label="탐색 깊이 (제한 탐색)"
              value={depth}
              onChange={setDepth}
              min={1}
              max={4}
            />
          )}
          <button className="wide" onClick={() => reset()}>
            <RotateCcw size={15} /> 새 게임
          </button>
        </Panel>
        <Panel title="플레이어">
          <div className="player-row">
            <b className="X">X</b>
            <span>
              {method === "ai-ai" || (method === "human-ai" && human === "O")
                ? names[ai]
                : "사람"}
            </span>
            <small>선공</small>
          </div>
          <div className="player-row">
            <b className="O">O</b>
            <span>
              {method === "ai-ai" || (method === "human-ai" && human === "X")
                ? names[ai]
                : "사람"}
            </span>
            <small>후공</small>
          </div>
        </Panel>
        {g.mode === "ultimate" && (
          <Panel title="궁극 틱택토 규칙">
            <p className="muted">
              둔 칸의 번호가 상대의 다음 작은 판을 정합니다. 종료된 판이면
              자유롭게 착수합니다. 작은 판 3개를 한 줄로 점령하면 승리합니다.
            </p>
          </Panel>
        )}
      </aside>
      <div className="game-stage">
        <div className="stage-heading">
          <span>
            {g.mode === "classic" ? "CLASSIC" : "ULTIMATE"}{" "}
            <small> / {g.history.length}수</small>
          </span>
          <Status
            text={
              busy
                ? ai === "mcts"
                  ? `MCTS ${progress} / ${budget}회`
                  : "AI 계산 중"
                : g.result
                  ? g.result === "draw"
                    ? "무승부"
                    : `${g.result} 승리`
                  : `${g.turn}의 차례`
            }
          />
        </div>
        <div className="board-wrap">
          <Board
            game={shown}
            disabled={busy || isAI || cursor !== null}
            onMove={(m) => setG(play(g, m))}
          />
        </div>
        <div className="stage-hint">
          {cursor !== null
            ? `기록 보기 · ${cursor}수`
            : g.result
              ? "대국이 종료되었습니다."
              : g.mode === "ultimate"
                ? g.target === null
                  ? "밝게 표시된 작은 판 어디든 착수하세요."
                  : `${g.target + 1}번 작은 판에 착수하세요.`
                : busy
                  ? "가능한 수를 탐색하고 있습니다."
                  : "빈칸을 선택해 한 수를 두세요."}
        </div>
        <div className="floating-toolbar">
          <button
            aria-label="착수 취소"
            disabled={!g.history.length || cursor !== null}
            onClick={() => {
              setPaused(method === "ai-ai");
              setG(
                replay(
                  g.mode,
                  g.history.slice(
                    0,
                    method === "human-ai" && g.history.length >= 2 ? -2 : -1,
                  ),
                ),
              );
              setData(null);
              setSearches([]);
            }}
          >
            <Undo2 size={16} />
          </button>
          <button aria-label="대국 재시작" onClick={() => reset()}>
            <RotateCcw size={16} />
          </button>
          <button
            aria-label={paused ? "대국 재개" : "대국 일시정지"}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <label className="speed">
            자동 대국 속도
            <input
              aria-label="자동 대국 속도"
              type="range"
              min={50}
              max={1800}
              value={1850 - speed}
              onChange={(e) => setSpeed(1850 - Number(e.target.value))}
            />
          </label>
        </div>
        {error && <p role="alert">{error}</p>}
      </div>
      <aside className="inspector">
        {analysisGame?.mode === "classic" &&
          data &&
          ["minimax", "alphabeta"].includes(data.algorithm) && (
            <Panel title="가지치기 전후 비교">
              <button
                disabled={comparing}
                onClick={async () => {
                  setComparing(true);
                  try {
                    const plain = await compute<Search>({
                      type: "search",
                      game: analysisGame,
                      algorithm: "minimax",
                    });
                    const pruned = await compute<Search>({
                      type: "search",
                      game: analysisGame,
                      algorithm: "alphabeta",
                    });
                    setComparison({ plain, pruned });
                  } catch (e) {
                    setError(String(e));
                  } finally {
                    setComparing(false);
                  }
                }}
              >
                {comparing ? "같은 상태 탐색 중…" : "동일한 판으로 비교"}
              </button>
              {comparison && (
                <dl className="metrics">
                  <div>
                    <dt>Minimax</dt>
                    <dd>
                      {comparison.plain.nodes.toLocaleString()} 노드 ·{" "}
                      {comparison.plain.ms.toFixed(1)} ms
                    </dd>
                  </div>
                  <div>
                    <dt>Alpha-Beta</dt>
                    <dd>
                      {comparison.pruned.nodes.toLocaleString()} 노드 ·{" "}
                      {comparison.pruned.ms.toFixed(1)} ms
                    </dd>
                  </div>
                </dl>
              )}
            </Panel>
          )}
        <SearchView
          data={
            cursor !== null
              ? (searches.find((s) => s.move === g.history[cursor - 1]) ?? null)
              : data
          }
        />
        <Panel title="대국 기록">
          <div className="history">
            <button
              onClick={() => setCursor(null)}
              className={cursor === null ? "selected" : ""}
            >
              현재 대국
            </button>
            {g.history.map((m, i) => (
              <button
                key={i}
                onClick={() => setCursor(i + 1)}
                className={cursor === i + 1 ? "selected" : ""}
              >
                <span>
                  {i + 1}. {i % 2 ? "O" : "X"}
                </span>
                <span>
                  {g.mode === "ultimate" ? `${Math.floor(m / 9) + 1}판 · ` : ""}
                  {(m % 9) + 1}번 칸
                </span>
              </button>
            ))}
          </div>
        </Panel>
      </aside>
    </div>
  );
}
