export const config = {
  siteName: "ドラチケ",
  loginUrl: "https://dragons-ticket.jp/Login.aspx",
  calendarUrl: "https://dragons-ticket.jp/Calendar.aspx",
  targets: [
    {
      targetDate: "20260826",
      targetGameLabel: "2026年8月26日(水) 中日ドラゴンズ vs 阪神タイガース",
      quantity: 3,
      stateFile: ".state/dragons-ticket/2026-08-26.json",
    },
    {
      targetDate: "20260827",
      targetGameLabel: "2026年8月27日(木) 中日ドラゴンズ vs 阪神タイガース",
      quantity: 3,
      stateFile: ".state/dragons-ticket/2026-08-27.json",
    },
  ],
  timeout: 45_000,
};
