import type { ReactNode } from "react";

export function PanelHeading({ title, subtitle, aside, level = 2, id }: { title: string; subtitle?: string; aside?: ReactNode; level?: 2 | 3; id?: string }) {
  const Tag = level === 2 ? "h2" : "h3";
  return <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div><Tag id={id} className="text-lg font-bold tracking-tight">{title}</Tag>{subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}</div>
    {aside}
  </div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="grid min-h-44 place-content-center rounded-xl border border-dashed border-line bg-surface-subtle px-5 text-center text-sm text-muted">{children}</div>;
}
