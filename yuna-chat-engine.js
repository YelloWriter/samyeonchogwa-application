(() => {
  const state = { lastIntent: "", recentReplyIds: [] };
  const testReplies = [
    "그 말, 주호가 많이 했었죠. 대개 무언가 열어 보기 전에요.",
    "테스트요? 주호는 그 말을 하고 나면 늘 설명을 덧붙였어요. 꽤 길게요.",
    "그 말, 주호가 많이 했었죠. 그리고 대부분은 정말 테스트로 끝나지 않았고요.",
    "주호답네요. 테스트라는 말은 그 사람에게 안전하다는 뜻이 아니었어요.",
    "그 말, 주호가 많이 했었죠. 저는 그다음에 무슨 일이 생겼는지도 조금 알아요."
  ];

  function normalize(input) {
    const dictionary = window.YUNA_CHAT_DATA?.normalization_dictionary ?? {};
    let value = String(input ?? "").normalize("NFC").toLowerCase().trim().replace(/[!?.,…]+/g, "").replace(/\s+/g, " ");
    for (const [from, to] of Object.entries(dictionary.colloquial_map ?? {})) value = value.split(from).join(to);
    for (const [from, to] of Object.entries(dictionary.common_typos ?? {})) value = value.split(from).join(to);
    return value;
  }

  function textOf(response) {
    return typeof response === "string" ? response : response?.text;
  }

  function pick(intent) {
    const candidates = (intent.responses ?? []).filter((item) => textOf(item));
    const fresh = candidates.filter((item) => !state.recentReplyIds.includes(item.id ?? textOf(item)));
    const pool = fresh.length ? fresh : candidates;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    const id = selected?.id ?? textOf(selected);
    if (id) state.recentReplyIds = [...state.recentReplyIds, id].slice(-6);
    state.lastIntent = intent.id ?? "";
    return textOf(selected) ?? null;
  }

  function matchScore(intent, normalized) {
    const exact = (intent.exact_phrases ?? []).some((phrase) => normalize(phrase) === normalized);
    if (exact) return 100;
    const regex = (intent.regex_patterns ?? []).some((pattern) => {
      try { return new RegExp(pattern, "i").test(normalized); } catch { return false; }
    });
    if (regex) return 90;
    const all = (intent.all_keywords ?? []).filter(Boolean);
    if (all.length && all.every((word) => normalized.includes(normalize(word)))) return 80;
    const groups = intent.keyword_groups ?? [];
    if (groups.some((group) => Array.isArray(group) && group.every((word) => normalized.includes(normalize(word))))) return 70;
    if ((intent.any_keywords ?? []).some((word) => normalized.includes(normalize(word)))) return 50;
    return 0;
  }

  function reply(message) {
    const normalized = normalize(message);
    if (!normalized) return null;
    if (normalized === "테스트") return testReplies[Math.floor(Math.random() * testReplies.length)];

    const intents = (window.YUNA_CHAT_DATA?.intents ?? []).filter((intent) => !intent.secret && !intent.secret_track);
    const matches = intents
      .map((intent) => ({ intent, score: matchScore(intent, normalized) }))
      .filter((item) => item.score >= 45)
      .sort((a, b) => (b.intent.priority ?? 0) - (a.intent.priority ?? 0) || b.score - a.score);
    return matches.length ? pick(matches[0].intent) : null;
  }

  window.YunaKeywordEngine = { reply };
})();
