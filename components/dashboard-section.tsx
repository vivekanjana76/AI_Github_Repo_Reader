"use client";

import type { ReactNode } from "react";

export function DashboardSection({
  eyebrow,
  title,
  description,
  action,
  children
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-ink/10 bg-white/82 p-6 shadow-sm backdrop-blur">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tide">{eyebrow}</p>
          <h2 className="mt-1 font-[var(--font-display)] text-3xl font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>

      {children}
    </section>
  );
}

