import { chromium } from "playwright";
import { pushLine } from "../../shared/line-notify.mjs";
import { config } from "./config.mjs";

const rawDate = process.env.QUERY_DATE ?? "";
const targetDate = rawDate.replaceAll("-", "");
const lineUserId = process.env.LINE_USER_ID;
const dryRun = process.env.DRY_RUN === "1";
const loginId = process.env.DRAGONS_LOGIN_ID ?? process.env.EMAIL;
const password = process.env.DRAGONS_PASSWORD ?? process.env.PASSWORD;
const secrets = [loginId, password, process.env.LINE_CHANNEL_ACCESS_TOKEN, lineUserId].filter(Boolean);

if (!/^20\d{6}$/.test(targetDate)) throw new Error("QUERY_DATE が不正です");
if (!lineUserId || !loginId || !password || (!dryRun && !process.env.LINE_CHANNEL_ACCESS_TOKEN)) {
  throw new Error("残席照会に必要なSecretが設定されていません");
}

async function clickStep(page, label) {
  const candidates = page.getByText(new RegExp(`^\\s*${label}\\s*$`));
  for (let index = 0; index < await candidates.count(); index += 1) {
    const candidate = candidates.nth(index);
    if (!(await candidate.isVisible())) continue;
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {}),
      candidate.click(),
    ]);
    await page.waitForTimeout(1_000);
    return true;
  }
  return false;
}

async function sendResult(text) {
  if (dryRun) {
    console.log(text);
    return;
  }
  await pushLine(lineUserId, text);
  console.log("残席情報をLINEへ返信しました");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: "ja-JP", timezoneId: "Asia/Tokyo" });
  page.setDefaultTimeout(config.timeout);

  try {
    await page.goto(config.loginUrl, { waitUntil: "domcontentloaded" });
    const loginPanel = page.locator("#tabBlock02_a01");
    if (!(await loginPanel.isVisible())) {
      await page.locator("#tabTrg02_a01").click();
      await loginPanel.waitFor({ state: "visible" });
    }
    await page.locator("#ContentMain_TxtLoginID").fill(loginId);
    await page.locator("#ContentMain_TxtPassword").fill(password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: config.timeout }),
      page.locator("#ContentMain_BtnLogin").click(),
    ]);

    if (page.url().includes("Login.aspx")) throw new Error("ドラチケへログインできませんでした");
    await page.goto(config.calendarUrl, { waitUntil: "domcontentloaded" });

    const marker = page.locator(`#Spn${targetDate}`);
    if ((await marker.count()) === 0) {
      await sendResult(`${rawDate}\n対象日の試合がドラチケに見つかりません。`);
      return;
    }

    const game = marker.locator("xpath=ancestor::div[contains(@class,'dayDoc')][1]");
    const popupLabel = game.locator("xpath=following-sibling::div[contains(@id,'PnlCheckSalesDate')][1]//p");
    const gameLabel = (await popupLabel.count()) ? (await popupLabel.innerText()).trim() : rawDate;
    const saleButton = game.locator(".scheBtn a").filter({ hasText: /発売中|購入/ }).first();
    if (!(await saleButton.count()) || !(await saleButton.isVisible())) {
      await sendResult(`${gameLabel}\n一般チケットはまだ購入可能ではありません。`);
      return;
    }

    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {}),
      saleButton.click(),
    ]);
    await page.waitForTimeout(1_000);
    if (!(await clickStep(page, "一般チケット")) || !(await clickStep(page, "一般席"))) {
      await sendResult(`${gameLabel}\n一般席の残席画面を開けませんでした。`);
      return;
    }

    const available = new Map();
    const rows = page.locator(".accDt");
    for (let rowIndex = 0; rowIndex < await rows.count(); rowIndex += 1) {
      const row = rows.nth(rowIndex);
      const selects = row.locator("select:visible:enabled");
      let supportsTwo = false;
      for (let selectIndex = 0; selectIndex < await selects.count(); selectIndex += 1) {
        if (await selects.nth(selectIndex).locator("option[value='2']:not([disabled])").count()) {
          supportsTwo = true;
          break;
        }
      }
      if (!supportsTwo) continue;
      const lines = (await row.innerText()).split("\n").map((line) => line.trim()).filter(Boolean);
      const name = lines[0];
      const status = lines.find((line) => line === "○" || line === "△") ?? "○";
      if (name) available.set(name, status);
    }

    const checkedAt = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date());
    const lines = available.size
      ? [...available].map(([name, status]) => `${status} ${name}`)
      : ["2枚購入可能な一般席はありません。"];
    await sendResult([gameLabel, "", "2枚購入可能な一般席：", ...lines, "", `確認時刻：${checkedAt}`].join("\n"));
  } finally {
    await browser.close();
  }
}

main().catch(async (error) => {
  let message = error instanceof Error ? error.message : String(error);
  for (const secret of secrets) message = message.replaceAll(secret, "[REDACTED]");
  console.error(message);
  try {
    if (lineUserId) await pushLine(lineUserId, `${rawDate}\n残席確認中にエラーが発生しました。しばらくしてから再度お試しください。`);
  } catch {
    // 元のエラーを保持する。
  }
  process.exitCode = 1;
});
