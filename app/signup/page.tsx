import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/signup-form";
import { authOptions } from "@/lib/auth";

export default async function SignupPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-10">
      <section className="w-full rounded-3xl border border-ink/10 bg-white/85 p-6 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tide">Get Started</p>
        <h1 className="mt-2 font-[var(--font-display)] text-3xl font-semibold text-ink">Create account</h1>
        <p className="mt-2 text-sm text-ink/60">Set up your secure workspace before loading repositories.</p>
        <div className="mt-6">
          <SignupForm />
        </div>
      </section>
    </main>
  );
}
