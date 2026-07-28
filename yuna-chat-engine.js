(() => {
  const state = { lastIntent: "", recentReplyIds: [] };
  const testReplies = [
    "그 말, 주호가 많이 했었죠. 대개 무언가 열어 보기 전에요.",
    "테스트요? 주호는 그 말을 하고 나면 늘 설명을 덧붙였어요. 꽤 길게요.",
    "그 말, 주호가 많이 했었죠. 그리고 대부분은 정말 테스트로 끝나지 않았고요.",
    "주호답네요. 테스트라는 말은 그 사람에게 안전하다는 뜻이 아니었어요.",
    "그 말, 주호가 많이 했었죠. 저는 그다음에 무슨 일이 생겼는지도 조금 알아요."
  ];
  const aegisUnknownReplies = [
    "아이기스요? 저는 그곳에 관해서 아는 게 없어요.",
    "그건 제가 알 수 없는 이야기예요. 아이기스와 연결되어 있지도 않고요.",
    "아이기스의 조직이나 임무에 관해서는 전혀 몰라요.",
    "처음 듣는 이야기네요. 저는 아이기스의 정보에 접근할 수 없어요.",
    "그 부분은 주호에게 직접 물어보는 편이 좋겠어요. 저는 아이기스를 모르거든요."
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
    const candidates = (intent.responses ?? []).filter((item) => {
      const text = textOf(item);
      return text && !/(아이기스|임무|출동|규칙서|생활관|휴게실|복귀|의료실)/i.test(text);
    });
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
    if (/(아이기스|aegis|a\.e\.g\.i\.s|부대|임무|출동|복귀|규칙서|생활관|휴게실|괴이|이상현상|코드네임)/i.test(normalized)) {
      return aegisUnknownReplies[Math.floor(Math.random() * aegisUnknownReplies.length)];
    }
    if (/(주호|아주호|그 사람).*(과거|예전|옛날|이전 이야기|지난 이야기|어릴 때|고등학생 때)/.test(normalized)) return null;

    const intents = (window.YUNA_CHAT_DATA?.intents ?? []).filter((intent) => !intent.secret && !intent.secret_track && intent.category !== "world_smalltalk");
    const matches = intents
      .map((intent) => ({ intent, score: matchScore(intent, normalized) }))
      .filter((item) => item.score >= 45)
      .sort((a, b) => (b.intent.priority ?? 0) - (a.intent.priority ?? 0) || b.score - a.score);
    return matches.length ? pick(matches[0].intent) : null;
  }

  window.YunaKeywordEngine = { reply };
})();
