"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        email,
        password
      })
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error || "Unable to create account.");
      setIsSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/dashboard",
      redirect: false
    });

    setIsSubmitting(false);

    if (!result?.ok || result.error) {
      setError("Account created, but sign-in failed. Please log in manually.");
      return;
    }

    if (!result.url || result.url.includes("/api/auth/error")) {
      setError("Account created, but sign-in failed due to auth configuration. Please log in manually.");
      return;
    }

    window.location.href = result.url;
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-ink/70">Name</span>
        <input
          autoComplete="name"
          className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-base outline-none transition focus:border-tide focus:ring-4 focus:ring-tide/10"
          onChange={(event) => setName(event.target.value)}
          placeholder="Optional"
          type="text"
          value={name}
        />
      </label>

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
          autoComplete="new-password"
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
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>

      <p className="text-sm text-ink/65">
        Already have an account?{" "}
        <Link className="font-semibold text-tide hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
