import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { notifyLine } from "../../shared/line-notify.mjs";
import { config } from "./config.mjs";

const TARGET_DAY_START = Date.parse(`${config.targetDate.slice(0, 4)}-${config.targetDate.slice(4, 6)}-${config.targetDate.slice(6, 8)}T00:00:00+09:00`);
const DRY_RUN = process.env.DRY_RUN === "1";
const LOGIN_ID = process.env.DRAGONS_LOGIN_ID ?? process.env.EMAIL;
const PASSWORD = process.env.DRAGONS_PASSWORD ?? process.env.PASSWORD;

if (!LOGIN_ID) throw new Error("DRAGONS_LOGIN_ID（またはEMAIL）が設定されていません");
if (!PASSWORD) throw new Error("DRAGONS_PASSWORD（またはPASSWORD）が設定されていません");
if (!DRY_RUN && !process.env.LINE_CHANNEL_ACCESS_TOKEN) throw new Error("LINE_CHANNEL_ACCESS_TOKEN が設定されていません");

async function clickPurchaseStep(page, label) {
  const candidates = page.getByText(new RegExp(`^\\s*${label}\\s*$`));
  let control;
  for (let index = 0; index < await candidates.count(); index += 1) {
    const candidate = candidates.nth(index);
    if (await candidate.isVisible()) {
      control = candidate;
      break;
    }
  }
  if (!control) return false;

  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {}),
    control.click(),
  ]);
  await page.waitForTimeout(1_000);
  if (/ErrorForBusy|ErrorForApplication|Login\.aspx/i.test(page.url())) {
    throw new Error(`${label}の画面へ進めなかったため、今回は判定を保留します`);
  }
  return true;
}

async function readPreviousState() {
  try {
    return JSON.parse(await readFile(config.stateFile, "utf8"));
  } catch {
    return {};
  }
}

async function saveState(available, url = "") {
  if (DRY_RUN) return;
  await mkdir(dirname(config.stateFile), { recursive: true });
  await writeFile(config.stateFile, JSON.stringify({
    available,
    url,
  }));
}

async function reportUnavailable(reason) {
  console.log(reason);
  const previousState = await readPreviousState();
  if (previousState.available === true && !DRY_RUN) {
    await notifyLine([
      "【ドラチケ在庫切れ】",
      config.targetGameLabel,
      `一般席で${config.quantity}枚を選択可能な在庫がなくなりました。`,
      "監視を継続します。",
    ].join("\n"));
    console.log("在庫ありから在庫なしへの変化をLINEへ通知しました");
  }
  await saveState(false);
}

