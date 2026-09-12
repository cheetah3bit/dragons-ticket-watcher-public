export const config = {
  siteName: "ドラチケ",
  loginUrl: "https://dragons-ticket.jp/Login.aspx",
  calendarUrl: "https://dragons-ticket.jp/Calendar.aspx",
  targets: [
    {
      targetDate: "20260921",
      targetGameLabel: "2026年9月21日(月) 中日ドラゴンズ vs 広島東洋カープ",
      quantity: 2,
      stateFile: ".state/dragons-ticket/2026-09-21.json",
    },
    {
      targetDate: "20261122",
      targetGameLabel: "2026年11月22日(日) 中日ドラゴンズ vs 読売ジャイアンツ LEGENDS MATCH 2026",
      quantity: 2,
      stateFile: ".state/dragons-ticket/2026-11-22.json",
    },
  ],
  timeout: 45_000,
};
