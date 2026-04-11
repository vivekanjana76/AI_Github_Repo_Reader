"use client";

import { useState } from "react";

import type { AnalysisResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type ApiResponse = {
  repo: {
    owner: string;
    name: string;
    defaultBranch: string;
    description: string | null;
    fileCount: number;
    analyzedFiles: string[];
  };
  analysis: AnalysisResult;
};

const severityStyles = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700"
} as const;

export function RepoAnalyzer() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/vercel/next.js");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  async function handleAnalyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ repoUrl })
      });

      const payload = (await response.json()) as ApiResponse | { error: string };

      if (!response.ok || !("analysis" in payload)) {
        const message = "error" in payload ? payload.error : "Analysis failed.";
        throw new Error(message);
      }

      setResult(payload);
    } catch (caughtError) {
      setResult(null);
      setError(caughtError instanceof Error ? caughtError.message : "Analysis failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <aside className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-glow backdrop-blur">
        <form className="space-y-5" onSubmit={handleAnalyze}>
          <div>
            <h2 className="font-[var(--font-display)] text-2xl font-semibold text-ink">
              Analyze a public repo
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              The agent fetches important files, summarizes the architecture, surfaces issues, and
              drafts high-confidence improvements.
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

          <button
            className="inline-flex w-full items-center justify-center rounded-2xl bg-ink px-5 py-3 text-base font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/50"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Analyzing repository..." : "Analyze Repo"}
          </button>

          <div className="rounded-2xl border border-tide/15 bg-tide/5 p-4 text-sm leading-6 text-ink/75">
            <p className="font-semibold text-tide">What happens under the hood</p>
            <p className="mt-1">
              We inspect the repo tree, prioritize high-signal files like `README`, `package.json`,
              `src/`, and `app/`, then ask the model for practical engineering feedback.
            </p>
          </div>
        </form>
      </aside>

      <section className="space-y-6">
        {error ? (
          <div className="rounded-[2rem] border border-red-200 bg-white/80 p-6 text-red-700 shadow-sm">
            <h3 className="font-[var(--font-display)] text-xl font-semibold">Analysis failed</h3>
            <p className="mt-2 text-base">{error}</p>
          </div>
        ) : null}

        {!result && !isLoading ? (
          <EmptyState />
        ) : null}

        {isLoading ? <LoadingState /> : null}

        {result ? (
          <>
            <div className="rounded-[2rem] border border-ink/10 bg-white/80 p-6 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tide">
                    Current analysis
                  </p>
                  <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold text-ink">
                    {result.repo.owner}/{result.repo.name}
                  </h2>
                  <p className="mt-2 max-w-3xl text-base leading-7 text-ink/70">
                    {result.analysis.summary.projectPurpose}
                  </p>
                </div>
                <div className="rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm text-ink/70">
                  <p>{result.repo.fileCount} files discovered</p>
                  <p>{result.repo.analyzedFiles.length} files analyzed</p>
                </div>
              </div>
            </div>

            <ResultCard title="Summary">
              <div className="grid gap-5 md:grid-cols-2">
                <InfoList title="Tech stack" items={result.analysis.summary.techStack} />
                <InfoList title="Key modules" items={result.analysis.summary.keyModules} />
                <InfoList title="Folder structure" items={result.analysis.summary.folderStructure} />
                <InfoList title="Analyzed files" items={result.repo.analyzedFiles} />
              </div>
            </ResultCard>

            <ResultCard title="Issues">
              {result.analysis.issues.length === 0 ? (
                <p className="text-ink/70">No major issues were surfaced in the sampled files.</p>
              ) : (
                <div className="space-y-4">
                  {result.analysis.issues.map((issue) => (
                    <article
                      key={`${issue.title}-${issue.severity}`}
                      className="rounded-3xl border border-ink/10 bg-mist/70 p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-ink">{issue.title}</h3>
                          <p className="mt-2 text-base leading-7 text-ink/75">{issue.explanation}</p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]",
                            severityStyles[issue.severity]
                          )}
                        >
                          {issue.severity}
                        </span>
                      </div>
                      {issue.filePaths.length > 0 ? (
                        <p className="mt-3 text-sm text-ink/60">Files: {issue.filePaths.join(", ")}</p>
                      ) : null}
                      <p className="mt-3 rounded-2xl border border-white/60 bg-white/70 p-4 text-sm leading-6 text-ink/75">
                        {issue.suggestedFix}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </ResultCard>

            <ResultCard title="Suggestions">
              {result.analysis.suggestions.length === 0 ? (
                <p className="text-ink/70">No extra suggestions were returned.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {result.analysis.suggestions.map((suggestion) => (
                    <article
                      key={suggestion.title}
                      className="rounded-3xl border border-ink/10 bg-gradient-to-br from-white to-mist p-5"
                    >
                      <h3 className="text-lg font-semibold text-ink">{suggestion.title}</h3>
                      <p className="mt-3 text-base leading-7 text-ink/75">{suggestion.details}</p>
                    </article>
                  ))}
                </div>
              )}
            </ResultCard>

            <ResultCard title="Improved snippets">
              {result.analysis.snippets.length === 0 ? (
                <p className="text-ink/70">The model did not propose concrete replacement snippets.</p>
              ) : (
                <div className="space-y-5">
                  {result.analysis.snippets.map((snippet) => (
                    <article key={snippet.title} className="rounded-3xl border border-ink/10 bg-mist/70 p-5">
                      <h3 className="text-xl font-semibold text-ink">{snippet.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-ink/65">{snippet.explanation}</p>
                      <pre className="mt-4 overflow-x-auto rounded-2xl bg-ink p-4 text-sm text-white">
                        <code>{snippet.code}</code>
                      </pre>
                    </article>
                  ))}
                </div>
              )}
            </ResultCard>

            {result.analysis.prDiff ? (
              <ResultCard title="PR-style diff">
                <h3 className="text-xl font-semibold text-ink">{result.analysis.prDiff.title}</h3>
                <p className="mt-2 text-base leading-7 text-ink/75">{result.analysis.prDiff.summary}</p>
                <pre className="mt-4 overflow-x-auto rounded-2xl bg-ink p-4 text-sm text-white">
                  <code>{result.analysis.prDiff.diff}</code>
                </pre>
              </ResultCard>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}

function ResultCard({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-ink/10 bg-white/80 p-6 shadow-sm backdrop-blur">
      <h2 className="font-[var(--font-display)] text-2xl font-semibold text-ink">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-ink/10 bg-mist/70 p-5">
      <h3 className="text-base font-semibold uppercase tracking-[0.18em] text-ink/60">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-ink/60">No details returned.</p>
      ) : (
        <ul className="mt-4 space-y-2 text-base leading-7 text-ink/75">
          {items.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[2rem] border border-dashed border-ink/20 bg-white/55 p-10 text-center backdrop-blur">
      <h2 className="font-[var(--font-display)] text-3xl font-semibold text-ink">
        Ready for the first repo
      </h2>
      <p className="mt-3 text-base leading-7 text-ink/65">
        Start with your own project or a public repository you want to review. The results panel
        will populate here once the analysis completes.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-[2rem] border border-ink/10 bg-white/80 p-8 shadow-sm backdrop-blur">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 rounded-full bg-tide/20" />
        <div className="h-10 w-3/4 rounded-2xl bg-ink/10" />
        <div className="h-28 rounded-3xl bg-ink/5" />
        <div className="h-28 rounded-3xl bg-ink/5" />
      </div>
    </div>
  );
}
