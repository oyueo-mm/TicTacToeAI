import { useCallback, useEffect, useRef, useState } from "react";
import {
  Home as HomeIcon,
  Grid2X2,
  Swords,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { Home } from "./pages/Home";
import { Playroom, type RecordGame } from "./pages/Playroom";
import { Arena } from "./pages/Arena";
import type { QTable } from "./ai/search";
import { read, write, validateModel, type Model } from "./storage/models";
const pages = [
  { id: "home", label: "홈", Icon: HomeIcon },
  { id: "play", label: "대국실", Icon: Grid2X2 },
  { id: "arena", label: "AI Arena", Icon: Swords },
] as const;
type Page = (typeof pages)[number]["id"];
export default function App() {
  const [page, setPage] = useState<Page>("home"),
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
    [legacyQ] = useState(() => read<{ q: QTable }>("training", { q: {} }).q),
    [modelId, setModelId] = useState(() => read("active-model", "current")),
    [storageError, setStorageError] = useState("");
  const q = models.find((m) => m.id === modelId)?.q ?? legacyQ;
  const modelSelection = {
    models,
    modelId: models.some((m) => m.id === modelId) ? modelId : "current",
    onModelChange: setModelId,
    onImport: (model: Model) => {
      setModels((s) => [...s, model]);
      setModelId(model.id);
    },
  };
  const menuRef = useRef<HTMLButtonElement>(null),
    navRef = useRef<HTMLElement>(null);
  const go = (p: string) => {
    if (!pages.some((item) => item.id === p)) return;
    setPage(p as Page);
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
      write("active-model", modelId);
    } catch {
      setStorageError(
        "브라우저 저장 공간이 부족해 변경 사항을 저장하지 못했습니다.",
      );
    }
  }, [models, collapsed, records, modelId]);
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
            </button>
          ))}
        </div>
        <div className="nav-bottom">
          <a
            aria-label="GitHub"
            href="https://github.com/oyueo-mm/TicTacToeAI"
            target="_blank"
            rel="noreferrer"
          >
            <span>GitHub</span>
            <ArrowUpRight size={15} />
          </a>
          <div className="nav-controls">
            <button
              className="icon-button"
              aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
              aria-expanded={!collapsed}
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
        </header>
        <main id="content">
          <div hidden={page !== "home"}>
            {page === "home" && <Home go={go} />}
          </div>
          <div hidden={page !== "play"}>
            <Playroom
              q={q}
              onRecord={record}
              records={records}
              modelSelection={modelSelection}
            />
          </div>
          <div hidden={page !== "arena"}>
            <Arena q={q} onRecord={record} modelSelection={modelSelection} />
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
