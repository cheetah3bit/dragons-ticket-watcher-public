export const config = {
  siteName: "ドラチケ",
  loginUrl: "https://dragons-ticket.jp/Login.aspx",
  calendarUrl: "https://dragons-ticket.jp/Calendar.aspx",
  targetDate: process.env.TARGET_DATE ?? "20260827",
  targetGameLabel: process.env.TARGET_GAME_LABEL ?? "2026年8月27日(木) 中日ドラゴンズ vs 阪神タイガース",
  quantity: 3,
  timeout: 45_000,
  stateFile: ".state/dragons-ticket/2026-08-27.json",
};
