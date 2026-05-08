"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false
    });

    setIsSubmitting(false);

    if (!result?.ok || result.error) {
      setError(result?.error === "CredentialsSignin" ? "Invalid email or password." : "Unable to sign in.");
      return;
    }

    if (!result.url || result.url.includes("/api/auth/error")) {
      setError("Sign-in failed due to server auth configuration. Please check NEXTAUTH_SECRET.");
      return;
    }

    window.location.href = result.url;
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-ink/70">Email</span>
        <input
          autoComplete="email"
          className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-base outline-none transition focus:border-tide focus:ring-4 focus:ring-tide/10"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-ink/70">Password</span>
        <input
          autoComplete="current-password"
          className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-base outline-none transition focus:border-tide focus:ring-4 focus:ring-tide/10"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>

      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <button
        className="inline-flex w-full items-center justify-center rounded-2xl bg-ink px-5 py-3 text-base font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/50"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-sm text-ink/65">
        No account yet?{" "}
        <Link className="font-semibold text-tide hover:underline" href="/signup">
          Create one
        </Link>
      </p>
    </form>
  );
}
