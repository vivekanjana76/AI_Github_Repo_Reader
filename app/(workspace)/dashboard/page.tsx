import { RepoChat } from "@/components/repo-chat";

export default function DashboardPage() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-hero-grid bg-[size:42px_42px] opacity-40" />
      <section className="flex flex-col">
        <div className="mb-8 max-w-3xl">
          <p className="mb-4 inline-flex rounded-full border border-ink/10 bg-white/70 px-3 py-1 text-sm font-semibold uppercase tracking-[0.22em] text-tide shadow-sm backdrop-blur">
            Dashboard
          </p>
          <h1 className="font-[var(--font-display)] text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Explore, analyze, and chat with a GitHub repository.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/75">
            Load a repository once and use structured analysis with retrieval-grounded chat in one
            workspace.
          </p>
        </div>
        <RepoChat />
      </section>
    </main>
  );
}
