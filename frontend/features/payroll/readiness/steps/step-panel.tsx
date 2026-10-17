import type { ReactNode } from "react";

interface StepPanelProps {
  title: string;
  children?: ReactNode;
  cta?: ReactNode;
}

export function StepPanel({ title, children, cta }: StepPanelProps) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
      {cta ? (
        <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-wrap items-center justify-end gap-2 rounded-b-xl border-t border-border bg-card px-4 py-3 lg:static">
          {cta}
        </div>
      ) : null}
    </section>
  );
}

interface StepNoteProps {
  children: ReactNode;
}

export function StepNote({ children }: StepNoteProps) {
  return <p className="text-dense leading-snug text-muted-foreground">{children}</p>;
}
