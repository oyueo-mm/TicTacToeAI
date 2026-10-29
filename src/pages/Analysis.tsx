import { useMemo, useState } from "react";
import { type Training } from "../training/useTraining";
import { type Model } from "../storage/models";
import { type RecordGame } from "./Playroom";
import { Board } from "../components/Board";
import { createGame, play, replay } from "../core/game";
import { compute } from "../workers/client";
import { type Search } from "../ai/search";
import { Panel } from "../components/ui";
function Chart({
  values,
  color = "#6a95d8",
  label,
  extra = [],
}: {
  values: number[];
  color?: string;
  label: string;
  extra?: { values: number[]; color: string }[];
}) {
  if (!values.length)
    return (
      <div className="empty">학습을 실행하면 실제 데이터가 표시됩니다.</div>
    );
  const lo = Math.min(0, ...values),
    hi = extra.length ? 1 : Math.max(0.001, ...values),
    step = Math.max(1, Math.ceil(values.length / 180)),
    points = values
      .map((v, i) => ({ v, i }))
      .filter((_, i) => i % step === 0 || i === values.length - 1)
      .map(
        ({ v, i }) =>
          `${36 + (i / Math.max(1, values.length - 1)) * 520},${175 - ((v - lo) / (hi - lo)) * 145}`,
      )
      .join(" ");
  return (
    <svg className="chart" viewBox="0 0 580 210" role="img" aria-label={label}>
      <text x="2" y="33">
        {hi.toFixed(2)}
      </text>
      <text x="2" y="179">
        {lo.toFixed(2)}
      </text>
      {[30, 78, 126, 175].map((y) => (
        <line key={y} x1="36" y1={y} x2="560" y2={y} stroke="#edf0f4" />
      ))}
      <polyline fill="none" stroke={color} strokeWidth="2.5" points={points} />
      {extra.map((series, index) => (
        <polyline
          key={index}
          fill="none"
          stroke={series.color}
          strokeWidth="2"
          points={series.values
            .map((v, i) => ({ v, i }))
            .filter((_, i) => i % step === 0 || i === series.values.length - 1)
            .map(
              ({ v, i }) =>
                `${36 + (i / Math.max(1, series.values.length - 1)) * 520},${175 - ((v - lo) / (hi - lo)) * 145}`,
            )
            .join(" ")}
        />
      ))}
      <text x="36" y="202">
        최근 {values.length}회
      </text>
      <text x="520" y="202">
        에피소드
      </text>
    </svg>
  );
}
export function Analysis({
  t,
  models,
  records,
}: {
  t: Training;
  models: Model[];
  records: RecordGame[];
}) {
  const [selected, setSelected] = useState<RecordGame | null>(null),
    [cursor, setCursor] = useState(0),
    [evaluations, setEvaluations] = useState<
      Record<string, { win: number; draw: number; loss: number }>
    >({}),
    [evaluating, setEvaluating] = useState(false),
    [error, setError] = useState("");
  const roll = useMemo(
    () =>
      t.samples.map((_, i) => {
        const group = t.samples.slice(Math.max(0, i - 99), i + 1);
        return {
          win: group.filter((s) => s.result === "win").length / group.length,
          draw: group.filter((s) => s.result === "draw").length / group.length,
          loss: group.filter((s) => s.result === "loss").length / group.length,
          reward: group.reduce((a, s) => a + s.reward, 0) / group.length,
        };
      }),
    [t.samples],
  );
  const searchStats = useMemo(() => {
    const map: Record<string, { nodes: number; ms: number; n: number }> = {};
    for (const r of records)
      for (const s of r.searches) {
        const row =
          map[s.algorithm] ?? (map[s.algorithm] = { nodes: 0, ms: 0, n: 0 });
        row.n++;
        row.nodes += s.nodes;
        row.ms += s.ms;
      }
    return map;
  }, [records]);
  const evaluate = async () => {
    setEvaluating(true);
    try {
      const rows: typeof evaluations = {};
      for (const model of models) {
        const score = { win: 0, draw: 0, loss: 0 };
        for (let i = 0; i < 20; i++) {
          let g = createGame();
          const mark = i % 2 ? "O" : "X";
          while (!g.result) {
            const r = await compute<Search>({
              type: "search",
              game: g,
              algorithm: g.turn === mark ? "q" : "random",
              q: model.q,
            });
            g = play(g, r.move);
          }
          score[
            g.result === "draw" ? "draw" : g.result === mark ? "win" : "loss"
          ]++;
        }
        rows[model.id] = score;
      }
      setEvaluations(rows);
    } catch (e) {
      setError(String(e));
    } finally {
      setEvaluating(false);
    }
  };
  return (
    <div className="analysis-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">EXPERIMENT INSIGHTS</div>
          <h2>학습이 남긴 변화</h2>
          <p className="muted">
            수집된 에피소드와 실제 대국의 탐색 결과를 살펴보세요.
          </p>
        </div>
        <span className="status">{t.total.toLocaleString()} 에피소드</span>
      </div>
      <div className="charts">
        <Panel title="최근 100회 승률">
          <Chart
            values={roll.map((r) => r.win)}
            label="최근 100회 이동 승률, 0~1"
          />
        </Panel>
        <Panel title="평균 보상">
          <Chart
            values={roll.map((r) => r.reward)}
            color="#56b5a4"
            label="최근 100회 평균 보상"
          />
        </Panel>
        <Panel title="승 · 무 · 패 추이">
          <Chart
            values={roll.map((r) => r.draw)}
            color="#91a4bb"
            label="최근 100회 승 무 패 비율"
            extra={[
              { values: roll.map((r) => r.win), color: "#6a95d8" },
              { values: roll.map((r) => r.loss), color: "#d69b9b" },
            ]}
          />
          <div className="legend">
            최근 100회 · 승{" "}
            {roll.length ? (roll.at(-1)!.win * 100).toFixed(1) : "—"}% · 무{" "}
            {roll.length ? (roll.at(-1)!.draw * 100).toFixed(1) : "—"}% · 패{" "}
            {roll.length ? (roll.at(-1)!.loss * 100).toFixed(1) : "—"}%
          </div>
        </Panel>
        <Panel title="Q-value 업데이트 변화량">
          <Chart
            values={t.samples.map((s) => s.delta)}
            label="에피소드별 Q-value 절대 업데이트 합계"
            color="#8c89c5"
          />
        </Panel>
      </div>
      <Panel title="저장 모델 · 학습 설정 및 성능 비교">
        <button disabled={evaluating || !models.length} onClick={evaluate}>
          {evaluating ? "평가 중…" : "Random 상대 20회 평가 (선후공 교대)"}
        </button>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>모델</th>
                <th>에피소드</th>
                <th>α / γ / ε / 감소</th>
                <th>학습 상대</th>
                <th>평가 승 / 무 / 패</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.episodes}</td>
                  <td>
                    {m.settings.alpha} / {m.settings.gamma} /{" "}
                    {m.settings.epsilon} / {m.settings.decay}
                  </td>
                  <td>{m.settings.opponent}</td>
                  <td>
                    {evaluations[m.id]
                      ? `${evaluations[m.id].win} / ${evaluations[m.id].draw} / ${evaluations[m.id].loss}`
                      : "평가 전"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!models.length && (
          <p className="muted">
            모델을 저장하면 학습 설정과 평가 결과를 비교할 수 있습니다.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
      </Panel>
      <div className="charts">
        <Panel title="알고리즘별 실제 탐색 통계">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>알고리즘</th>
                  <th>착수</th>
                  <th>평균 노드</th>
                  <th>평균 ms</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(searchStats).map(([name, s]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{s.n}</td>
                    <td>{Math.round(s.nodes / s.n).toLocaleString()}</td>
                    <td>{(s.ms / s.n).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!Object.keys(searchStats).length && (
            <p className="muted">AI 대국이 완료되면 탐색 통계가 쌓입니다.</p>
          )}
        </Panel>
        <Panel title="저장된 대국 다시 보기">
          <div className="history saved-history">
            {records.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelected(r);
                  setCursor(r.moves.length);
                }}
              >
                <span>
                  {r.mode === "classic" ? "일반" : "궁극"} · {r.label}
                </span>
                <strong>
                  {r.result === "draw" ? "무승부" : `${r.result} 승리`}
                </strong>
              </button>
            ))}
          </div>
          {!records.length && (
            <p className="muted">대국실 또는 Arena에서 대국을 완료하세요.</p>
          )}
          {selected && (
            <>
              <div className="replay-board">
                <Board
                  game={replay(selected.mode, selected.moves.slice(0, cursor))}
                />
              </div>
              <label className="field">
                기록 재생 · {cursor}수
                <input
                  aria-label="저장 대국 재생"
                  type="range"
                  min={0}
                  max={selected.moves.length}
                  value={cursor}
                  onChange={(e) => setCursor(Number(e.target.value))}
                />
              </label>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
