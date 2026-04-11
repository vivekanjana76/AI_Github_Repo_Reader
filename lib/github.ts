import { createTtlCache } from "@/lib/cache";
import type { RepoContext, RepoFile } from "@/lib/types";

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
    throw new Error("Please enter a valid GitHub repository URL.");
  }

  if (normalized.hostname !== "github.com") {
    throw new Error("Only public GitHub repository URLs are supported.");
  }

  const [owner, rawRepo] = normalized.pathname.split("/").filter(Boolean);

  if (!owner || !rawRepo) {
    throw new Error("The URL must look like https://github.com/owner/repo.");
  }

  return {
    owner,
    name: rawRepo.replace(/\.git$/, "")
  };
}

async function githubFetch<T>(path: string) {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    headers: getGitHubHeaders(),
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Repository not found. Double-check the URL and that it is public.");
    }

    if (response.status === 403) {
      throw new Error("GitHub API rate limit hit. Add a GitHub token or try again shortly.");
    }

    throw new Error(`GitHub request failed with status ${response.status}.`);
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
    "yarn.lock"
  ];

  if (blockedFragments.some((fragment) => lowerPath.includes(fragment))) {
    return false;
  }

  return allowed.some((extension) => lowerPath.endsWith(extension));
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
    .slice(0, 120)
    .map((entry) => (entry.type === "tree" ? `${entry.path}/` : entry.path));
}

export async function getRepoContext(repoUrl: string): Promise<RepoContext> {
  const cached = repoCache.get(repoUrl);

  if (cached) {
    return cached;
  }

  const { owner, name } = parseGitHubUrl(repoUrl);
  const repo = await githubFetch<RepoResponse>(`/repos/${owner}/${name}`);
  const branch = await githubFetch<BranchResponse>(`/repos/${owner}/${name}/branches/${repo.default_branch}`);
  const tree = await githubFetch<{ tree: GitHubTreeEntry[] }>(
    `/repos/${owner}/${name}/git/trees/${branch.commit.sha}?recursive=1`
  );

  const interestingFiles = tree.tree
    .filter((entry) => entry.type === "blob" && isTextPath(entry.path) && (entry.size ?? 0) <= MAX_FILE_BYTES)
    .sort((left, right) => scorePath(right.path) - scorePath(left.path))
    .slice(0, MAX_FILE_COUNT * 2);

  const selectedFiles: RepoFile[] = [];
  let totalChars = 0;

  for (const entry of interestingFiles) {
    if (selectedFiles.length >= MAX_FILE_COUNT || totalChars >= MAX_TOTAL_CHARS) {
      break;
    }

    const file = await fetchFileContent(owner, name, entry.path);

    if (!file?.content.trim()) {
      continue;
    }

    if (totalChars + file.content.length > MAX_TOTAL_CHARS) {
      continue;
    }

    selectedFiles.push(file);
    totalChars += file.content.length;
  }

  if (selectedFiles.length === 0) {
    throw new Error("No supported text files were found to analyze in this repository.");
  }

  const result: RepoContext = {
    repoUrl,
    owner,
    name,
    defaultBranch: repo.default_branch,
    description: repo.description,
    fileCount: tree.tree.length,
    structure: buildStructureSample(tree.tree),
    selectedFiles
  };

  repoCache.set(repoUrl, result);

  return result;
}

