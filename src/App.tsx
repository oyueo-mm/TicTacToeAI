import { useCallback, useEffect, useRef, useState } from "react";
import {
  Home as HomeIcon,
  Grid2X2,
  BrainCircuit,
  Swords,
  ChartNoAxesCombined,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { Home } from "./pages/Home";
import { Playroom, type RecordGame } from "./pages/Playroom";
import { TrainingPage } from "./pages/Training";
import { Arena } from "./pages/Arena";
import { Analysis } from "./pages/Analysis";
import { useTraining } from "./training/useTraining";
import { read, write, validateModel, type Model } from "./storage/models";
const pages = [
  { id: "home", label: "홈", Icon: HomeIcon },
  { id: "play", label: "대국실", Icon: Grid2X2 },
  { id: "training", label: "AI 학습", Icon: BrainCircuit },
  { id: "arena", label: "AI Arena", Icon: Swords },
  { id: "analysis", label: "학습 분석", Icon: ChartNoAxesCombined },
];
export default function App() {
  const [page, setPage] = useState("home"),
    [collapsed, setCollapsed] = useState(() => read("nav", false)),
    [open, setOpen] = useState(false),
    [models, setModels] = useState<Model[]>(() => {
      try {
        return read<Model[]>("models", []).map(validateModel);
      } catch {
        return [];
      }
    }),
    [records, setRecords] = useState<RecordGame[]>(() => read("records", [])),
    [storageError, setStorageError] = useState("");
  const t = useTraining();
  const menuRef = useRef<HTMLButtonElement>(null),
    navRef = useRef<HTMLElement>(null);
  const go = (p: string) => {
    setPage(p);
    setOpen(false);
  };
  const record = useCallback(
    (r: RecordGame) => setRecords((s) => [r, ...s].slice(0, 100)),
    [],
  );
  useEffect(() => {
    try {
      write("models", models);
      write("nav", collapsed);
      write("records", records);
    } catch {
      setStorageError("저장 공간이 부족합니다. 모델을 JSON으로 내보내 주세요.");
    }
  }, [models, collapsed, records]);
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement;
    navRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab") {
        const items = navRef.current?.querySelectorAll<
          HTMLButtonElement | HTMLAnchorElement
        >("button,a");
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, [open]);
  return (
    <div className={`shell ${collapsed ? "collapsed" : ""}`}>
      <a href="#content" className="skip">
        본문으로 이동
      </a>
      {open && (
        <button
          className="backdrop"
          aria-label="메뉴 닫기"
          onClick={() => setOpen(false)}
        />
      )}
      <nav
        ref={navRef}
        className={`nav ${open ? "open" : ""}`}
        aria-label="주 메뉴"
      >
        <div className="brand">
          <div className="brand-icon">
            X<span>O</span>
          </div>
          <strong>
            TicTacToe<span>AI</span>
          </strong>
          <button
            className="mobile-close icon-button"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <div className="nav-items">
          {pages.map(({ id, label, Icon }) => (
            <button
              key={id}
              title={label}
              aria-label={label}
              aria-current={page === id ? "page" : undefined}
              className={page === id ? "active" : ""}
              onClick={() => go(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "training" && t.running && <i className="activity" />}
            </button>
          ))}
        </div>
        <div className="nav-bottom">
          <a
            href="https://github.com/oyueo-mm/TicTacToeAI"
            target="_blank"
            rel="noreferrer"
          >
            <span>GitHub</span>
            <ArrowUpRight size={15} />
          </a>
          <div className="nav-version">
            <span>
              AI EXPERIMENT LAB
              <br />
              <small>v0.1.0</small>
            </span>
            <button
              className="icon-button"
              aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
            </button>
          </div>
        </div>
      </nav>
      <div className="workspace" inert={open}>
        <header className="topbar">
          <button
            ref={menuRef}
            className="mobile-menu icon-button"
            aria-label="메뉴 열기"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            실험실 <span>/</span>{" "}
            <strong>{pages.find((p) => p.id === page)?.label}</strong>
          </div>
          <div className="top-right">
            <span className="tiny-dot" /> 브라우저에서 실행되는 AI
            <span className="version">v0.1</span>
          </div>
        </header>
        <main id="content">
          <div hidden={page !== "home"}>
            {page === "home" && <Home go={go} />}
          </div>
          <div hidden={page !== "play"}>
            <Playroom q={t.q} onRecord={record} />
          </div>
          <div hidden={page !== "training"}>
            <TrainingPage t={t} models={models} setModels={setModels} />
          </div>
          <div hidden={page !== "arena"}>
            <Arena q={t.q} onRecord={record} />
          </div>
          <div hidden={page !== "analysis"}>
            {page === "analysis" && (
              <Analysis t={t} models={models} records={records} />
            )}
          </div>
        </main>
        {storageError && (
          <p className="storage-error" role="alert">
            {storageError}
          </p>
        )}
      </div>
    </div>
  );
}
