import type { AnalysisResult } from "@/lib/types";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function extractJsonObject(text: string) {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("The model response did not contain JSON.");
  }

  return text.slice(firstBrace, lastBrace + 1);
}

export function normalizeGitHubRepoUrl(repoUrl: string) {
  const normalized = new URL(repoUrl.trim());
  const [owner, rawRepo] = normalized.pathname.split("/").filter(Boolean);

  if (!owner || !rawRepo) {
    throw new Error("The URL must look like https://github.com/owner/repo.");
  }

  return `https://github.com/${owner}/${rawRepo.replace(/\.git$/, "")}`;
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}\n... [truncated]`;
}

export function normalizeAnalysisResult(payload: unknown): AnalysisResult {
  const candidate = payload as Partial<AnalysisResult>;

  return {
    summary: {
      projectPurpose: candidate.summary?.projectPurpose?.trim() || "No summary generated.",
      techStack: candidate.summary?.techStack ?? [],
      folderStructure: candidate.summary?.folderStructure ?? [],
      keyModules: candidate.summary?.keyModules ?? []
    },
    issues: Array.isArray(candidate.issues) ? candidate.issues : [],
    suggestions: Array.isArray(candidate.suggestions) ? candidate.suggestions : [],
    snippets: Array.isArray(candidate.snippets) ? candidate.snippets : [],
    prDiff: candidate.prDiff ?? null
  };
}
