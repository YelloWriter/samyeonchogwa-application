(() => {
  const FORM_ENDPOINT = "https://docs.google.com/forms/d/e/1FAIpQLSfxgWy580ZF343WKYWc8nCzMNHnvFkhMPtd13sQKAOLeXlR2Q/formResponse";
  const FORM_FIELD = "entry.43110597";
  const sessionId = typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `yuna-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  function record({ visitorMessage, yunaReply, mode }) {
    const content = [
      `세션 ID: ${sessionId}`,
      `경로: ${location.pathname || "/"}`,
      `응답 방식: ${mode}`,
      "",
      `방문자: ${String(visitorMessage ?? "").slice(0, 300)}`,
      "",
      `유나: ${String(yunaReply ?? "").slice(0, 1200)}`,
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
