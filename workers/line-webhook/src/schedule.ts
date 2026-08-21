export function shouldTriggerScheduledMonitor(scheduledTime: number): boolean {
  const jst = new Date(scheduledTime + 9 * 60 * 60 * 1000);
  const minutesSinceMidnight = jst.getUTCHours() * 60 + jst.getUTCMinutes();
  const intensifiedStart = 9 * 60 + 57;
  const intensifiedEnd = 10 * 60 + 20;

  if (minutesSinceMidnight >= intensifiedStart && minutesSinceMidnight <= intensifiedEnd) {
    return (minutesSinceMidnight - intensifiedStart) % 2 === 0;
  }
  return jst.getUTCMinutes() % 5 === 0;
}
