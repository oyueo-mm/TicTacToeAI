import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowRight, Play, Pause } from "lucide-react";
import { createGame, legal, play, type Mode } from "../core/game";
import { search } from "../ai/search";
import { Board } from "../components/Board";
export function Home({ go }: { go: (p: string) => void }) {
  const [mode, setMode] = useState<Mode>("classic"),
    [g, setG] = useState(() => createGame()),
    [paused, setPaused] = useState(false),
    [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const fn = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, []);
  useEffect(() => {
    if (
      paused ||
      !visible ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const t = setTimeout(
      () =>
        setG((s) =>
          s.result
            ? createGame(mode)
            : play(s, search(s, Math.random() < 0.25 ? "random" : "rule").move),
        ),
      g.result ? 1900 : mode === "ultimate" ? 260 : 850,
    );
    return () => clearTimeout(t);
  }, [g, paused, visible, mode]);
  return (
    <div className="home">
      <div className="hero-copy">
        <div className="eyebrow">
          <span /> PLAY. THINK. LEARN.
        </div>
        <h2>
          TicTacToe<span>AI</span>
          <small>
            한 수씩 발견하는
            <br />
            인공지능의 생각.
          </small>
        </h2>
        <p>
          틱택토를 플레이하고, 인공지능의 전략과
          <br className="desktop" /> 학습 과정을 탐구하세요.
        </p>
        <div className="hero-actions">
          <button className="primary" onClick={() => go("play")}>
            대국 시작하기 <ArrowUpRight size={17} />
          </button>
          <button onClick={() => go("training")}>
            AI 학습하기 <ArrowRight size={17} />
          </button>
        </div>
        <div className="hero-tags">
          일반 & 궁극 틱택토 <span>·</span> 탐색 알고리즘 <span>·</span>{" "}
          강화학습
        </div>
      </div>
      <section className="demo">
        <div className="demo-top">
          <span className="eyebrow">LIVE PLAYGROUND</span>
          <span className="live-dot">자동 대국</span>
        </div>
        <div className="segmented">
          {(["classic", "ultimate"] as Mode[]).map((m) => (
            <button
              key={m}
              aria-pressed={mode === m}
              onClick={() => {
                setMode(m);
                setG(createGame(m));
              }}
            >
              {m === "classic" ? "일반 틱택토" : "궁극 틱택토"}
            </button>
          ))}
        </div>
        <Board game={g} />
        <div className="demo-footer">
          <span className="player X">
            X <small>Heuristic + Random</small>
          </span>
          <span className="vs">vs</span>
          <span className="player O">
            O <small>Heuristic + Random</small>
          </span>
          <button
            className="icon-button"
            aria-label={paused ? "데모 재개" : "데모 일시정지"}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
        </div>
        <div className="demo-caption">
          {g.result
            ? g.result === "draw"
              ? "무승부 · 다음 대국을 준비합니다"
              : `${g.result} 승리 · 다음 대국을 준비합니다`
            : `${g.turn}의 차례 · ${legal(g).length}개의 가능한 수`}
        </div>
      </section>
      <div className="home-foot">
        작은 게임판 위의, 무한한 실험.<span>INTERACTIVE AI LAB · v0.1</span>
      </div>
    </div>
  );
}
