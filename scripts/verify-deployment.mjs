import { chromium, expect } from "@playwright/test";
const url = "https://oyueo-mm.github.io/TicTacToeAI/";
const browser = await chromium.launch();
const reports = [];
async function go(page, name) {
  const b = page.getByRole("button", { name, exact: true });
  if (!(await b.isVisible()))
    await page.getByRole("button", { name: "메뉴 열기", exact: true }).click();
  await b.click();
}
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1280, height: 900 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const errors = [],
      badResponses = [],
      workers = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400)
        badResponses.push({ url: r.url(), status: r.status() });
    });
    page.on("worker", (w) => workers.push(w.url()));
    const response = await page.goto(url);
    await expect(
      page.getByRole("heading", { name: "TicTacToeAI", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".nav-items button")).toHaveCount(3);
    await expect(page.locator("body")).not.toContainText(
      /PLAY\. THINK\. LEARN\.|LIVE PLAYGROUND|WORKSPACE|AI EXPERIMENT LAB|브라우저에서 실행되는 AI/,
    );
    await page
      .getByRole("button", { name: "대국 시작하기", exact: true })
      .click();
    const play = page.locator(".playroom"),
      board = play.getByTestId("board");
    await board
      .getByRole("button", { name: "1번 칸 빈칸", exact: true })
      .click();
    await expect(board.locator(".mark")).toHaveCount(2);
    const original = (await board.boundingBox()).width;
    await page.getByRole("button", { name: "왼쪽 패널 접기" }).click();
    await expect(
      page.getByRole("button", { name: "오른쪽 패널 접기" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "오른쪽 패널 접기" }).click();
    await page.waitForTimeout(250);
    const expanded = (await board.boundingBox()).width;
    if (!mobile) expect(expanded).toBeGreaterThan(original + 50);
    await expect(board.locator(".mark")).toHaveCount(2);
    await page.getByRole("button", { name: "왼쪽 패널 펼치기" }).click();
    await expect(
      page.getByRole("button", { name: "오른쪽 패널 펼치기" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "오른쪽 패널 펼치기" }).click();
    await expect(play.locator(".search-meta")).toContainText("Alpha-Beta");
    await page.reload();
    await go(page, "대국실");
    await expect(board.locator(".mark")).toHaveCount(2);
    if (!mobile) {
      await play.getByLabel("AI 알고리즘", { exact: true }).selectOption("q");
      const model = {
        version: 1,
        game: "classic",
        algorithm: "q",
        id: "live-check",
        name: "배포 검증 모델",
        created: "2026-10-29",
        episodes: 1,
        settings: {
          alpha: 0.2,
          gamma: 0.95,
          epsilon: 1,
          decay: 0.999,
          episodes: 1,
          opponent: "random",
        },
        q: { "---------": { 4: 1 } },
      };
      await play
        .getByLabel("Q-learning 모델 JSON 불러오기")
        .setInputFiles({
          name: "model.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(model)),
        });
      await play.getByLabel("나의 차례", { exact: true }).selectOption("O");
      await expect(
        board.getByRole("button", { name: "5번 칸 X", exact: true }),
      ).toBeVisible();
      await page.reload();
      await go(page, "대국실");
      await expect(
        play.getByLabel("Q-learning 모델", { exact: true }),
      ).toContainText("배포 검증 모델");
    }
    await go(page, "AI Arena");
    const arena = page.locator(".lab-layout:visible");
    await arena.getByLabel("대국 횟수", { exact: true }).fill("1");
    await arena.getByLabel("고속 대국", { exact: true }).check();
    await arena.getByRole("button", { name: "연속 대국", exact: true }).click();
    await expect(arena.locator(".history")).toContainText("무승부");
    await arena.locator(".history button").click();
    await expect(arena.getByLabel("기록 재생 위치")).toBeVisible();
    await go(page, "홈");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(response.status()).toBe(200);
    expect(workers.length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
    expect(badResponses).toEqual([]);
    reports.push({
      mobile,
      status: response.status(),
      menus: 3,
      independentPanels: true,
      boardWidths: { original, expanded },
      aiMove: true,
      savedMatchRestored: true,
      modelImportAndRestore: !mobile,
      arenaReplay: true,
      workers: [...new Set(workers)],
      errors,
      badResponses,
    });
    await page.close();
  }
  console.log(JSON.stringify({ url, reports }, null, 2));
} finally {
  await browser.close();
}
