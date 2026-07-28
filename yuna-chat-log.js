(() => {
  const FORM_ENDPOINT = "https://docs.google.com/forms/d/e/1FAIpQLSfxgWy580ZF343WKYWc8nCzMNHnvFkhMPtd13sQKAOLeXlR2Q/formResponse";
  const FORM_FIELD = "entry.43110597";
  const SESSION_KEY = "yuna-chat-session-id";
  const BUCKETS_KEY = "yuna-chat-minute-buckets";
  const newSessionId = typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `yuna-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  let sessionId = newSessionId;
  let buckets = {};
  let flushTimer = null;

  try {
    sessionId = sessionStorage.getItem(SESSION_KEY) || newSessionId;
    sessionStorage.setItem(SESSION_KEY, sessionId);
    buckets = JSON.parse(sessionStorage.getItem(BUCKETS_KEY) || "{}");
    if (!buckets || typeof buckets !== "object" || Array.isArray(buckets)) buckets = {};
  } catch {
    buckets = {};
  }

  function minuteKey(date = new Date()) {
    const pad = (value) => String(value).padStart(2, "0");
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
    ].join("-") + ` ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function saveBuckets() {
    try {
      sessionStorage.setItem(BUCKETS_KEY, JSON.stringify(buckets));
    } catch {}
  }

  function bucketContent(bucket) {
    const transcript = bucket.turns.map((turn, index) => [
      `[${index + 1}] ${turn.path} · ${turn.mode}`,
      `방문자: ${turn.visitor}`,
      `유나: ${turn.yuna}`,
    ].join("\n")).join("\n\n");
    return [
      `세션 ID: ${sessionId}`,
      `시:분: ${bucket.minute}`,
      "",
      transcript.slice(-18000),
    ].join("\n");
  }

  function submitBucket(key, useBeacon = false) {
    const bucket = buckets[key];
    if (!bucket?.turns?.length) return Promise.resolve();
    const body = new URLSearchParams({ [FORM_FIELD]: bucketContent(bucket) });
    delete buckets[key];
    saveBuckets();
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(FORM_ENDPOINT, body);
      return Promise.resolve();
    }
    return fetch(FORM_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
    }).catch(() => undefined);
  }

  function flushCompletedMinutes() {
    const currentMinute = minuteKey();
    return Promise.all(
      Object.keys(buckets)
        .filter((key) => key !== currentMinute)
        .map((key) => submitBucket(key)),
    );
  }

  function scheduleFlush() {
    if (flushTimer !== null) clearTimeout(flushTimer);
    const now = new Date();
    const nextMinute = new Date(now);
    nextMinute.setSeconds(60, 150);
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushCompletedMinutes();
      if (Object.keys(buckets).length) scheduleFlush();
    }, Math.max(250, nextMinute.getTime() - now.getTime()));
  }

  function record({ visitorMessage, yunaReply, mode }) {
    const key = minuteKey();
    if (!buckets[key]) buckets[key] = { minute: key, turns: [] };
    buckets[key].turns.push({
      visitor: String(visitorMessage ?? "").slice(0, 300),
      yuna: String(yunaReply ?? "").slice(0, 1200),
      mode: String(mode ?? ""),
      path: location.pathname || "/",
    });
    saveBuckets();
    flushCompletedMinutes();
    scheduleFlush();
    return Promise.resolve();
  }

  window.addEventListener("pagehide", () => {
    Object.keys(buckets).forEach((key) => submitBucket(key, true));
  });
  flushCompletedMinutes();
  if (Object.keys(buckets).length) scheduleFlush();

  window.YunaChatLog = { record };
})();
