export const config = {
  siteName: "ドラチケ",
  loginUrl: "https://dragons-ticket.jp/Login.aspx",
  calendarUrl: "https://dragons-ticket.jp/Calendar.aspx",
  targetDate: process.env.TARGET_DATE ?? "20260813",
  targetGameLabel: process.env.TARGET_GAME_LABEL ?? "2026年8月13日(木) 中日ドラゴンズ vs 横浜DeNA",
  quantity: 2,
  timeout: 45_000,
  stateFile: ".state/dragons-ticket/notified.json",
};
