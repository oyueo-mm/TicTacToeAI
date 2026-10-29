import { legal, lines, type Game, type Result } from "../core/game";
function WinLine({ cells }: { cells: Result[] }) {
  const line = lines.find(
    (l) =>
      (cells[l[0]] === "X" || cells[l[0]] === "O") &&
      l.every((i) => cells[i] === cells[l[0]]),
  );
  if (!line) return null;
  const point = (i: number) => [
    16.67 + (i % 3) * 33.33,
    16.67 + Math.floor(i / 3) * 33.33,
  ];
  const a = point(line[0]),
    b = point(line[2]);
  return (
    <svg className={`win-line ${cells[line[0]]}`} viewBox="0 0 100 100">
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
    </svg>
  );
}
export function Board({
  game,
  onMove,
  disabled = false,
}: {
  game: Game;
  onMove?: (m: number) => void;
  disabled?: boolean;
}) {
  const available = legal(game),
    last = game.history.at(-1);
  const cell = (i: number) => (
    <button
      key={i}
      className={`cell ${game.cells[i] ?? ""} ${last === i ? "last" : ""}`}
      disabled={disabled || !onMove || !available.includes(i)}
      aria-label={`${game.mode === "ultimate" ? `${Math.floor(i / 9) + 1}번 작은 판 ` : ""}${(i % 9) + 1}번 칸 ${game.cells[i] ?? "빈칸"}`}
      onClick={() => onMove?.(i)}
    >
      {game.cells[i] && (
        <span key={`${i}-${game.cells[i]}`} className={`mark ${game.cells[i]}`}>
          {game.cells[i]}
        </span>
      )}
    </button>
  );
  return (
    <div className={`board ${game.mode}`} data-testid="board">
      {game.mode === "classic" ? (
        <>
          <div className="grid9">{game.cells.map((_, i) => cell(i))}</div>
          <WinLine cells={game.cells} />
        </>
      ) : (
        <>
          {game.local.map((v, b) => (
            <div
              key={b}
              className={`subboard ${available.some((i) => Math.floor(i / 9) === b) ? "available" : "inactive"} ${v ? "finished" : ""}`}
            >
              <div className="grid9">
                {Array.from({ length: 9 }, (_, i) => cell(b * 9 + i))}
              </div>
              {v && (
                <div className={`captured ${v}`}>{v === "draw" ? "—" : v}</div>
              )}
            </div>
          ))}
          <WinLine cells={game.local} />
        </>
      )}
    </div>
  );
}
