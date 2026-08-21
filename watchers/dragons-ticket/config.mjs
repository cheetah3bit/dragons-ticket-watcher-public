export const config = {
  siteName: "ドラチケ",
  loginUrl: "https://dragons-ticket.jp/Login.aspx",
  calendarUrl: "https://dragons-ticket.jp/Calendar.aspx",
  targets: [
    {
      targetDate: "20260912",
      targetGameLabel: "2026年9月12日(土) 中日ドラゴンズ vs 東京ヤクルトスワローズ",
      quantity: 2,
      stateFile: ".state/dragons-ticket/2026-09-12.json",
    },
    {
      targetDate: "20260921",
      targetGameLabel: "2026年9月21日(月) 中日ドラゴンズ vs 広島東洋カープ",
      quantity: 2,
      stateFile: ".state/dragons-ticket/2026-09-21.json",
    },
  ],
  timeout: 45_000,
};
