import { createTtlCache } from "@/lib/cache";
import { AppError } from "@/lib/errors";
import type { RepoContext, RepoFile } from "@/lib/types";
import { normalizeGitHubRepoUrl, truncateText } from "@/lib/utils";

const GITHUB_API_BASE = "https://api.github.com";
const MAX_FILE_COUNT = 14;
const MAX_FILE_BYTES = 14_000;
const MAX_TOTAL_CHARS = 80_000;
const repoCache = createTtlCache<RepoContext>(1000 * 60 * 10);

type RepoIdentity = {
  owner: string;
  name: string;
};

type GitHubTreeEntry = {
  path: string;
  type: "blob" | "tree";
  size?: number;
  sha: string;
};

type RepoResponse = {
  default_branch: string;
  description: string | null;
};

type BranchResponse = {
  commit: {
    sha: string;
  };
};

type ContentResponse = {
  content?: string;
  encoding?: string;
  size: number;
  sha: string;
};

function getGitHubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ai-engineer-app"
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

export function parseGitHubUrl(repoUrl: string): RepoIdentity {
  let normalized: URL;

  try {
    normalized = new URL(repoUrl.trim());
  } catch {
    throw new AppError("Please enter a valid GitHub repository URL.", 400);
  }

  if (normalized.hostname !== "github.com") {
    throw new AppError("Only public GitHub repository URLs are supported.", 400);
  }

  const [owner, rawRepo] = normalized.pathname.split("/").filter(Boolean);

  if (!owner || !rawRepo) {
    throw new AppError("The URL must look like https://github.com/owner/repo.", 400);
  }

  return {
    owner,
    name: rawRepo.replace(/\.git$/, "")
  };
}

async function githubFetch<T>(path: string) {
  let response: Response;

  try {
    response = await fetch(`${GITHUB_API_BASE}${path}`, {
      headers: getGitHubHeaders(),
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(20_000)
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new AppError("GitHub took too long to respond. Try again in a moment.", 504);
    }

    throw error;
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new AppError("Repository not found. Double-check the URL and that it is public.", 404);
    }

    if (response.status === 403) {
      throw new AppError("GitHub API rate limit hit. Add a GitHub token or try again shortly.", 429);
    }

    throw new AppError(`GitHub request failed with status ${response.status}.`, response.status);
  }

  return (await response.json()) as T;
}

function isTextPath(path: string) {
  const lowerPath = path.toLowerCase();
  const allowed = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".json",
    ".md",
    ".mdx",
    ".css",
    ".scss",
    ".html",
    ".yml",
    ".yaml",
    ".py",
    ".go",
    ".rs",
    ".java",
    ".rb",
    ".php"
  ];
  const blockedFragments = [
    "node_modules/",
    ".next/",
    "dist/",
    "build/",
    "coverage/",
    ".git/",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    ".min.js",
    ".min.css"
  ];

  if (blockedFragments.some((fragment) => lowerPath.includes(fragment))) {
    return false;
  }

  return allowed.some((extension) => lowerPath.endsWith(extension));
}

function isLikelyGeneratedContent(content: string) {
  if (content.length > 8000 && !content.includes("\n")) {
    return true;
  }

  const denseLine = content
    .split("\n")
    .slice(0, 12)
    .some((line) => line.length > 500);

  return denseLine;
}

function scorePath(path: string) {
  const lowerPath = path.toLowerCase();
  let score = 0;

  if (lowerPath.startsWith("readme")) score += 120;
  if (lowerPath.endsWith("package.json")) score += 110;
  if (lowerPath.includes("tsconfig")) score += 90;
  if (lowerPath.includes("next.config")) score += 90;
  if (lowerPath.includes("tailwind.config")) score += 70;
  if (lowerPath.startsWith("app/")) score += 80;
  if (lowerPath.startsWith("src/")) score += 75;
  if (lowerPath.startsWith("components/")) score += 65;
  if (lowerPath.startsWith("lib/")) score += 60;
  if (lowerPath.startsWith("pages/")) score += 55;
  if (lowerPath.includes("/api/")) score += 55;
  if (lowerPath.includes("prisma")) score += 45;
  if (lowerPath.includes("config")) score += 35;
  if (lowerPath.endsWith(".md")) score += 20;

  return score - lowerPath.split("/").length;
}

