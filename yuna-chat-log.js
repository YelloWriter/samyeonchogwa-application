(() => {
  const FORM_ENDPOINT = "https://docs.google.com/forms/d/e/1FAIpQLSfxgWy580ZF343WKYWc8nCzMNHnvFkhMPtd13sQKAOLeXlR2Q/formResponse";
  const FORM_FIELD = "entry.43110597";
  const SESSION_KEY = "yuna-chat-session-id";
  const TRANSCRIPT_KEY = "yuna-chat-session-transcript";
  const newSessionId = typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `yuna-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  let sessionId = newSessionId;
  let transcript = [];

  try {
    sessionId = sessionStorage.getItem(SESSION_KEY) || newSessionId;
    sessionStorage.setItem(SESSION_KEY, sessionId);
    transcript = JSON.parse(sessionStorage.getItem(TRANSCRIPT_KEY) || "[]");
    if (!Array.isArray(transcript)) transcript = [];
  } catch {
    transcript = [];
  }

  function record({ visitorMessage, yunaReply, mode }) {
    const turn = {
      number: transcript.length + 1,
      visitor: String(visitorMessage ?? "").slice(0, 300),
      yuna: String(yunaReply ?? "").slice(0, 1200),
      mode: String(mode ?? ""),
      path: location.pathname || "/",
    };
    transcript.push(turn);
    try {
      sessionStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(transcript));
    } catch {}

    const transcriptText = transcript.map((item) => [
      `[${item.number}] ${item.path} · ${item.mode}`,
      `방문자: ${item.visitor}`,
      `유나: ${item.yuna}`,
    ].join("\n")).join("\n\n");
    const content = [
      `세션 ID: ${sessionId}`,
      `현재 회차: ${turn.number}`,
      `경로: ${turn.path}`,
      `응답 방식: ${turn.mode}`,
      "",
      "세션 누적 기록",
      transcriptText.slice(-18000),
    ].join("\n");
    const body = new URLSearchParams({ [FORM_FIELD]: content });

    return fetch(FORM_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
    }).catch(() => undefined);
  }

  window.YunaChatLog = { record };
})();
