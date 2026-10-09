import test from "node:test";
import assert from "node:assert/strict";
import { isTransientMonitorError } from "../watchers/dragons-ticket/transient-error.mjs";

test("ドラチケの一時的な通信切断はWorkflow失敗にしない", () => {
  for (const code of [
    "ERR_CONNECTION_RESET",
    "ERR_CONNECTION_CLOSED",
    "ERR_CONNECTION_REFUSED",
    "ERR_TIMED_OUT",
    "ERR_NAME_NOT_RESOLVED",
    "ERR_HTTP2_PROTOCOL_ERROR",
  ]) {
    const message = `page.goto: net::${code} at https://dragons-ticket.jp/Login.aspx`;
    assert.equal(isTransientMonitorError(new Error(message), message), true);
  }
});

test("設定や認証の恒久的なエラーは失敗として残す", () => {
  const message = "ログインできませんでした: IDまたはパスワードが違います";
  assert.equal(isTransientMonitorError(new Error(message), message), false);
});
