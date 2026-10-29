import { useState } from "react";
import {
  Play,
  Pause,
  Square,
  Zap,
  Save,
  Download,
  Upload,
  Trash2,
  Pencil,
} from "lucide-react";
import { Board } from "../components/Board";
import { NumberField, Panel, Select, Status } from "../components/ui";
import { type Training } from "../training/useTraining";
import { type Model, download, validateModel } from "../storage/models";
import { names, type Algorithm } from "../ai/search";
export function TrainingPage({
  t,
  models,
  setModels,
}: {
  t: Training;
  models: Model[];
  setModels: (m: Model[]) => void;
}) {
  const [modelName, setModelName] = useState("나의 Q-learning"),
    [message, setMessage] = useState("");
  const recent = t.samples.slice(-100),
    n = recent.length;
  const ratio = (result: string) =>
    n
      ? `${((recent.filter((s) => s.result === result).length / n) * 100).toFixed(1)}%`
      : "—";
  const change = (k: string, v: number | string) =>
    t.setSettings({ ...t.settings, [k]: v });
  const save = () => {
    const model: Model = {
      version: 1,
      game: "classic",
      algorithm: "q",
      id: crypto.randomUUID(),
      name: modelName || "Q-learning",
      created: new Date().toISOString(),
      episodes: t.total,
      settings: { ...t.settings },
      q: structuredClone(t.q),
    };
    setModels([...models, model]);
    setMessage("모델을 저장했습니다.");
  };
  return (
    <div className="lab-layout training-layout">
      <aside className="settings">
        <Panel title="Q-learning 설정">
          <NumberField
            disabled={t.running}
            label="학습 에피소드 수"
            value={t.settings.episodes}
            onChange={(v) => change("episodes", v)}
            min={1}
            max={1000000}
          />
          {(
            [
              ["alpha", "학습률 α"],
              ["gamma", "할인율 γ"],
              ["epsilon", "탐험률 ε"],
              ["decay", "탐험률 감소 계수"],
            ] as const
          ).map(([k, l]) => (
            <NumberField
              key={k}
              disabled={t.running}
              label={l}
              value={t.settings[k]}
              onChange={(v) => change(k, v)}
              max={1}
              step={0.01}
            />
          ))}
          <Select
            disabled={t.running}
            label="학습 상대"
            value={t.settings.opponent}
            options={[
              ["self", "Self-play"],
              ...(["random", "rule", "alphabeta"] as Algorithm[]).map(
                (a) => [a, names[a]] as [string, string],
              ),
            ]}
            onChange={(v) => change("opponent", v)}
          />
          <button disabled={t.running} className="wide" onClick={t.reset}>
            학습 초기화
          </button>
        </Panel>
      </aside>
      <div className="game-stage">
        <div className="stage-heading">
          <span>
            Q-LEARNING <small>/ 일반 틱택토</small>
          </span>
          <Status
            text={
              t.running
                ? t.turbo
                  ? "고속 학습 중"
                  : "일반 학습 중"
                : "학습 대기"
            }
          />
        </div>
        <div className="board-wrap">
          <Board game={t.board} />
        </div>
        <div className="stage-hint">
          {t.total.toLocaleString()} 에피소드 ·{" "}
          {t.running
            ? t.turbo
              ? "배치 연산 중"
              : "실제 학습 대국 재생 중"
            : "선공과 후공을 교대로 학습합니다."}
        </div>
        <div className="floating-toolbar training-toolbar">
          <button
            aria-label="단일 에피소드 실행"
            disabled={t.running}
            onClick={() => t.start(false, 1)}
          >
            <Play size={15} /> 1회
          </button>
          <button
            className="primary"
            disabled={t.running}
            onClick={() => t.start(false)}
          >
            일반 학습
          </button>
          <button disabled={t.running} onClick={() => t.start(true)}>
            <Zap size={15} /> 고속 학습
          </button>
          <button
            aria-label={t.running ? "학습 일시정지" : "학습 재개"}
            disabled={!t.running && !t.canResume}
            onClick={() => t.setRunning(!t.running)}
          >
            <>{t.running ? <Pause size={15} /> : <Play size={15} />}</>
          </button>
          <button aria-label="학습 중단" onClick={t.stop}>
            <Square size={14} />
          </button>
          <label className="speed">
            학습 속도
            <input
              aria-label="학습 속도"
              type="range"
              min={30}
              max={600}
              value={630 - t.speed}
              onChange={(e) => t.setSpeed(630 - Number(e.target.value))}
            />
          </label>
        </div>
        {t.error && <p role="alert">{t.error}</p>}
      </div>
      <aside className="inspector">
        {t.samples.at(-1)?.decisions?.length ? (
          <Panel title="최근 에피소드 · 학습 판단">
            <div className="candidates">
              {t.samples.at(-1)!.decisions.map((d, i) => (
                <div key={i}>
                  <span>
                    {d.move + 1}번 · {d.exploring ? "탐험" : "활용"}
                  </span>
                  <strong>
                    {d.before.toFixed(3)} → {d.after.toFixed(3)}
                  </strong>
                </div>
              ))}
            </div>
            <p className="muted">선택된 행동의 실제 Q-value 업데이트입니다.</p>
          </Panel>
        ) : null}
        <Panel title="실시간 학습 통계">
          <dl className="metrics">
            <div>
              <dt>누적 에피소드</dt>
              <dd>{t.total.toLocaleString()}</dd>
            </div>
            <div>
              <dt>최근 승률 (100회)</dt>
              <dd>{ratio("win")}</dd>
            </div>
            <div>
              <dt>무승부 / 패배율</dt>
              <dd>
                {ratio("draw")} / {ratio("loss")}
              </dd>
            </div>
            <div>
              <dt>평균 보상</dt>
              <dd>
                {n
                  ? (recent.reduce((a, s) => a + s.reward, 0) / n).toFixed(3)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>현재 ε</dt>
              <dd>
                {(t.settings.epsilon * t.settings.decay ** t.total).toFixed(4)}
              </dd>
            </div>
            <div>
              <dt>계산 처리량</dt>
              <dd>
                {t.total ? Math.round(t.rate).toLocaleString() : "—"} ep/s
              </dd>
            </div>
            <div>
              <dt>학습된 상태</dt>
              <dd>{Object.keys(t.q).length.toLocaleString()}</dd>
            </div>
          </dl>
          <p className="muted">
            일반 모드는 매 착수를 재생합니다. 고속 모드는 100회 단위로 계산하며
            배치 사이에 일시정지·중단됩니다.
          </p>
          {t.samples.length > 0 && (
            <p className="muted">
              최근 에피소드 Q 업데이트 총 변화량:{" "}
              {t.samples.at(-1)!.delta.toFixed(4)}
            </p>
          )}
        </Panel>
        <Panel title="모델 보관함">
          <label className="field">
            <span>모델 이름</span>
            <input
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              maxLength={80}
            />
          </label>
          <div className="button-row">
            <button disabled={!Object.keys(t.q).length} onClick={save}>
              <Save size={14} /> 저장
            </button>
            <label className="file-button">
              <Upload size={14} /> 가져오기
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    if (file.size > 20e6)
                      throw new Error("20MB 이하 파일을 선택하세요.");
                    const m = validateModel(JSON.parse(await file.text()));
                    setModels([...models, { ...m, id: crypto.randomUUID() }]);
                    setMessage("모델을 가져왔습니다.");
                  } catch (err) {
                    setMessage(String(err));
                  }
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {models.map((m) => (
            <div key={m.id} className="model">
              <strong>{m.name}</strong>
              <small>
                {m.episodes.toLocaleString()} ep ·{" "}
                {new Date(m.created).toLocaleDateString("ko-KR")}
              </small>
              <div className="button-row">
                <button
                  disabled={t.running}
                  onClick={() => {
                    t.load(m.q, m.episodes, m.settings);
                    setMessage(`${m.name} 모델을 대국실에 적용했습니다.`);
                  }}
                >
                  적용
                </button>
                <button
                  aria-label={`${m.name} 이름 변경`}
                  onClick={() => {
                    const name = prompt("모델 이름", m.name);
                    if (name?.trim())
                      setModels(
                        models.map((x) =>
                          x.id === m.id
                            ? { ...x, name: name.trim().slice(0, 80) }
                            : x,
                        ),
                      );
                  }}
                >
                  <Pencil size={13} />
                </button>
                <button
                  aria-label={`${m.name} 내보내기`}
                  onClick={() => download(m)}
                >
                  <Download size={13} />
                </button>
                <button
                  aria-label={`${m.name} 삭제`}
                  onClick={() => setModels(models.filter((x) => x.id !== m.id))}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          {!models.length && (
            <p className="muted">
              학습한 모델을 저장하고 대국실의 Q-learning으로 사용하세요.
            </p>
          )}
          <p role="status" className="muted">
            {message}
          </p>
        </Panel>
      </aside>
    </div>
  );
}
