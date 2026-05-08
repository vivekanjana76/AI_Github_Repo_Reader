"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      className="rounded-xl border border-ink/15 bg-white/85 px-4 py-2 text-sm font-semibold text-ink transition hover:border-tide hover:text-tide"
      onClick={() => signOut({ callbackUrl: "/login" })}
      type="button"
    >
      Sign out
    </button>
  );
}
