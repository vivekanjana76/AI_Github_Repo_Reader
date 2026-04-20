export type RepoFile = {
  path: string;
  size: number;
  sha: string;
  content: string;
};

export type RepoTreeBadge = "important" | "large" | "complex" | "sampled";

export type RepoTreeEntry = {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number | null;
  badges: RepoTreeBadge[];
};

export type RepoTreeNode = RepoTreeEntry & {
  children: RepoTreeNode[];
};

export type RepoContext = {
  repoUrl: string;
  owner: string;
  name: string;
  defaultBranch: string;
  description: string | null;
  fileCount: number;
  structure: string[];
  treeEntries: RepoTreeEntry[];
  selectedFiles: RepoFile[];
  dominantDirectories: string[];
};

export type RetrievedChunk = {
  chunkId: string;
  path: string;
  content: string;
  lineStart: number;
  lineEnd: number;
  score: number;
  matchedTerms: string[];
  reason: string;
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
  fileTree: RepoTreeNode[];
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
    lineStart: number;
    lineEnd: number;
    score: number;
    reason: string;
  }>;
};

export type RepoChatResponse = {
  answer: string;
  citations: string[];
  sources: Array<{
    chunkId: string;
    path: string;
    excerpt: string;
    lineStart: number;
    lineEnd: number;
    score: number;
    reason: string;
  }>;
};

export type AnalysisSeverity = "high" | "medium" | "low";

export type RepoAnalysisIssue = {
  title: string;
  severity: AnalysisSeverity;
  explanation: string;
  filePaths: string[];
};

export type RepoAnalysisSuggestion = {
  title: string;
  details: string;
};

export type RepoAnalysis = {
  summary: string;
  techStack: string[];
  issues: RepoAnalysisIssue[];
  suggestions: RepoAnalysisSuggestion[];
  codeQualityScore: number;
};

export type RepoAnalysisResponse = {
  analysis: RepoAnalysis;
};
