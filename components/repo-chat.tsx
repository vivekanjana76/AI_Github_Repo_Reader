"use client";

import { useEffect, useMemo, useState } from "react";

import { DashboardSection } from "@/components/dashboard-section";
import { RepoFileTree } from "@/components/repo-file-tree";
import type {
  ChatTurn,
  RepoAnalysis,
  RepoAnalysisResponse,
  RepoChatResponse,
  RepoLoadResponse
} from "@/lib/types";
import { cn, normalizeGitHubRepoUrl } from "@/lib/utils";

const EXAMPLE_REPOS = [
  "https://github.com/vercel/next.js",
  "https://github.com/facebook/react",
  "https://github.com/t3-oss/create-t3-app"
];

const severityStyles = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700"
} as const;

export function RepoChat() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/vercel/next.js");
  const [question, setQuestion] = useState("");
  const [repo, setRepo] = useState<RepoLoadResponse["repo"] | null>(null);
  const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [recentRepos, setRecentRepos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState("Paste a public GitHub repository URL to begin.");
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [isAnalyzingRepo, setIsAnalyzingRepo] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  useEffect(() => {
    const savedRepos = window.localStorage.getItem("recent-repos");

    if (!savedRepos) {
      return;
    }

    try {
      setRecentRepos(JSON.parse(savedRepos) as string[]);
    } catch {
      window.localStorage.removeItem("recent-repos");
    }
  }, []);

  function rememberRepo(nextUrl: string) {
    const updated = [nextUrl, ...recentRepos.filter((url) => url !== nextUrl)].slice(0, 5);
    setRecentRepos(updated);
    window.localStorage.setItem("recent-repos", JSON.stringify(updated));
  }

  async function fetchAnalysis(nextRepoUrl: string) {
    setIsAnalyzingRepo(true);

    try {
      const response = await fetch("/api/repo/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ repoUrl: nextRepoUrl })
      });

      const payload = (await response.json()) as RepoAnalysisResponse | { error: string };

      if (!response.ok || !("analysis" in payload)) {
        throw new Error("error" in payload ? payload.error : "Unable to analyze repository.");
      }

      setAnalysis(payload.analysis);
    } catch (caughtError) {
      setAnalysis(null);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to analyze repository.");
    } finally {
      setIsAnalyzingRepo(false);
    }
  }

  async function handleLoadRepository(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoadingRepo(true);
    setLoadState("Validating repository URL...");

    try {
      const normalizedRepoUrl = normalizeGitHubRepoUrl(repoUrl);
      setRepoUrl(normalizedRepoUrl);
      rememberRepo(normalizedRepoUrl);
      setAnalysis(null);
      setLoadState("Fetching repository files from GitHub...");

      const response = await fetch("/api/repo/load", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ repoUrl: normalizedRepoUrl })
      });

      const payload = (await response.json()) as RepoLoadResponse | { error: string };

      if (!response.ok || !("repo" in payload)) {
        throw new Error("error" in payload ? payload.error : "Unable to load repository.");
      }

      setRepo(payload.repo);
      setMessages([
        {
          role: "assistant",
          content:
            "Repository loaded. Ask about architecture, specific files, setup, data flow, or anything else in the sampled codebase."
        }
      ]);
      setLoadState("Repository ready for dashboard.");
      setQuestion("");
      void fetchAnalysis(normalizedRepoUrl);
    } catch (caughtError) {
      setRepo(null);
      setAnalysis(null);
      setMessages([]);
      setLoadState("Repository load stopped.");
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load repository.");
    } finally {
      setIsLoadingRepo(false);
    }
  }

  async function handleAskQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!repo || !question.trim() || isSendingMessage) {
      return;
    }

    const nextQuestion = question.trim();
    const nextMessages = [...messages, { role: "user" as const, content: nextQuestion }];

    setError(null);
    setQuestion("");
    setMessages(nextMessages);
    setIsSendingMessage(true);

    try {
      const response = await fetch("/api/repo/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repoUrl: repo.repoUrl,
          question: nextQuestion,
          history: nextMessages.slice(-6)
        })
      });

      const payload = (await response.json()) as RepoChatResponse | { error: string };

      if (!response.ok || !("answer" in payload)) {
        throw new Error("error" in payload ? payload.error : "Unable to answer that question.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: payload.answer,
          citations: payload.citations,
          sources: payload.sources
        }
      ]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to answer that question.");
      setMessages(messages);
      setQuestion(nextQuestion);
    } finally {
      setIsSendingMessage(false);
    }
  }

  const suggestedQuestions = useMemo(
    () => [
      "What does this repository do?",
      "Which files should I read first?",
      "How is the app structured?",
      "Where is the main business logic?"
    ],
    []
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-glow backdrop-blur lg:sticky lg:top-6 lg:self-start">
        <form className="space-y-5" onSubmit={handleLoadRepository}>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tide">Controls</p>
            <h2 className="mt-1 font-[var(--font-display)] text-2xl font-semibold text-ink">
              Repo Loader
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              Load a public repository and populate the dashboard with overview, analysis, and chat.
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink/70">GitHub repository URL</span>
            <input
              className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-base outline-none transition focus:border-tide focus:ring-4 focus:ring-tide/10"
              onChange={(event) => setRepoUrl(event.target.value)}
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
            />
          </label>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/50">Examples</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_REPOS.map((example) => (
                <button
                  className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs text-ink/70 transition hover:border-tide hover:text-tide"
                  key={example}
                  onClick={() => setRepoUrl(example)}
                  type="button"
                >
                  {example.replace("https://github.com/", "")}
                </button>
              ))}
            </div>
          </div>

          <button
            className="inline-flex w-full items-center justify-center rounded-2xl bg-ink px-5 py-3 text-base font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/50"
            disabled={isLoadingRepo}
            type="submit"
          >
            {isLoadingRepo ? "Loading repository..." : "Load Repository"}
          </button>

          <div className="rounded-2xl border border-ink/10 bg-mist/60 p-4 text-sm leading-6 text-ink/65">
            <p className="font-semibold text-ink">Status</p>
            <p className="mt-1">{loadState}</p>
          </div>

          {recentRepos.length > 0 ? (
            <div className="rounded-2xl border border-ink/10 bg-white/60 p-4">
              <p className="text-sm font-semibold text-ink/70">Recent repositories</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {recentRepos.map((url) => (
                  <button
                    className="rounded-full border border-ink/10 bg-mist px-3 py-1 text-xs text-ink/70 transition hover:border-tide hover:text-tide"
                    key={url}
                    onClick={() => setRepoUrl(url)}
                    type="button"
                  >
                    {url.replace("https://github.com/", "")}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </form>
      </aside>

      <section className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {repo ? (
          <>
            <DashboardSection
              action={
                <button
                  className="rounded-2xl border border-ink/10 bg-mist px-4 py-2 text-sm font-semibold text-ink/75 transition hover:border-tide hover:text-tide disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isAnalyzingRepo}
                  onClick={() => void fetchAnalysis(repo.repoUrl)}
                  type="button"
                >
                  {isAnalyzingRepo ? "Analyzing..." : "Refresh Analysis"}
                </button>
              }
              description="Repository identity, sampled context, file structure, and the current quality snapshot."
              eyebrow="Overview"
              title="Repo Overview"
            >
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
                <div className="rounded-3xl border border-ink/10 bg-mist/50 p-5">
                  <h3 className="font-[var(--font-display)] text-2xl font-semibold text-ink">
                    {repo.owner}/{repo.name}
                  </h3>
                  {repo.description ? (
                    <p className="mt-3 text-sm leading-7 text-ink/70">{repo.description}</p>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-ink/55">No repository description was provided.</p>
                  )}

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Branch" value={repo.defaultBranch} />
                    <StatCard label="Files Found" value={String(repo.fileCount)} />
                    <StatCard label="Files Sampled" value={String(repo.analyzedFiles.length)} />
                    <StatCard label="Dominant Dirs" value={String(repo.dominantDirectories.length)} />
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <InfoCard
                      items={repo.dominantDirectories}
                      title="Dominant Directories"
                    />
                    <InfoCard
                      items={analysis?.techStack ?? []}
                      title="Tech Stack"
                    />
                  </div>

                  <div className="mt-5 rounded-3xl border border-ink/10 bg-white/75 p-5">
                    <p className="text-sm font-semibold text-ink">Analysis Summary</p>
                    <p className="mt-2 text-sm leading-7 text-ink/70">
                      {analysis?.summary ??
                        (isAnalyzingRepo
                          ? "Generating a structured summary for this repository..."
                          : "Load or refresh analysis to see the repository summary.")}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-ink/10 bg-gradient-to-b from-white to-mist p-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/50">Code Quality</p>
                  <p className="mt-4 font-[var(--font-display)] text-6xl font-bold text-ink">
                    {analysis ? analysis.codeQualityScore : isAnalyzingRepo ? "..." : "-"}
                  </p>
                  <p className="mt-2 text-sm text-ink/55">out of 10</p>
                  <p className="mt-5 text-sm leading-6 text-ink/60">
                    {analysis
                      ? `${analysis.issues.length} issue${analysis.issues.length === 1 ? "" : "s"} and ${analysis.suggestions.length} suggestion${analysis.suggestions.length === 1 ? "" : "s"} surfaced.`
                      : "The score appears after analysis completes."}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <RepoFileTree
                  nodes={repo.fileTree}
                  onSelectFile={(path) => setQuestion(`Explain the role of ${path} in this repository.`)}
                />
              </div>
            </DashboardSection>

            <div className="grid gap-6 xl:grid-cols-2">
              <DashboardSection
                description="Potential quality risks, grounded in the sampled repository files."
                eyebrow="Issues"
                title="Issues"
              >
                {isAnalyzingRepo && !analysis ? (
                  <LoadingBlock />
                ) : analysis && analysis.issues.length > 0 ? (
                  <div className="space-y-3">
                    {analysis.issues.map((issue) => (
                      <article className="rounded-2xl border border-ink/10 bg-mist/45 p-4" key={issue.title}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-ink">{issue.title}</p>
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                              severityStyles[issue.severity]
                            )}
                          >
                            {issue.severity}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-ink/70">{issue.explanation}</p>
                        {issue.filePaths.length > 0 ? (
                          <p className="mt-2 text-xs text-ink/50">Files: {issue.filePaths.join(", ")}</p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyPanelMessage message="No major issues were detected in the sampled files." />
                )}
              </DashboardSection>

              <DashboardSection
                description="Practical next steps to improve maintainability, clarity, or reliability."
                eyebrow="Suggestions"
                title="Suggestions"
              >
                {isAnalyzingRepo && !analysis ? (
                  <LoadingBlock />
                ) : analysis && analysis.suggestions.length > 0 ? (
                  <div className="space-y-3">
                    {analysis.suggestions.map((suggestion) => (
                      <article className="rounded-2xl border border-ink/10 bg-mist/45 p-4" key={suggestion.title}>
                        <p className="text-sm font-semibold text-ink">{suggestion.title}</p>
                        <p className="mt-2 text-sm leading-6 text-ink/70">{suggestion.details}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyPanelMessage message="No suggestions have been generated yet." />
                )}
              </DashboardSection>
            </div>

            <DashboardSection
              description="Ask questions about architecture, setup, file roles, or implementation details."
              eyebrow="Chat"
              title="Repo Chat"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Suggested questions</p>
                  <p className="text-xs text-ink/55">Use these as shortcuts or write your own.</p>
                </div>
                <div className="rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm text-ink/70">
                  <p>{messages.length} messages in this session</p>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {suggestedQuestions.map((item) => (
                  <button
                    className="rounded-full border border-ink/10 bg-mist px-3 py-2 text-sm text-ink/70 transition hover:border-tide hover:text-tide"
                    key={item}
                    onClick={() => setQuestion(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="space-y-4 rounded-3xl border border-ink/10 bg-mist/40 p-4">
                <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
                  {messages.map((message, index) => (
                    <article
                      className={
                        message.role === "user"
                          ? "ml-auto max-w-3xl rounded-3xl bg-ink px-5 py-4 text-white"
                          : "max-w-4xl rounded-3xl border border-ink/10 bg-white px-5 py-4 text-ink"
                      }
                      key={`${message.role}-${index}`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>

                      {message.role === "assistant" && message.sources && message.sources.length > 0 ? (
                        <div className="mt-4 space-y-3 border-t border-ink/10 pt-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Sources</p>
                          {message.sources.map((source) => (
                            <div className="rounded-2xl bg-mist px-4 py-3" key={`${source.path}-${source.chunkId}`}>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-tide">
                                  {source.path}:{source.lineStart}-{source.lineEnd}
                                </p>
                                <p className="text-xs uppercase tracking-[0.14em] text-ink/45">
                                  score {source.score}
                                </p>
                              </div>
                              <p className="mt-2 text-xs leading-5 text-ink/55">{source.reason}</p>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/70">
                                {source.excerpt}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}

                  {isSendingMessage ? (
                    <div className="max-w-xl rounded-3xl border border-ink/10 bg-white px-5 py-4 text-sm text-ink/60">
                      Searching the repository and drafting an answer...
                    </div>
                  ) : null}
                </div>

                <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleAskQuestion}>
                  <textarea
                    className="min-h-[96px] flex-1 rounded-3xl border border-ink/10 bg-white px-4 py-3 text-base outline-none transition focus:border-tide focus:ring-4 focus:ring-tide/10"
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask about architecture, setup, files, data flow, or code behavior..."
                    value={question}
                  />
                  <button
                    className="rounded-3xl bg-tide px-6 py-3 text-base font-semibold text-white transition hover:bg-tide/90 disabled:cursor-not-allowed disabled:bg-tide/40 sm:self-end"
                    disabled={isSendingMessage || !question.trim()}
                    type="submit"
                  >
                    {isSendingMessage ? "Asking..." : "Ask"}
                  </button>
                </form>
              </div>
            </DashboardSection>
          </>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <PlaceholderCard
              description="Repository metadata, score, file tree, and detected stack appear here after load."
              title="Repo Overview"
            />
            <PlaceholderCard
              description="Risk-focused findings from the analysis engine will populate this section."
              title="Issues"
            />
            <PlaceholderCard
              description="Actionable engineering next steps land here once analysis completes."
              title="Suggestions"
            />
            <PlaceholderCard
              description="Chat with retrieved repository context here after the repo is loaded."
              title="Chat"
            />
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white/70 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white/70 p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {items.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              className="rounded-full border border-ink/10 bg-mist px-3 py-1 text-xs font-semibold text-ink/70"
              key={item}
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink/55">No data available yet.</p>
      )}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-6 w-2/3 rounded-xl bg-ink/10" />
      <div className="h-24 rounded-3xl bg-ink/5" />
      <div className="h-24 rounded-3xl bg-ink/5" />
    </div>
  );
}

function EmptyPanelMessage({ message }: { message: string }) {
  return <p className="rounded-2xl border border-ink/10 bg-mist/40 px-4 py-5 text-sm text-ink/60">{message}</p>;
}

function PlaceholderCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-ink/20 bg-white/55 p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tide">{title}</p>
      <p className="mt-3 text-sm leading-7 text-ink/65">{description}</p>
    </div>
  );
}