async function main() {
  if (Date.now() >= TARGET_DAY_START + 86_400_000) {
    console.log("対象試合日を過ぎたため監視を終了します");
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "ja-JP", timezoneId: "Asia/Tokyo" });
  const page = await context.newPage();
  page.setDefaultTimeout(config.timeout);

  try {
    await page.goto(config.loginUrl, { waitUntil: "domcontentloaded" });
    const loginPanel = page.locator("#tabBlock02_a01");
    if (!(await loginPanel.isVisible())) {
      await page.locator("#tabTrg02_a01").click();
      await loginPanel.waitFor({ state: "visible" });
    }
    await page.locator("#ContentMain_TxtLoginID").fill(LOGIN_ID);
    await page.locator("#ContentMain_TxtPassword").fill(PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: config.timeout }),
      page.locator("#ContentMain_BtnLogin").click(),
    ]);
    await page.waitForTimeout(500);

    if (page.url().includes("Login.aspx")) {
      const error = (await page.locator(".errBlock").allTextContents()).join(" ").trim();
      throw new Error(`ログインできませんでした${error ? `: ${error}` : ""}`);
    }

    await page.goto(config.calendarUrl, { waitUntil: "domcontentloaded" });
    if (/ErrorForBusy|ErrorForApplication/i.test(page.url())) {
      throw new Error("サイトが混雑または一時エラーのため、今回は判定を保留します");
    }

    const dateMarker = page.locator(`#Spn${config.targetDate}`);
    if ((await dateMarker.count()) === 0) throw new Error("対象試合がカレンダーに見つかりません");
    const targetBox = dateMarker.locator("xpath=ancestor::div[contains(@class,'dayDoc')][1]");
    const control = targetBox.locator(".scheBtn a").filter({ hasText: /発売中|購入/ }).first();

    if ((await control.count()) === 0 || !(await control.isVisible())) {
      await reportUnavailable("まだ購入可能ではありません（対象試合の購入ボタンなし）");
      return;
    }

    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {}),
      control.click(),
    ]);
    await page.waitForTimeout(1_000);

    if (/ErrorForBusy|ErrorForApplication|Login\.aspx/i.test(page.url())) {
      throw new Error("購入画面へ進めなかったため、今回は判定を保留します");
    }

    // 発売中という表示だけでは通知しない。「一般チケット」→「一般席」の
    // 両方を実際に開けた場合だけ、その先の在庫を判定する。
    if (!(await clickPurchaseStep(page, "一般チケット"))) {
      if (DRY_RUN) {
        const diagnostic = (await page.locator("body").innerText()).split("\n")
          .map((line) => line.trim()).filter((line) => /一般|チケット|席/.test(line));
        console.log("診断（一般チケット画面）:", diagnostic.slice(0, 30).join(" | "));
        const controls = await page.locator("a:visible, button:visible").allTextContents();
        console.log("診断（選択肢）:", controls.map((text) => text.trim()).filter(Boolean).slice(-40).join(" | "));
      }
      await reportUnavailable("一般チケットがまだ選択できません");
      return;
    }
    if (!(await clickPurchaseStep(page, "一般席"))) {
      await reportUnavailable("一般席がまだ選択できません");
      return;
    }

    // 売り切れ席にも0～12枚のoptionは残るが、select自体がdisabledになる。
    // 表示中かつ有効な枚数欄で「2」を選べる席種がある場合だけ在庫ありとする。
    const enabledQuantitySelects = page.locator("select:visible:enabled");
    let purchasable = false;
    for (let index = 0; index < await enabledQuantitySelects.count(); index += 1) {
      const optionTwo = enabledQuantitySelects.nth(index).locator(`option[value='${config.quantity}']:not([disabled])`);
      if ((await optionTwo.count()) > 0) {
        purchasable = true;
        break;
      }
    }

    if (!purchasable) {
      await reportUnavailable(`一般席に${config.quantity}枚を選択可能な在庫はありません`);
      return;
    }

    const previousState = await readPreviousState();
    const message = [
      "【ドラチケ購入可能】",
      config.targetGameLabel,
      `一般チケット → 一般席で、${config.quantity}枚を選択できる購入画面を確認しました。`,
      page.url(),
      "在庫は変動します。お早めに購入手続きをしてください。",
    ].join("\n");
    if (DRY_RUN) {
      console.log("ドライラン成功: LINE通知条件を満たしました");
      console.log(message);
      return;
    }
    if (previousState.available !== true) {
      await notifyLine(message);
      console.log("購入可能状態への変化を検知し、LINEへ通知しました");
    } else {
      console.log("購入可能状態は前回から継続中です（重複通知は省略）");
    }
    await saveState(true, page.url());
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  let message = error instanceof Error ? error.message : String(error);
  for (const secret of [LOGIN_ID, PASSWORD, process.env.LINE_CHANNEL_ACCESS_TOKEN]) {
    if (secret) message = message.replaceAll(secret, "[REDACTED]");
  }
  const transientFailure = (error instanceof Error && error.name === "TimeoutError")
    || /今回は判定を保留|サイトが混雑|一時エラー/.test(message);
  if (transientFailure) {
    console.warn(`一時的に確認できなかったため、今回は判定を保留します: ${message}`);
    return;
  }
  console.error(message);
  process.exitCode = 1;
});
