export function isTransientMonitorError(error, message) {
  return (error instanceof Error && error.name === "TimeoutError")
    || /今回は判定を保留|サイトが混雑|一時エラー/.test(message)
    || /net::ERR_(?:CONNECTION_RESET|CONNECTION_CLOSED|CONNECTION_REFUSED|TIMED_OUT|NAME_NOT_RESOLVED|HTTP2_PROTOCOL_ERROR)/i.test(message);
}
