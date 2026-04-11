import type { RepoContext } from "@/lib/types";

export function buildAnalysisPrompt(repo: RepoContext) {
  const fileBlock = repo.selectedFiles
    .map(
      (file) =>
        `FILE: ${file.path}\nSIZE: ${file.size} bytes\n---\n${file.content}\n=== END FILE ===`
    )
    .join("\n\n");

  return `
You are a senior AI software engineer reviewing a GitHub repository.
Be concrete, cite file paths when possible, and prioritize real issues over generic advice.

Return ONLY valid JSON with this exact shape:
{
  "summary": {
    "projectPurpose": "string",
    "techStack": ["string"],
    "folderStructure": ["string"],
    "keyModules": ["string"]
  },
  "issues": [
    {
      "title": "string",
      "severity": "high | medium | low",
      "explanation": "string",
      "filePaths": ["string"],
      "suggestedFix": "string"
    }
  ],
  "suggestions": [
    {
      "title": "string",
      "details": "string"
    }
  ],
  "snippets": [
    {
      "title": "string",
      "language": "string",
      "code": "string",
      "explanation": "string"
    }
  ],
  "prDiff": {
    "title": "string",
    "summary": "string",
    "diff": "string"
  }
}

Rules:
- Keep issues grounded in the provided files.
- Use short, practical prose.
- Include 0-5 issues, 0-5 suggestions, and 0-3 snippets.
- If a PR-style diff would be low confidence, return null for "prDiff".
- Do not wrap the JSON in markdown.

Repository:
- URL: ${repo.repoUrl}
- Owner: ${repo.owner}
- Name: ${repo.name}
- Default branch: ${repo.defaultBranch}
- Description: ${repo.description ?? "No description"}
- Total files in tree: ${repo.fileCount}
- Dominant directories: ${repo.dominantDirectories.join(", ")}

Repository structure sample:
${repo.structure.join("\n")}

Selected files:
${fileBlock}
`.trim();
}
