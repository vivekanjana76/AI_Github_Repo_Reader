export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
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
