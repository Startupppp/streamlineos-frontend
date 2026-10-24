import type { ReactNode } from "react";

export function SettingsSurface({
  title,
  description,
  action,
  footer,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
      {footer ? <div className="flex justify-end border-t border-border px-4 py-3">{footer}</div> : null}
    </section>
  );
}

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-border first:border-t-0">
      <h3 className="px-4 pt-3 text-sm font-medium text-foreground">{title}</h3>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

export const SETTINGS_NUMBER_ROW =
  "grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7.5rem] sm:items-center sm:gap-8";

export const SETTINGS_TEXT_ROW = "grid gap-2 px-4 py-3";
