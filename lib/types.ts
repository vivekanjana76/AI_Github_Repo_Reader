export type Severity = "high" | "medium" | "low";

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

export type AnalysisIssue = {
  title: string;
  severity: Severity;
  explanation: string;
  filePaths: string[];
  suggestedFix: string;
};

export type AnalysisSuggestion = {
  title: string;
  details: string;
};

export type AnalysisSnippet = {
  title: string;
  language: string;
  code: string;
  explanation: string;
};

export type AnalysisSummary = {
  projectPurpose: string;
  techStack: string[];
  folderStructure: string[];
  keyModules: string[];
};

export type AnalysisPRDiff = {
  title: string;
  summary: string;
  diff: string;
};

export type AnalysisResult = {
  summary: AnalysisSummary;
  issues: AnalysisIssue[];
  suggestions: AnalysisSuggestion[];
  snippets: AnalysisSnippet[];
  prDiff: AnalysisPRDiff | null;
};

export type RepoResponsePayload = {
  repo: {
    owner: string;
    name: string;
    defaultBranch: string;
    description: string | null;
    fileCount: number;
    analyzedFiles: string[];
    dominantDirectories: string[];
  };
  analysis: AnalysisResult;
};
