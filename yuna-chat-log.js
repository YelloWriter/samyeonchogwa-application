(() => {
  const FORM_ENDPOINT = "https://docs.google.com/forms/d/e/1FAIpQLSfxgWy580ZF343WKYWc8nCzMNHnvFkhMPtd13sQKAOLeXlR2Q/formResponse";
  const FORM_FIELD = "entry.43110597";
  const SESSION_KEY = "yuna-chat-session-id";
  const TRANSCRIPT_KEY = "yuna-chat-session-transcript-v2";
  const MAX_TRANSCRIPT_CHARS = 45000;
  const newSessionId = typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `yuna-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  let state = {
    sessionId: newSessionId,
    startedAt: null,
    lastSentAt: null,
    sequence: 0,
    messages: [],
  };
  let submitQueue = Promise.resolve();

  try {
    const sessionId = sessionStorage.getItem(SESSION_KEY) || newSessionId;
    sessionStorage.setItem(SESSION_KEY, sessionId);
    const restored = JSON.parse(sessionStorage.getItem(TRANSCRIPT_KEY) || "null");
    if (
      restored &&
      restored.sessionId === sessionId &&
      Array.isArray(restored.messages)
    ) {
      state = {
        sessionId,
        startedAt: Number(restored.startedAt) || null,
        lastSentAt: Number(restored.lastSentAt) || null,
        sequence: Number(restored.sequence) || 0,
        messages: restored.messages
          .filter((item) =>
            item &&
            (item.role === "방문자" || item.role === "유나") &&
            Number.isFinite(Number(item.at)) &&
            typeof item.text === "string"
          )
          .map((item) => ({
            role: item.role,
            at: Number(item.at),
            text: item.text.slice(0, 1200),
          })),
      };
    } else {
      state.sessionId = sessionId;
    }
  } catch {}

  function saveState() {
    try {
      sessionStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(state));
    } catch {}
  }

  function formatKst(timestamp) {
    const parts = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(timestamp));
    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
    return `${values.year}/${values.month}/${values.day} ${values.hour}:${values.minute}`;
  }

  function transcriptBody() {
    return state.messages
      .map((message) =>
        `[${formatKst(message.at)}] ${message.role} : ${message.text}`
      )
      .join("\n");
  }

  function snapshot() {
    const startedAt = state.startedAt || state.messages[0]?.at || Date.now();
    const lastSentAt =
      state.lastSentAt ||
      state.messages[state.messages.length - 1]?.at ||
      startedAt;
    const header = [
      `세션 ID: ${state.sessionId}`,
      `대화 시간: ${formatKst(startedAt)} ~ ${formatKst(lastSentAt)}`,
      `기록 순번: ${state.sequence}`,
      "기록 형식: SESSION_SNAPSHOT_V2",
      "",
      "",
    ].join("\n");
    const room = Math.max(0, MAX_TRANSCRIPT_CHARS - header.length);
    return header + transcriptBody().slice(-room);
  }

  function submitSnapshot(content) {
    const body = new URLSearchParams({ [FORM_FIELD]: content });
    return fetch(FORM_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
    }).catch(() => undefined);
  }

  function record({ visitorMessage, yunaReply, visitorAt, yunaAt }) {
    const visitorTimestamp = Number(visitorAt) || Date.now();
    const yunaTimestamp = Math.max(
      visitorTimestamp,
      Number(yunaAt) || Date.now(),
    );
    const visitorText = String(visitorMessage ?? "").trim().slice(0, 300);
    const yunaText = String(yunaReply ?? "").trim().slice(0, 1200);
    if (!visitorText || !yunaText) return Promise.resolve();

    if (!state.startedAt) state.startedAt = visitorTimestamp;
    state.lastSentAt = yunaTimestamp;
    state.sequence += 1;
    state.messages.push(
      { role: "방문자", at: visitorTimestamp, text: visitorText },
      { role: "유나", at: yunaTimestamp, text: yunaText },
    );
    saveState();

    const content = snapshot();
    submitQueue = submitQueue.then(() => submitSnapshot(content));
    return submitQueue;
  }

  window.YunaChatLog = {
    record,
    getSessionId: () => state.sessionId,
  };
})();
