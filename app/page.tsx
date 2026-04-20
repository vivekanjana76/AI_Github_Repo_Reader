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
            Explore, analyze, and chat with a GitHub repository.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/75">
            The current build covers repo chat, file tree navigation, and structured code analysis
            so you can understand a project faster from one place.
          </p>
        </div>
        <RepoChat />
      </section>
    </main>
  );
}
