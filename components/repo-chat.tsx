"use client";

import { useEffect, useMemo, useState } from "react";

import { RepoFileTree } from "@/components/repo-file-tree";
import type { ChatTurn, RepoChatResponse, RepoLoadResponse } from "@/lib/types";
import { normalizeGitHubRepoUrl } from "@/lib/utils";

const EXAMPLE_REPOS = [
  "https://github.com/vercel/next.js",
  "https://github.com/facebook/react",
  "https://github.com/t3-oss/create-t3-app"
];

export function RepoChat() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/vercel/next.js");
  const [question, setQuestion] = useState("");
  const [repo, setRepo] = useState<RepoLoadResponse["repo"] | null>(null);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [recentRepos, setRecentRepos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState("Paste a public GitHub repository URL to begin.");
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
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

  async function handleLoadRepository(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoadingRepo(true);
    setLoadState("Validating repository URL...");

    try {
      const normalizedRepoUrl = normalizeGitHubRepoUrl(repoUrl);
      setRepoUrl(normalizedRepoUrl);
      rememberRepo(normalizedRepoUrl);
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
      setLoadState("Repository ready for chat.");
      setQuestion("");
    } catch (caughtError) {
      setRepo(null);
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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <aside className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-glow backdrop-blur">
        <form className="space-y-5" onSubmit={handleLoadRepository}>
          <div>
            <h2 className="font-[var(--font-display)] text-2xl font-semibold text-ink">
              Tasks 1-2: Repo Chat + File Tree
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              Load a public GitHub repository, explore its structure like a lightweight editor
              sidebar, and chat over retrieved code context.
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink/70">GitHub repository URL</span>
            <input
              className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-base outline-none transition focus:border-tide focus:ring-4 focus:ring-tide/10"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
            />
          </label>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/50">Examples</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_REPOS.map((example) => (
                <button
                  key={example}
                  className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs text-ink/70 transition hover:border-tide hover:text-tide"
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

          <p className="text-sm text-ink/60">{loadState}</p>

          {recentRepos.length > 0 ? (
            <div className="rounded-2xl border border-ink/10 bg-white/60 p-4">
              <p className="text-sm font-semibold text-ink/70">Recent repositories</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {recentRepos.map((url) => (
                  <button
                    key={url}
                    className="rounded-full border border-ink/10 bg-mist px-3 py-1 text-xs text-ink/70 transition hover:border-tide hover:text-tide"
                    onClick={() => setRepoUrl(url)}
                    type="button"
                  >
                    {url.replace("https://github.com/", "")}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {repo ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-ink/10 bg-mist/70 p-5 text-sm leading-6 text-ink/75">
                <p className="font-semibold text-ink">
                  {repo.owner}/{repo.name}
                </p>
                <p className="mt-1">Branch: {repo.defaultBranch}</p>
                <p>{repo.fileCount} files discovered</p>
                <p>{repo.analyzedFiles.length} files sampled for RAG</p>
              </div>

              <RepoFileTree
                nodes={repo.fileTree}
                onSelectFile={(path) => setQuestion(`Explain the role of ${path} in this repository.`)}
              />
            </div>
          ) : null}
        </form>
      </aside>

      <section className="flex min-h-[680px] flex-col rounded-[2rem] border border-ink/10 bg-white/80 p-6 shadow-sm backdrop-blur">
        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {repo ? (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tide">Chat Ready</p>
                <h2 className="mt-1 font-[var(--font-display)] text-3xl font-semibold text-ink">
                  {repo.owner}/{repo.name}
                </h2>
                {repo.description ? (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">{repo.description}</p>
                ) : null}
              </div>
              <div className="rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm text-ink/70">
                <p>Sampled files: {repo.analyzedFiles.length}</p>
                <p>Dominant dirs: {repo.dominantDirectories.slice(0, 2).join(", ")}</p>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {suggestedQuestions.map((item) => (
                <button
                  key={item}
                  className="rounded-full border border-ink/10 bg-mist px-3 py-2 text-sm text-ink/70 transition hover:border-tide hover:text-tide"
                  onClick={() => setQuestion(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto rounded-3xl border border-ink/10 bg-mist/40 p-4">
              {messages.map((message, index) => (
                <article
                  key={`${message.role}-${index}`}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-3xl rounded-3xl bg-ink px-5 py-4 text-white"
                      : "max-w-4xl rounded-3xl border border-ink/10 bg-white px-5 py-4 text-ink"
                  }
                >
                  <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>

                  {message.role === "assistant" && message.sources && message.sources.length > 0 ? (
                    <div className="mt-4 space-y-3 border-t border-ink/10 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Sources</p>
                      {message.sources.map((source) => (
                        <div key={`${source.path}-${source.chunkId}`} className="rounded-2xl bg-mist px-4 py-3">
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

            <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={handleAskQuestion}>
              <textarea
                className="min-h-[88px] flex-1 rounded-3xl border border-ink/10 bg-mist px-4 py-3 text-base outline-none transition focus:border-tide focus:ring-4 focus:ring-tide/10"
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
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-ink/20 bg-white/50 p-10 text-center">
            <div className="max-w-xl">
              <h2 className="font-[var(--font-display)] text-3xl font-semibold text-ink">
                Load a repository to start chatting
              </h2>
              <p className="mt-3 text-base leading-7 text-ink/65">
                This first task keeps things simple: fetch a public repo, sample important files,
                retrieve the best matching snippets for each question, and answer from that context.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
