export type RepoFile = {
  path: string;
  size: number;
  sha: string;
  content: string;
};

export type RepoContext = {
  repoUrl: string;
  owner: string;
  name: string;
  defaultBranch: string;
  description: string | null;
  fileCount: number;
  structure: string[];
  selectedFiles: RepoFile[];
  dominantDirectories: string[];
};

export type RetrievedChunk = {
  chunkId: string;
  path: string;
  content: string;
  score: number;
};

export type RepoSummary = {
  repoUrl: string;
  owner: string;
  name: string;
  defaultBranch: string;
  description: string | null;
  fileCount: number;
  analyzedFiles: string[];
  dominantDirectories: string[];
};

export type RepoLoadResponse = {
  repo: RepoSummary;
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  sources?: Array<{
    chunkId: string;
    path: string;
    excerpt: string;
  }>;
};

export type RepoChatResponse = {
  answer: string;
  citations: string[];
  sources: Array<{
    chunkId: string;
    path: string;
    excerpt: string;
  }>;
};