async function fetchFileContent(owner: string, repo: string, path: string) {
  const safePath = path.split("/").map(encodeURIComponent).join("/");
  const payload = await githubFetch<ContentResponse>(`/repos/${owner}/${repo}/contents/${safePath}`);

  if (payload.encoding !== "base64" || !payload.content) {
    return null;
  }

  const content = Buffer.from(payload.content, "base64").toString("utf8");

  return {
    path,
    size: payload.size,
    sha: payload.sha,
    content
  } satisfies RepoFile;
}

function buildStructureSample(entries: GitHubTreeEntry[]) {
  return entries
    .sort((left, right) => left.path.localeCompare(right.path))
    .slice(0, 120)
    .map((entry) => (entry.type === "tree" ? `${entry.path}/` : entry.path));
}

function getDominantDirectories(entries: GitHubTreeEntry[]) {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    const directory = entry.path.includes("/") ? entry.path.split("/")[0] : "root";
    counts.set(directory, (counts.get(directory) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([directory, count]) => `${directory} (${count})`);
}

function pickInterestingFiles(entries: GitHubTreeEntry[]) {
  const ranked = entries
    .filter((entry) => entry.type === "blob" && isTextPath(entry.path) && (entry.size ?? 0) <= MAX_FILE_BYTES)
    .sort((left, right) => scorePath(right.path) - scorePath(left.path));

  const chosen: GitHubTreeEntry[] = [];
  const seenDirectories = new Set<string>();

  for (const entry of ranked) {
    const directory = entry.path.includes("/") ? entry.path.split("/")[0] : "root";

    if (!seenDirectories.has(directory) || chosen.length < Math.ceil(MAX_FILE_COUNT / 2)) {
      chosen.push(entry);
      seenDirectories.add(directory);
    }

    if (chosen.length >= MAX_FILE_COUNT) {
      break;
    }
  }

  if (chosen.length < MAX_FILE_COUNT) {
    for (const entry of ranked) {
      if (chosen.some((selected) => selected.path === entry.path)) {
        continue;
      }

      chosen.push(entry);

      if (chosen.length >= MAX_FILE_COUNT) {
        break;
      }
    }
  }

  return chosen;
}

export async function getRepoContext(repoUrl: string): Promise<RepoContext> {
  const normalizedRepoUrl = normalizeGitHubRepoUrl(repoUrl);
  const cached = repoCache.get(normalizedRepoUrl);

  if (cached) {
    return cached;
  }

  const { owner, name } = parseGitHubUrl(normalizedRepoUrl);
  const repo = await githubFetch<RepoResponse>(`/repos/${owner}/${name}`);
  const branch = await githubFetch<BranchResponse>(`/repos/${owner}/${name}/branches/${repo.default_branch}`);
  const tree = await githubFetch<{ tree: GitHubTreeEntry[] }>(
    `/repos/${owner}/${name}/git/trees/${branch.commit.sha}?recursive=1`
  );

  const interestingFiles = pickInterestingFiles(tree.tree);
  const downloadedFiles = await Promise.all(
    interestingFiles.map((entry) => fetchFileContent(owner, name, entry.path))
  );

  const selectedFiles: RepoFile[] = [];
  let totalChars = 0;

  for (const file of downloadedFiles) {
    if (!file?.content.trim()) {
      continue;
    }

    if (isLikelyGeneratedContent(file.content)) {
      continue;
    }

    const trimmedContent = truncateText(file.content, 7000);

    if (totalChars + trimmedContent.length > MAX_TOTAL_CHARS) {
      continue;
    }

    selectedFiles.push({
      ...file,
      content: trimmedContent
    });
    totalChars += trimmedContent.length;
  }

  if (selectedFiles.length === 0) {
    throw new AppError("No supported text files were found to analyze in this repository.", 422);
  }

  const result: RepoContext = {
    repoUrl: normalizedRepoUrl,
    owner,
    name,
    defaultBranch: repo.default_branch,
    description: repo.description,
    fileCount: tree.tree.length,
    structure: buildStructureSample(tree.tree),
    selectedFiles,
    dominantDirectories: getDominantDirectories(tree.tree)
  };

  repoCache.set(normalizedRepoUrl, result);

  return result;
}
