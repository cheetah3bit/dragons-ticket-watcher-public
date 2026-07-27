export async function notifyLine(text, accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN) {
  if (!accessToken) throw new Error("LINE_CHANNEL_ACCESS_TOKEN が設定されていません");

  const response = await fetch("https://api.line.me/v2/bot/message/broadcast", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages: [{ type: "text", text }] }),
  });
  if (!response.ok) throw new Error(`LINE通知失敗 (${response.status}): ${await response.text()}`);
}

export async function pushLine(userId, text, accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN) {
  if (!accessToken) throw new Error("LINE_CHANNEL_ACCESS_TOKEN が設定されていません");
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: userId, messages: [{ type: "text", text }] }),
  });
  if (!response.ok) throw new Error(`LINE個別通知失敗 (${response.status}): ${await response.text()}`);
}
