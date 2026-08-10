import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

test("対象2試合の一般販売入口を検出できる", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ locale: "ja-JP" });
    await page.goto("https://dragons-ticket.jp/Calendar.aspx", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    for (const [date, label] of [["20260826", "8/26"], ["20260827", "8/27"]]) {
      const marker = page.locator(`#Spn${date}`);
      assert.equal(await marker.count(), 1, `${label}の試合が見つかりません`);
      const game = marker.locator("xpath=ancestor::div[contains(@class,'dayDoc')][1]");
      assert.match(await game.innerText(), new RegExp(`${label.replace("/", "\\/")}[\\s\\S]*18:00`));
      assert.match(await game.innerText(), /発売中/);
      assert.equal(await game.locator(".scheBtn a", { hasText: "発売中" }).count(), 1);
    }
  } finally {
    await browser.close();
  }
});
