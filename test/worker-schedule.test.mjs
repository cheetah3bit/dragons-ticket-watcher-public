import test from "node:test";
import assert from "node:assert/strict";
import { shouldTriggerScheduledMonitor } from "../workers/line-webhook/src/schedule.ts";

function jstTimestamp(hour, minute) {
  return Date.UTC(2026, 7, 9, hour - 9, minute);
}

test("通常時間帯は5分間隔で監視する", () => {
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(9, 45)), true);
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(9, 46)), false);
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(10, 35)), true);
});

test("9:50から10:30までは2分間隔で監視する", () => {
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(9, 50)), true);
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(9, 51)), false);
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(9, 52)), true);
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(10, 28)), true);
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(10, 29)), false);
  assert.equal(shouldTriggerScheduledMonitor(jstTimestamp(10, 30)), true);
});
