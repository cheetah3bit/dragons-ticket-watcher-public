import test from "node:test";
import assert from "node:assert/strict";
import { shouldTriggerScheduledMonitor } from "../workers/line-webhook/src/schedule.ts";

function jstTimestamp(hour, minute) {
  return Date.UTC(2026, 7, 9, hour - 9, minute);
}

test("通常時間帯は5分間隔で監視する", () => {
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(9, 45)), true);
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(9, 46)), false);
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(10, 20)), false);
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(10, 21)), false);
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(10, 25)), true);
});

test("9:57から10:20までは9:57起点の2分間隔で監視する", () => {
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(9, 57)), true);
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(9, 58)), false);
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(9, 59)), true);
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(10, 17)), true);
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(10, 18)), false);
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(10, 19)), true);
});
