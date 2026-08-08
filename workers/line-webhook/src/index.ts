import { shouldTriggerScheduledMonitor } from "./schedule";

type LineTextEvent = {
  type: "message";
  replyToken: string;
  source: { type: string; userId?: string };
  message: { type: "text"; text: string };
};

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function verifyLineSignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64(signature),
      new TextEncoder().encode(rawBody),
    );
  } catch {
    return false;
  }
}

function parseInventoryCommand(text: string): string | null {
  const match = text.trim().match(/^残席\s+(20\d{2})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const valid = parsed.getUTCFullYear() === Number(year)
    && parsed.getUTCMonth() === Number(month) - 1
    && parsed.getUTCDate() === Number(day);
  return valid ? date : null;
}

async function replyLine(env: Env, replyToken: string, text: string): Promise<void> {
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
  });
  if (!response.ok) throw new Error(`LINE reply failed: ${response.status}`);
}

async function triggerInventoryCheck(env: Env, date: string, userId: string): Promise<void> {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/${env.GITHUB_WORKFLOW}/dispatches`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_WORKFLOW_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "ticket-inventory-line-webhook",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ ref: "main", inputs: { date, line_user_id: userId } }),
  });
  if (!response.ok) throw new Error(`GitHub workflow dispatch failed: ${response.status}`);
}

async function triggerScheduledMonitor(env: Env): Promise<void> {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/${env.GITHUB_MONITOR_WORKFLOW}/dispatches`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_WORKFLOW_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "ticket-inventory-scheduler",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ ref: "main" }),
  });
  if (!response.ok) throw new Error(`GitHub monitor dispatch failed: ${response.status}`);
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    if (request.method !== "POST") return new Response("Not Found", { status: 404 });
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 1_000_000) return new Response("Payload Too Large", { status: 413 });

    const rawBody = await request.text();
    if (rawBody.length > 1_000_000) return new Response("Payload Too Large", { status: 413 });
    const signature = request.headers.get("x-line-signature") ?? "";
    if (!(await verifyLineSignature(rawBody, signature, env.LINE_CHANNEL_SECRET))) {
      return new Response("Invalid signature", { status: 401 });
    }

    let payload: { events?: LineTextEvent[] };
    try {
      payload = JSON.parse(rawBody) as { events?: LineTextEvent[] };
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    for (const event of payload.events ?? []) {
      if (event.type !== "message" || event.message?.type !== "text" || !event.source?.userId) continue;
      if (event.message.text.trim() === "監視対象") {
        ctx.waitUntil(replyLine(env, event.replyToken, [
          "【現在の監視対象】",
          "2026年8月16日(日)",
          "中日ドラゴンズ vs 読売ジャイアンツ",
          "一般チケット → 一般席",
          "2枚",
          "通常5分間隔（9:50～10:30は2分間隔）",
        ].join("\n")));
        continue;
      }
      const date = parseInventoryCommand(event.message.text);
      if (!date) {
        ctx.waitUntil(replyLine(env, event.replyToken, "「監視対象」または「残席 2026/09/01」の形式で送ってください。"));
        continue;
      }
      ctx.waitUntil(Promise.all([
        replyLine(env, event.replyToken, `${date}の残席確認を開始しました。結果は1～2分後に届きます。`),
        triggerInventoryCheck(env, date, event.source.userId),
      ]));
    }

    return new Response("OK");
  },
  async scheduled(controller, env, ctx): Promise<void> {
    if (shouldTriggerScheduledMonitor(controller.scheduledTime)) {
      ctx.waitUntil(triggerScheduledMonitor(env));
    }
  },
} satisfies ExportedHandler<Env>;
