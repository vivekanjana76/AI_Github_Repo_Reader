import type { RepoTreeEntry, RepoTreeNode } from "@/lib/types";

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

export function buildRepoTree(entries: RepoTreeEntry[]) {
  const root: RepoTreeNode[] = [];
  const directoryMap = new Map<string, RepoTreeNode>();

  const ensureDirectory = (path: string, name: string) => {
    const existing = directoryMap.get(path);

    if (existing) {
      return existing;
    }

    const nextDirectory: RepoTreeNode = {
      name,
      path,
      type: "directory",
      size: null,
      badges: [],
      children: []
    };

    directoryMap.set(path, nextDirectory);
    return nextDirectory;
  };

  for (const entry of entries) {
    const parts = entry.path.split("/").filter(Boolean);
    let currentChildren = root;
    let currentPath = "";

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLeaf = index === parts.length - 1;

      if (isLeaf && entry.type === "file") {
        currentChildren.push({
          ...entry,
          children: []
        });
        continue;
      }

      const directory = ensureDirectory(currentPath, part);

      if (!currentChildren.some((child) => child.path === directory.path)) {
        currentChildren.push(directory);
      }

      currentChildren = directory.children;

      if (isLeaf && entry.type === "directory") {
        directory.badges = entry.badges;
      }
    }
  }

  const sortNodes = (nodes: RepoTreeNode[]): RepoTreeNode[] =>
    nodes
      .map((node) => ({
        ...node,
        children: sortNodes(node.children)
      }))
      .sort((left, right) => {
        if (left.type !== right.type) {
          return left.type === "directory" ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
      });

  return sortNodes(root);
}
