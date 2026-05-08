import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { authOptions } from "@/lib/auth";

export default async function WorkspaceLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-ink/10 bg-white/80 px-5 py-4 backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tide">AI Engineer Agent</p>
          <p className="text-sm text-ink/60">{session.user.email}</p>
        </div>

        <nav className="flex items-center gap-2">
          <Link
            className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-tide hover:text-tide"
            href="/dashboard"
          >
            Dashboard
          </Link>
          <Link
            className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-tide hover:text-tide"
            href="/analysis"
          >
            Analysis
          </Link>
          <Link
            className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-tide hover:text-tide"
            href="/chat"
          >
            Chat
          </Link>
          <LogoutButton />
        </nav>
      </header>

      {children}
    </div>
  );
}
