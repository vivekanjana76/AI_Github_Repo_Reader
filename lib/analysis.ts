import { createTtlCache } from "@/lib/cache";
import { AppError } from "@/lib/errors";
import { requestJsonCompletion } from "@/lib/openrouter";
import type { RepoAnalysis, RepoContext } from "@/lib/types";
import { truncateText } from "@/lib/utils";

const analysisCache = createTtlCache<RepoAnalysis>(1000 * 60 * 10);

type AnalysisPayload = Partial<RepoAnalysis>;

function buildAnalysisPrompt(repo: RepoContext) {
  const fileSummaries = repo.selectedFiles
    .slice(0, 8)
    .map(
      (file) =>
        [
          `FILE: ${file.path}`,
          `SIZE: ${file.size} bytes`,
          `PREVIEW:\n${truncateText(file.content, 1400)}`
        ].join("\n")
    )
    .join("\n\n");

  return [
    "You are reviewing a GitHub repository as a senior engineer.",
    "Return only JSON with this exact shape:",
    JSON.stringify(
      {
        summary: "string",
        techStack: ["string"],
        issues: [
          {
            title: "string",
            severity: "high | medium | low",
            explanation: "string",
            filePaths: ["string"]
          }
        ],
        suggestions: [
          {
            title: "string",
            details: "string"
          }
        ],
        codeQualityScore: 7
      },
      null,
      2
    ),
    "Rules:",
    "- Ground every issue in the provided files only.",
    "- Keep the summary short and concrete.",
    "- Include between 0 and 5 issues.",
    "- Include between 1 and 5 suggestions.",
    "- codeQualityScore must be an integer from 1 to 10.",
    "- Prefer high-signal findings over generic advice.",
    `Repository: ${repo.owner}/${repo.name}`,
    `Default branch: ${repo.defaultBranch}`,
    `Description: ${repo.description ?? "No description"}`,
    `Dominant directories: ${repo.dominantDirectories.join(", ")}`,
    `Structure sample:\n${repo.structure.join("\n")}`,
    `Representative files:\n${fileSummaries}`
  ].join("\n\n");
}

function normalizeAnalysis(payload: AnalysisPayload): RepoAnalysis {
  const rawScore =
    typeof payload.codeQualityScore === "number" ? Math.round(payload.codeQualityScore) : 5;

  return {
    summary: payload.summary?.trim() || "No summary generated.",
    techStack: Array.isArray(payload.techStack) ? payload.techStack.slice(0, 8) : [],
    issues: Array.isArray(payload.issues)
      ? payload.issues
          .filter((issue) => issue && typeof issue.title === "string")
          .slice(0, 5)
          .map((issue) => ({
            title: issue.title,
            severity:
              issue.severity === "high" || issue.severity === "medium" || issue.severity === "low"
                ? issue.severity
                : "medium",
            explanation: typeof issue.explanation === "string" ? issue.explanation : "No explanation provided.",
            filePaths: Array.isArray(issue.filePaths) ? issue.filePaths.slice(0, 5) : []
          }))
      : [],
    suggestions: Array.isArray(payload.suggestions)
      ? payload.suggestions
          .filter((suggestion) => suggestion && typeof suggestion.title === "string")
          .slice(0, 5)
          .map((suggestion) => ({
            title: suggestion.title,
            details: typeof suggestion.details === "string" ? suggestion.details : "No details provided."
          }))
      : [],
    codeQualityScore: Math.max(1, Math.min(10, rawScore))
  };
}

export async function analyzeRepository(repo: RepoContext) {
  const cacheKey = `${repo.owner}/${repo.name}:${repo.defaultBranch}:analysis`;
  const cached = analysisCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const payload = await requestJsonCompletion({
    system:
      "You are a practical staff engineer. Return valid JSON only and keep findings grounded in the repository files.",
    user: buildAnalysisPrompt(repo),
    maxTokens: 1200,
    temperature: 0.15
  });

  if (!payload || typeof payload !== "object") {
    throw new AppError("The analysis model returned an invalid response.", 502);
  }

  const normalized = normalizeAnalysis(payload as AnalysisPayload);
  analysisCache.set(cacheKey, normalized);

  return normalized;
}
