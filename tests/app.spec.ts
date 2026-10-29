import { test, expect, type Page } from "@playwright/test";
import { defaults } from "../src/training/qlearning";
const stage = (p: Page) => p.locator(".playroom .game-stage");
const board = (p: Page) => stage(p).getByTestId("board");
async function go(p: Page, name: string) {
  const b = p.getByRole("button", { name, exact: true });
  if (!(await b.isVisible()))
    await p.getByRole("button", { name: "메뉴 열기", exact: true }).click();
  await b.click();
}
async function openPanels(p: Page) {
  for (const side of ["왼쪽", "오른쪽"]) {
    const b = p.getByRole("button", {
      name: `${side} 패널 펼치기`,
      exact: true,
    });
    if (await b.isVisible()) await b.click();
  }
}
async function noOverflow(p: Page) {
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
}

test("홈 부제목·관전 버튼 배치와 자동 Arena·설정 변경·재진입", async ({
  page,
}) => {
  await page.goto("");
  const title = page.locator(".hero-copy h2"),
    subtitle = page.getByText("틱택토 인공지능", { exact: true }),
    start = page.getByRole("button", { name: "대국 시작하기", exact: true }),
    watch = page.getByRole("button", { name: "AI 대국 관전하기", exact: true });
  const h = (await title.boundingBox())!,
    s = (await subtitle.boundingBox())!,
    a = (await start.boundingBox())!,
    b = (await watch.boundingBox())!;
  expect(s.x).toBeCloseTo(h.x, 0);
  expect(s.y).toBeGreaterThanOrEqual(h.y + h.height);
  expect(s.y + s.height).toBeLessThan(a.y);
  expect(b.x).toBeCloseTo(a.x, 0);
  expect(b.y).toBeGreaterThanOrEqual(a.y + a.height + 8);
  expect(
    await subtitle.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBeLessThan(
    await title.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  );
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/home-watch-${test.info().project.name}.png`,
    fullPage: true,
  });
  await watch.click();
  const arena = page.locator(".lab-layout:visible");
  await expect(
    page.getByRole("button", {
      name: "AI Arena",
      exact: true,
      includeHidden: true,
    }),
  ).toHaveAttribute("aria-current", "page");
  await expect(arena.getByLabel("AI A", { exact: true })).toHaveValue(
    "alphabeta",
  );
  await expect(arena.getByLabel("AI B", { exact: true })).toHaveValue(
    "minimax",
  );
  await expect(arena.locator(".game-stage .status")).toHaveText("대국 진행 중");
  await expect(arena.locator(".board .mark").first()).toBeVisible();
  await arena.getByRole("button", { name: "일시정지", exact: true }).click();
  await arena.getByLabel("AI A", { exact: true }).selectOption("random");
  await arena.getByLabel("AI B", { exact: true }).selectOption("rule");
  await arena.getByLabel("대국 횟수", { exact: true }).fill("1");
  await arena.getByLabel("고속 대국", { exact: true }).check();
  await arena.getByRole("button", { name: "연속 대국", exact: true }).click();
  await expect(arena.locator(".history button")).toHaveCount(1);
  await expect(arena.getByLabel("AI A", { exact: true })).toHaveValue("random");
  await go(page, "홈");
  await page
    .getByRole("button", { name: "AI 대국 관전하기", exact: true })
    .click();
  await expect(arena.getByLabel("AI A", { exact: true })).toHaveValue(
    "alphabeta",
  );
  await expect(arena.getByLabel("AI B", { exact: true })).toHaveValue(
    "minimax",
  );
  await expect(arena.getByLabel("대국 횟수", { exact: true })).toHaveValue(
    "10",
  );
  await expect(
    arena.getByLabel("고속 대국", { exact: true }),
  ).not.toBeChecked();
  await expect(arena.locator(".board .mark").first()).toBeVisible();
  await noOverflow(page);
});

test("간소화한 홈·3개 메뉴·제목·자동 대국 및 내비게이션", async ({
  page,
  isMobile,
}) => {
  await page.goto("");
  await expect(
    page.getByRole("heading", { name: "TicTacToeAI", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".nav-items button")).toHaveCount(3);
  await expect(page.locator(".nav-items button")).toHaveText([
    "홈",
    "대국실",
    "AI Arena",
  ]);
  await expect(page.locator("body")).not.toContainText(
    /PLAY\. THINK\. LEARN\.|LIVE PLAYGROUND|한 수씩 발견하는|학습 과정을 탐구하세요|WORKSPACE|AI EXPERIMENT LAB|브라우저에서 실행되는 AI|v0\.1|AI 학습하기|학습 분석/,
  );
  await expect(
    page.getByRole("button", { name: "AI 학습", exact: true }),
  ).toHaveCount(0);
  const title = page.locator(".hero-copy h2"),
    box = (await title.boundingBox())!,
    demo = (await page.locator(".demo").boundingBox())!;
  expect(
    await title.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBeGreaterThanOrEqual(isMobile ? 50 : 60);
  if (!isMobile) {
    expect(box.x + box.width).toBeLessThanOrEqual(demo.x);
    expect(box.y).toBeLessThan(demo.y + demo.height / 2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
  }
  await expect(page.locator(".demo .mark").first()).toBeVisible();
  await page.getByRole("button", { name: "데모 일시정지" }).click();
  const n = await page.locator(".demo .mark").count();
  await page.waitForTimeout(1000);
  await expect(page.locator(".demo .mark")).toHaveCount(n);
  await page.getByRole("button", { name: "데모 재개" }).click();
  await page.getByRole("button", { name: "궁극 틱택토", exact: true }).click();
  await expect(page.locator(".demo .cell")).toHaveCount(81);
  await expect(page.locator(".demo .mark").first()).toBeVisible();
  await page.screenshot({
    path: `test-results/home-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "대국 시작하기", exact: true })
    .click();
  await expect(stage(page)).toBeVisible();
  for (const name of ["AI Arena", "대국실", "홈"]) await go(page, name);
  await noOverflow(page);
  if (!isMobile) {
    await page.getByRole("button", { name: "사이드바 접기" }).click();
    await expect(
      page.getByRole("button", { name: "사이드바 펼치기" }),
    ).toHaveAttribute("aria-expanded", "false");
    await expect(
      page.getByRole("link", { name: "GitHub", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "사이드바 펼치기" }).click();
    await page.setViewportSize({ width: 1280, height: 600 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 320, height: 700 });
    await noOverflow(page);
  } else {
    await page.getByRole("button", { name: "메뉴 열기" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeFocused();
  }
});
test("일반·궁극 대국·승리·AI 응수·기록과 새로고침 복원", async ({ page }) => {
  await page.goto("");
  await go(page, "대국실");
  const area = page.locator(".playroom");
  await area
    .getByLabel("대국 방식", { exact: true })
    .selectOption("human-human");
  for (const n of [1, 4, 2, 5, 3])
    await board(page)
      .getByRole("button", { name: `${n}번 칸 빈칸`, exact: true })
      .click();
  await expect(stage(page).locator(".status")).toContainText("X 승리");
  await area.getByRole("button", { name: "1. X", exact: false }).click();
  await expect(board(page).locator(".mark")).toHaveCount(1);
  await page.reload();
  await go(page, "대국실");
  await expect(stage(page).locator(".status")).toContainText("X 승리");
  await expect(area.getByLabel("대국 방식", { exact: true })).toHaveValue(
    "human-human",
  );
  await area.getByLabel("저장된 대국", { exact: true }).selectOption("0");
  await area.getByRole("button", { name: "1. X", exact: false }).click();
  await expect(board(page).locator(".mark")).toHaveCount(1);
  await area.getByRole("button", { name: "현재 대국", exact: true }).click();
  await area.getByLabel("게임 모드", { exact: true }).selectOption("ultimate");
  await expect(board(page).locator(".cell")).toHaveCount(81);
  await board(page)
    .getByRole("button", { name: "1번 작은 판 5번 칸 빈칸", exact: true })
    .click();
  await expect(stage(page).locator(".stage-hint")).toContainText("5번");
  await expect(
    board(page).getByRole("button", {
      name: "1번 작은 판 1번 칸 빈칸",
      exact: true,
    }),
  ).toBeDisabled();
  await area.getByLabel("게임 모드", { exact: true }).selectOption("classic");
  await area.getByLabel("대국 방식", { exact: true }).selectOption("human-ai");
  await board(page)
    .getByRole("button", { name: "1번 칸 빈칸", exact: true })
    .click();
  await expect(board(page).locator(".mark")).toHaveCount(2);
  await page.screenshot({
    path: `test-results/play-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("좌우 패널 4개 조합·양 모드 크기·상태·리사이즈·복원", async ({
  page,
  isMobile,
}) => {
  if (!isMobile) await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("");
  await go(page, "대국실");
  await page
    .locator(".playroom")
    .getByLabel("대국 방식", { exact: true })
    .selectOption("human-human");
  for (const mode of ["classic", "ultimate"]) {
    await page
      .locator(".playroom")
      .getByLabel("게임 모드", { exact: true })
      .selectOption(mode);
    await board(page)
      .getByRole("button", {
        name: mode === "classic" ? "1번 칸 빈칸" : "1번 작은 판 5번 칸 빈칸",
        exact: true,
      })
      .click();
    const saved = await page.evaluate(() => localStorage.getItem("match")),
      original = (await board(page).boundingBox())!,
      originalStage = (await stage(page).boundingBox())!;
    await page
      .getByRole("button", { name: "왼쪽 패널 접기", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "왼쪽 패널 펼치기" }),
    ).toHaveAttribute("aria-expanded", "false");
    await expect(
      page.getByRole("button", { name: "오른쪽 패널 접기" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "오른쪽 패널 접기" }).click();
    await expect(page.locator("#playroom-settings")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await expect(page.locator("#playroom-inspector")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await page.waitForTimeout(250);
    const expanded = (await board(page).boundingBox())!,
      expandedStage = (await stage(page).boundingBox())!;
    expect(Math.abs(expanded.width - expanded.height)).toBeLessThan(1);
    if (!isMobile) {
      expect(expandedStage.width).toBeGreaterThan(originalStage.width + 400);
      expect(expanded.width).toBeGreaterThan(original.width + 50);
      expect(
        Math.abs(
          expanded.x +
            expanded.width / 2 -
            expandedStage.x -
            expandedStage.width / 2,
        ),
      ).toBeLessThan(1);
      expect(expanded.y + expanded.height).toBeLessThanOrEqual(900);
    }
    await expect(board(page).locator(".mark")).toHaveCount(1);
    expect(await page.evaluate(() => localStorage.getItem("match"))).toBe(
      saved,
    );
    await page.getByRole("button", { name: "왼쪽 패널 펼치기" }).click();
    await expect(
      page.getByRole("button", { name: "왼쪽 패널 접기" }),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByRole("button", { name: "오른쪽 패널 펼치기" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "오른쪽 패널 펼치기" }).click();
    await expect(
      page.locator(".playroom").getByLabel("대국 방식", { exact: true }),
    ).toHaveValue("human-human");
    await expect(board(page).locator(".mark")).toHaveCount(1);
    await noOverflow(page);
  }
  await page.getByRole("button", { name: "왼쪽 패널 접기" }).click();
  await page.getByRole("button", { name: "오른쪽 패널 접기" }).click();
  await page.reload();
  await go(page, "대국실");
  await expect(
    page.getByRole("button", { name: "왼쪽 패널 펼치기" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "오른쪽 패널 펼치기" }),
  ).toBeVisible();
  await expect(board(page).locator(".mark")).toHaveCount(1);
  await page.screenshot({
    path: `test-results/panels-closed-${test.info().project.name}.png`,
    fullPage: true,
  });
  if (!isMobile) {
    for (const width of [960, 760, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await noOverflow(page);
      await expect(board(page)).toBeVisible();
      const b = (await board(page).boundingBox())!;
      expect(Math.abs(b.width - b.height)).toBeLessThan(1);
    }
  }
  await openPanels(page);
  await expect(board(page).locator(".mark")).toHaveCount(1);
});
test("AI 계산 중 패널 전환 후 결과와 설정·분석 보존", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/src/workers/compute.ts*", async (r) => {
    await gate;
    await r.continue();
  });
  try {
    await page.goto("");
    await go(page, "대국실");
    await board(page)
      .getByRole("button", { name: "1번 칸 빈칸", exact: true })
      .click();
    await expect(stage(page).locator(".status")).toContainText("AI 계산 중");
    await page.getByRole("button", { name: "왼쪽 패널 접기" }).click();
    await page.getByRole("button", { name: "오른쪽 패널 접기" }).click();
    release();
    await expect(board(page).locator(".mark")).toHaveCount(2);
    await openPanels(page);
    await expect(page.locator(".playroom .search-meta")).toContainText(
      "Alpha-Beta",
    );
    await expect(
      page.locator(".playroom").getByLabel("AI 알고리즘", { exact: true }),
    ).toHaveValue("alphabeta");
    const result = await page.locator(".playroom .search-meta").textContent();
    await page.getByRole("button", { name: "오른쪽 패널 접기" }).click();
    await page.getByRole("button", { name: "오른쪽 패널 펼치기" }).click();
    expect(await page.locator(".playroom .search-meta").textContent()).toBe(
      result,
    );
  } finally {
    release();
  }
});
test("기존 Q-table·저장 모델·JSON 호환성과 Arena", async ({ page }) => {
  const model = {
    version: 1,
    game: "classic",
    algorithm: "q",
    id: "saved-v1",
    name: "저장된 v0.1 모델",
    created: "2026-10-29",
    episodes: 100,
    settings: defaults,
    q: { "---------": { 4: 1 } },
  };
  await page.addInitScript(
    ({ model }) => {
      if (!localStorage.getItem("models")) {
        localStorage.setItem("models", JSON.stringify([model]));
        localStorage.setItem(
          "training",
          JSON.stringify({
            q: model.q,
            total: 100,
            settings: model.settings,
            samples: [],
          }),
        );
      }
    },
    { model },
  );
  await page.goto("");
  await go(page, "대국실");
  const area = page.locator(".playroom"),
    legacy = await page.evaluate(() => localStorage.getItem("training"));
  await area.getByLabel("AI 알고리즘", { exact: true }).selectOption("q");
  await expect(area.getByLabel("Q-learning 모델", { exact: true })).toHaveValue(
    "current",
  );
  await area.getByLabel("나의 차례", { exact: true }).selectOption("O");
  await expect(
    board(page).getByRole("button", { name: "5번 칸 X", exact: true }),
  ).toBeVisible();
  await area
    .getByLabel("Q-learning 모델", { exact: true })
    .selectOption("saved-v1");
  await page.reload();
  await go(page, "대국실");
  await expect(area.getByLabel("Q-learning 모델", { exact: true })).toHaveValue(
    "saved-v1",
  );
  expect(await page.evaluate(() => localStorage.getItem("training"))).toBe(
    legacy,
  );
  const imported = {
    ...model,
    id: "import",
    name: "가져온 모델",
    q: { "---------": { 0: 1 } },
  };
  await area.getByLabel("Q-learning 모델 JSON 불러오기").setInputFiles({
    name: "model.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await expect(
    area.getByLabel("Q-learning 모델", { exact: true }),
  ).toContainText("가져온 모델");
  await page.getByRole("button", { name: "대국 재시작", exact: true }).click();
  await expect(
    board(page).getByRole("button", { name: "1번 칸 X", exact: true }),
  ).toBeVisible();
  await area.getByLabel("Q-learning 모델 JSON 불러오기").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...model, version: 2 })),
  });
  await expect(area.getByRole("alert")).toContainText("호환되지 않는");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("models")!).length,
    ),
  ).toBe(2);
  await go(page, "AI Arena");
  const arena = page.locator(".lab-layout:visible");
  await arena.getByLabel("AI A", { exact: true }).selectOption("q");
  await expect(
    arena.getByLabel("Q-learning 모델", { exact: true }),
  ).toContainText("가져온 모델");
  await arena.getByLabel("AI B", { exact: true }).selectOption("random");
  await arena.getByLabel("대국 횟수", { exact: true }).fill("1");
  await arena.getByLabel("고속 대국", { exact: true }).check();
  await arena.getByRole("button", { name: "연속 대국", exact: true }).click();
  await expect(arena.locator(".history button")).toHaveCount(1);
  await arena.locator(".history button").click();
  await expect(arena.getByLabel("기록 재생 위치")).toBeVisible();
});
test("착수 취소·재시작·AI 자동 대국과 최적 AI Arena 무승부", async ({
  page,
}) => {
  await page.goto("");
  await go(page, "대국실");
  await board(page)
    .getByRole("button", { name: "1번 칸 빈칸", exact: true })
    .click();
  await expect(board(page).locator(".mark")).toHaveCount(2);
  await page
    .getByRole("button", { name: "동일한 판으로 비교", exact: true })
    .click();
  await expect(
    page.locator(".playroom .metrics dt").filter({ hasText: "Alpha-Beta" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "착수 취소", exact: true }).click();
  await expect(board(page).locator(".mark")).toHaveCount(0);
  await page
    .locator(".playroom")
    .getByLabel("대국 방식", { exact: true })
    .selectOption("ai-ai");
  await expect(board(page).locator(".mark").first()).toBeVisible();
  await page
    .getByRole("button", { name: "대국 일시정지", exact: true })
    .click();
  const n = await board(page).locator(".mark").count();
  await page.waitForTimeout(800);
  await expect(board(page).locator(".mark")).toHaveCount(n);
  await page.getByRole("button", { name: "대국 재시작", exact: true }).click();
  await expect(board(page).locator(".mark")).toHaveCount(0);
  await go(page, "AI Arena");
  const arena = page.locator(".lab-layout:visible");
  await arena.getByLabel("대국 횟수", { exact: true }).fill("1");
  await arena.getByLabel("고속 대국", { exact: true }).check();
  await arena.getByRole("button", { name: "연속 대국", exact: true }).click();
  await expect(arena.locator(".history")).toContainText("무승부");
  await arena.locator(".history button").click();
  await arena.getByLabel("기록 재생 위치").fill("1");
  await expect(arena.locator(".board .mark")).toHaveCount(1);
});
test("궁극 MCTS·합법 착수·패널 복원과 reduced-motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("");
  await page.waitForTimeout(1000);
  await expect(page.locator(".demo .mark")).toHaveCount(0);
  await go(page, "대국실");
  const area = page.locator(".playroom");
  await area.getByLabel("게임 모드", { exact: true }).selectOption("ultimate");
  await area.getByLabel("AI 알고리즘", { exact: true }).selectOption("mcts");
  await area.getByLabel("MCTS 반복 횟수", { exact: true }).fill("50");
  await area.getByLabel("나의 차례", { exact: true }).selectOption("O");
  await expect(board(page).locator(".mark")).toHaveCount(1);
  await expect(area.locator(".search-meta")).toContainText("MCTS");
  await expect(area.locator(".candidates .best")).toContainText("%");
  await page.getByRole("button", { name: "오른쪽 패널 접기" }).click();
  await page.getByRole("button", { name: "오른쪽 패널 펼치기" }).click();
  await expect(area.locator(".candidates .best")).toContainText("%");
  await page.screenshot({
    path: `test-results/ultimate-${test.info().project.name}.png`,
    fullPage: true,
  });
});
