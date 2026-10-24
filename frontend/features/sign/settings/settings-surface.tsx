import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsSurface({
  title,
  description,
  action,
  footer,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center [&>*]:w-full sm:[&>*]:w-auto">
            {action}
          </div>
        ) : null}
      </div>
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", bodyClassName)}>
        {children}
      </div>
      {footer ? (
        <div className="flex shrink-0 justify-end border-t border-border px-4 py-3">
          {footer}
        </div>
      ) : null}
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
