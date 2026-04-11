import { RepoChat } from "@/components/repo-chat";

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-hero-grid bg-[size:42px_42px] opacity-40" />
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-12 sm:px-10 lg:px-12">
        <div className="mb-12 max-w-3xl">
          <p className="mb-4 inline-flex rounded-full border border-ink/10 bg-white/70 px-3 py-1 text-sm font-semibold uppercase tracking-[0.22em] text-tide shadow-sm backdrop-blur">
            AI Engineer Agent
          </p>
          <h1 className="font-[var(--font-display)] text-4xl font-bold tracking-tight text-ink sm:text-6xl">
            Chat with a GitHub repository using simple RAG.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/75">
            Task 1 is intentionally narrow: load a public repo, retrieve the most relevant code
            snippets for each question, and answer from those snippets with file citations.
          </p>
        </div>
        <RepoChat />
      </section>
    </main>
  );
}
