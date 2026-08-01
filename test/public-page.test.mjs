import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

test("対象試合の一般販売入口を検出できる", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ locale: "ja-JP" });
    await page.goto("https://dragons-ticket.jp/Calendar.aspx", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    const marker = page.locator("#Spn20260815");
    assert.equal(await marker.count(), 1, "8月15日の試合が見つかりません");
    const game = marker.locator("xpath=ancestor::div[contains(@class,'dayDoc')][1]");
    assert.match(await game.innerText(), /8\/15[\s\S]*14:00/);
    assert.match(await game.innerText(), /発売中/);
    assert.equal(await game.locator(".scheBtn a", { hasText: "発売中" }).count(), 1);
  } finally {
    await browser.close();
  }
});
