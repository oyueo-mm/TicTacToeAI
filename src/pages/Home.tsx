import { useEffect, useState } from "react";
import { ArrowUpRight, Play, Pause } from "lucide-react";
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
        <h2>
          TicTacToe<span>AI</span>
        </h2>
        <div className="hero-actions">
          <button className="primary" onClick={() => go("play")}>
            대국 시작하기 <ArrowUpRight size={17} />
          </button>
        </div>
      </div>
      <section className="demo">
        <div className="demo-top">
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
    </div>
  );
}
