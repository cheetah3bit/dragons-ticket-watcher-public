export const config = {
  siteName: "ドラチケ",
  loginUrl: "https://dragons-ticket.jp/Login.aspx",
  calendarUrl: "https://dragons-ticket.jp/Calendar.aspx",
  targetDate: process.env.TARGET_DATE ?? "20260816",
  targetGameLabel: process.env.TARGET_GAME_LABEL ?? "2026年8月16日(日) 中日ドラゴンズ vs 読売ジャイアンツ",
  quantity: 2,
  timeout: 45_000,
  stateFile: ".state/dragons-ticket/2026-08-16.json",
};
