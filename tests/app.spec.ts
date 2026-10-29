import { test, expect, type Page } from "@playwright/test";
async function go(p: Page, name: string) {
  const button = p.getByRole("button", { name, exact: true });
  if (!(await button.isVisible()))
    await p.getByRole("button", { name: "메뉴 열기" }).click();
  await button.click();
}
test("홈 실제 애니메이션과 모든 메뉴, 모바일 너비", async ({ page }) => {
  await page.goto("");
  await expect(page.getByRole("heading", { name: /TicTacToe/ })).toBeVisible();
  await expect(page.locator(".demo .mark").first()).toBeVisible({
    timeout: 5000,
  });
  await page.getByRole("button", { name: "궁극 틱택토", exact: true }).click();
  await expect(page.locator(".demo .cell")).toHaveCount(81);
  for (const name of ["대국실", "AI 학습", "AI Arena", "학습 분석", "홈"])
    await go(page, name);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/home-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("일반·궁극 대국, AI 계산, 기록 및 새로고침 복원", async ({ page }) => {
  await page.goto("");
  await go(page, "대국실");
  const area = page.locator(".lab-layout:visible").first();
  await area
    .getByLabel("대국 방식", { exact: true })
    .selectOption("human-human");
  for (const n of [1, 4, 2, 5, 3])
    await area
      .getByRole("button", { name: `${n}번 칸 빈칸`, exact: true })
      .click();
  await expect(area.locator(".status")).toContainText("X 승리");
  await area.getByRole("button", { name: "1. X" }).click();
  await expect(area.locator(".stage-hint")).toContainText("기록 보기");
  await page.reload();
  await go(page, "대국실");
  await expect(page.locator(".game-stage:visible .status")).toContainText(
    "X 승리",
  );
  await page
    .getByLabel("게임 모드", { exact: true })
    .filter({ visible: true })
    .selectOption("ultimate");
  await expect(page.locator(".game-stage:visible .cell")).toHaveCount(81);
  await page
    .getByLabel("대국 방식", { exact: true })
    .filter({ visible: true })
    .selectOption("human-human");
  await page
    .getByRole("button", { name: "1번 작은 판 5번 칸 빈칸", exact: true })
    .click();
  await expect(page.locator(".game-stage:visible .stage-hint")).toContainText(
    "5번",
  );
  await expect(
    page.getByRole("button", { name: "1번 작은 판 1번 칸 빈칸", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("게임 모드", { exact: true })
    .filter({ visible: true })
    .selectOption("classic");
  await page
    .getByLabel("대국 방식", { exact: true })
    .filter({ visible: true })
    .selectOption("human-ai");
  await page.getByRole("button", { name: "1번 칸 빈칸", exact: true }).click();
  await expect(page.locator(".game-stage:visible .mark")).toHaveCount(2, {
    timeout: 10000,
  });
  await page.screenshot({
    path: `test-results/play-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("학습·일시정지·재개·모델 저장과 실제 분석·Arena", async ({ page }) => {
  await page.goto("");
  await go(page, "AI 학습");
  await page.getByLabel("학습 에피소드 수", { exact: true }).fill("2000");
  await page.getByRole("button", { name: "고속 학습", exact: true }).click();
  await expect(page.locator(".metrics dd").first()).not.toHaveText("0", {
    timeout: 15000,
  });
  await page
    .getByRole("button", { name: "학습 일시정지", exact: true })
    .click();
  const before = await page.locator(".metrics dd").first().textContent();
  await page.waitForTimeout(500);
  expect(await page.locator(".metrics dd").first().textContent()).toBe(before);
  await go(page, "대국실");
  await go(page, "AI 학습");
  expect(await page.locator(".metrics dd").first().textContent()).toBe(before);
  await page.getByRole("button", { name: "학습 재개", exact: true }).click();
  await expect(page.locator(".metrics dd").first()).toHaveText("2,000", {
    timeout: 20000,
  });
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.locator(".model")).toHaveCount(1);
  await page.reload();
  await go(page, "AI 학습");
  await expect(page.locator(".model")).toHaveCount(1);
  await expect(page.locator(".metrics dd").first()).toHaveText("2,000");
  await go(page, "학습 분석");
  await expect(
    page.getByRole("img", { name: "최근 100회 이동 승률, 0~1" }),
  ).toBeVisible();
  await go(page, "AI Arena");
  await page.getByLabel("대국 횟수", { exact: true }).fill("1");
  await page.getByLabel("고속 대국", { exact: true }).check();
  await page.getByRole("button", { name: "연속 대국", exact: true }).click();
  await expect(page.locator(".history:visible")).toContainText("무승부", {
    timeout: 30000,
  });
  await page.locator(".history:visible button").first().click();
  await expect(page.getByLabel("기록 재생 위치")).toBeVisible();
});
test("착수 취소·AI 자동 대국과 일반 학습 재생·중단", async ({ page }) => {
  await page.goto("");
  await go(page, "대국실");
  await page.getByRole("button", { name: "1번 칸 빈칸", exact: true }).click();
  await expect(page.locator(".game-stage:visible .mark")).toHaveCount(2);
  await page
    .getByRole("button", { name: "동일한 판으로 비교", exact: true })
    .click();
  await expect(
    page
      .locator(".inspector:visible .metrics dt")
      .filter({ hasText: "Alpha-Beta" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "착수 취소", exact: true }).click();
  await expect(page.locator(".game-stage:visible .mark")).toHaveCount(0);
  await page.getByLabel("대국 방식", { exact: true }).selectOption("ai-ai");
  await expect(page.locator(".game-stage:visible .mark").first()).toBeVisible();
  await page
    .getByRole("button", { name: "대국 일시정지", exact: true })
    .click();
  const count = await page.locator(".game-stage:visible .mark").count();
  await page.waitForTimeout(800);
  expect(await page.locator(".game-stage:visible .mark").count()).toBe(count);
  await go(page, "AI 학습");
  await page
    .getByRole("button", { name: "단일 에피소드 실행", exact: true })
    .click();
  await expect(page.locator(".game-stage:visible .mark").first()).toBeVisible();
  await expect(page.locator(".metrics dd").first()).toHaveText("1", {
    timeout: 15000,
  });
  await page.getByRole("button", { name: "일반 학습", exact: true }).click();
  await page.getByRole("button", { name: "학습 중단", exact: true }).click();
  await expect(page.locator(".game-stage:visible .status")).toContainText(
    "학습 대기",
  );
});
test("궁극 MCTS 실제 탐색과 홈 reduced-motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("");
  await page.waitForTimeout(1000);
  await expect(page.locator(".demo .mark")).toHaveCount(0);
  await go(page, "대국실");
  await page
    .getByLabel("게임 모드", { exact: true })
    .filter({ visible: true })
    .selectOption("ultimate");
  await page.getByLabel("AI 알고리즘", { exact: true }).selectOption("mcts");
  await page.getByLabel("MCTS 반복 횟수", { exact: true }).fill("50");
  await page.getByLabel("나의 차례", { exact: true }).selectOption("O");
  await expect(page.locator(".game-stage:visible .mark")).toHaveCount(1, {
    timeout: 15000,
  });
  await expect(page.locator(".search-meta")).toContainText("MCTS");
  await expect(page.locator(".candidates .best")).toContainText("%");
  await page.screenshot({
    path: `test-results/ultimate-${test.info().project.name}.png`,
    fullPage: true,
  });
});
