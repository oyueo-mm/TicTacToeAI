import { chromium, expect } from "@playwright/test";
const url = "https://oyueo-mm.github.io/TicTacToeAI/";
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
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
  await expect(page.getByRole("heading", { name: /TicTacToe/ })).toBeVisible();
  await page
    .getByRole("button", { name: "대국 시작하기", exact: true })
    .click();
  await page.getByRole("button", { name: "1번 칸 빈칸", exact: true }).click();
  await expect(page.locator(".game-stage:visible .mark")).toHaveCount(2, {
    timeout: 20000,
  });
  await page.getByRole("button", { name: "AI 학습", exact: true }).click();
  await page.getByLabel("학습 에피소드 수", { exact: true }).fill("100");
  await page.getByRole("button", { name: "고속 학습", exact: true }).click();
  await expect(page.locator(".metrics dd").first()).toHaveText("100", {
    timeout: 20000,
  });
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.locator(".model")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: "AI 학습", exact: true }).click();
  await expect(page.locator(".model")).toHaveCount(1);
  await expect(page.locator(".metrics dd").first()).toHaveText("100");
  await page.getByRole("button", { name: "학습 분석", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "최근 100회 이동 승률, 0~1" }),
  ).toBeVisible();
  expect(response.status()).toBe(200);
  expect(workers.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
  expect(badResponses).toEqual([]);
  console.log(
    JSON.stringify(
      {
        url,
        status: response.status(),
        workers: [...new Set(workers)],
        aiMove: true,
        trainingEpisodes: 100,
        savedModelRestored: true,
        analysis: true,
        errors,
        badResponses,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
