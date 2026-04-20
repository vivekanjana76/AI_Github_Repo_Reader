import type { ChatTurn, RetrievedChunk, RepoContext, RepoFile } from "@/lib/types";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "of",
  "on",
  "or",
  "show",
  "tell",
  "the",
  "this",
  "to",
  "what",
  "where",
  "which",
  "with"
]);

type RetrievalIntent = "overview" | "setup" | "architecture" | "testing" | "implementation" | "unknown";

function normalizeText(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_./-]/g, " ")
    .toLowerCase();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function detectIntent(question: string) {
  const lowerQuestion = question.toLowerCase();

  if (/(what does|overview|summary|purpose|about this repo|what is this)/.test(lowerQuestion)) {
    return "overview" satisfies RetrievalIntent;
  }

  if (/(install|setup|run|start|env|configuration|config|deploy)/.test(lowerQuestion)) {
    return "setup" satisfies RetrievalIntent;
  }

  if (/(structure|architecture|organized|folder|module|flow)/.test(lowerQuestion)) {
    return "architecture" satisfies RetrievalIntent;
  }

  if (/(test|spec|coverage)/.test(lowerQuestion)) {
    return "testing" satisfies RetrievalIntent;
  }

  if (/(function|class|logic|implement|handler|api|hook|component|works)/.test(lowerQuestion)) {
    return "implementation" satisfies RetrievalIntent;
  }

  return "unknown";
}

function getIntentPathBoost(intent: RetrievalIntent, path: string) {
  const lowerPath = path.toLowerCase();

  if (intent === "overview") {
    if (lowerPath.includes("readme")) return 20;
    if (lowerPath.endsWith("package.json")) return 10;
  }

  if (intent === "setup") {
    if (lowerPath.includes("readme")) return 10;
    if (lowerPath.includes("config") || lowerPath.endsWith("package.json")) return 14;
    if (lowerPath.includes(".env")) return 12;
  }

  if (intent === "architecture") {
    if (lowerPath.startsWith("src/") || lowerPath.startsWith("app/") || lowerPath.startsWith("lib/")) return 12;
  }

  if (intent === "testing" && (lowerPath.includes("test") || lowerPath.includes("spec"))) {
    return 16;
  }

  if (intent === "implementation" && /\.(ts|tsx|js|jsx|py|go|rs|java|rb|php)$/i.test(lowerPath)) {
    return 10;
  }

  return 0;
}

function buildQuery(question: string, history: ChatTurn[]) {
  const recentTurns = history
    .slice(-4)
    .map((turn) => turn.content)
    .join(" ");

  return `${recentTurns} ${question}`.trim();
}

function chunkFile(file: RepoFile) {
  const chunks: RetrievedChunk[] = [];
  const lines = file.content.split("\n");
  const isMarkdown = /\.(md|mdx)$/i.test(file.path);
  const windowSize = isMarkdown ? 36 : 28;
  const step = isMarkdown ? 24 : 18;

  for (let start = 0; start < lines.length; start += step) {
    const slice = lines.slice(start, start + windowSize);
    const content = slice.join("\n").trim();

    if (!content) {
      continue;
    }

    chunks.push({
      chunkId: `${file.path}:${start + 1}`,
      path: file.path,
      content,
      lineStart: start + 1,
      lineEnd: Math.min(start + windowSize, lines.length),
      score: 0,
      matchedTerms: [],
      reason: ""
    });
  }

  if (chunks.length === 0) {
    chunks.push({
      chunkId: `${file.path}:1`,
      path: file.path,
      content: file.content,
      lineStart: 1,
      lineEnd: lines.length || 1,
      score: 0,
      matchedTerms: [],
      reason: ""
    });
  }

  return chunks;
}

function uniqueTokens(tokens: string[]) {
  return [...new Set(tokens)];
}

function buildReason(intent: RetrievalIntent, matchedTerms: string[], path: string) {
  const reasons: string[] = [];

  if (matchedTerms.length > 0) {
    reasons.push(`matched ${matchedTerms.slice(0, 4).join(", ")}`);
  }

  if (intent !== "unknown") {
    reasons.push(`useful for ${intent} questions`);
  }

  if (path.toLowerCase().includes("readme")) {
    reasons.push("high-level project context");
  }

  return reasons.join("; ");
}

function scoreChunk(tokens: string[], intent: RetrievalIntent, chunk: RetrievedChunk) {
  const normalizedPath = normalizeText(chunk.path);
  const normalizedContent = normalizeText(chunk.content);
  let score = getIntentPathBoost(intent, chunk.path);
  const matchedTerms: string[] = [];

  for (const token of tokens) {
    let tokenScore = 0;

    if (normalizedPath.includes(token)) {
      tokenScore += 12;
    }

    if (normalizedContent.includes(token)) {
      const matches = normalizedContent.split(token).length - 1;
      tokenScore += Math.min(matches, 6) * 3;
    }

    if (tokenScore > 0) {
      matchedTerms.push(token);
      score += tokenScore;
    }
  }

  if (tokens.some((token) => chunk.content.includes(token))) {
    score += 2;
  }

  if (chunk.path.toLowerCase().includes("readme")) score += 3;
  if (chunk.path.toLowerCase().endsWith("package.json")) score += 3;
  if (chunk.path.toLowerCase().includes("index")) score += 1;

  return {
    ...chunk,
    score,
    matchedTerms: uniqueTokens(matchedTerms),
    reason: buildReason(intent, uniqueTokens(matchedTerms), chunk.path)
  };
}

function selectDiverseChunks(ranked: RetrievedChunk[], maxChunks: number) {
  const selected: RetrievedChunk[] = [];
  const fileCounts = new Map<string, number>();

  for (const chunk of ranked) {
    const perFileCount = fileCounts.get(chunk.path) ?? 0;

    if (perFileCount >= 2) {
      continue;
    }

    selected.push(chunk);
    fileCounts.set(chunk.path, perFileCount + 1);

    if (selected.length >= maxChunks) {
      break;
    }
  }

  return selected;
}

function fallbackChunks(repo: RepoContext) {
  return repo.selectedFiles.slice(0, 4).map((file) => {
    const [chunk] = chunkFile(file);
    return {
      ...chunk,
      score: 1,
      reason: "fallback context from a high-priority repository file"
    };
  });
}

export function retrieveRelevantChunks(repo: RepoContext, question: string, history: ChatTurn[] = []) {
  const query = buildQuery(question, history);
  const tokens = uniqueTokens(tokenize(query)).slice(0, 18);
  const intent = detectIntent(question);
  const allChunks = repo.selectedFiles.flatMap((file) => chunkFile(file));

  const ranked = allChunks
    .map((chunk) => scoreChunk(tokens, intent, chunk))
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));

  const selected = selectDiverseChunks(ranked, 6);

  if (selected.length === 0 || selected.every((chunk) => chunk.score <= 0)) {
    return fallbackChunks(repo);
  }

  return selected;
}
