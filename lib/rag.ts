import type { RetrievedChunk, RepoContext, RepoFile } from "@/lib/types";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "what",
  "where",
  "which",
  "with"
]);

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9_/-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function chunkFile(file: RepoFile) {
  const chunks: RetrievedChunk[] = [];
  const lines = file.content.split("\n");
  const step = 30;
  const windowSize = 45;

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
      score: 0
    });
  }

  if (chunks.length === 0) {
    chunks.push({
      chunkId: `${file.path}:1`,
      path: file.path,
      content: file.content,
      score: 0
    });
  }

  return chunks;
}

function scoreChunk(questionTokens: string[], chunk: RetrievedChunk) {
  const haystack = `${chunk.path}\n${chunk.content}`.toLowerCase();
  let score = 0;

  for (const token of questionTokens) {
    if (chunk.path.toLowerCase().includes(token)) {
      score += 8;
    }

    const matches = haystack.split(token).length - 1;
    score += matches * 2;
  }

  if (chunk.path.toLowerCase().includes("readme")) score += 2;
  if (chunk.path.toLowerCase().includes("package.json")) score += 2;

  return score;
}

export function retrieveRelevantChunks(repo: RepoContext, question: string) {
  const questionTokens = tokenize(question);
  const allChunks = repo.selectedFiles.flatMap((file) => chunkFile(file));

  const ranked = allChunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(questionTokens, chunk)
    }))
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));

  const top = ranked.slice(0, 4);

  if (top.every((chunk) => chunk.score === 0)) {
    return allChunks.slice(0, 4);
  }

  return top;
}
