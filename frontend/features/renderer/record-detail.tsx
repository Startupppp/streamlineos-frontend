"use client";

import type { RecordLayout } from "@/lib/renderer/layout";
import { cn } from "@/lib/utils";
import { renderFieldValue, resolveField, type RecordValue } from "./format-value";

export interface RecordDetailProps {
  layout: RecordLayout;
  record: RecordValue;
  className?: string;
}

/**
 * A record, rendered from the same description that produced its list.
 *
 * Sections come from the description rather than the component, so a tenant that
 * cares about different things sees a different arrangement without a screen
 * being written for them.
 */
export function RecordDetail({ layout, record, className }: RecordDetailProps) {
  const title = renderFieldValue(
    resolveField(layout, layout.titleField),
    record[layout.titleField],
  );

  return (
    <div className={cn("flex min-w-0 flex-col gap-gap-section", className)}>
      <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>

      {layout.detail.sections.map((section) => {
        const fields = section.fields
          .map((name) => ({ name, field: resolveField(layout, name) }))
          .filter(({ name }) => record[name] !== undefined && record[name] !== null && record[name] !== "");

        if (fields.length === 0) return null;

        return (
          <section key={section.title} className="flex flex-col gap-gap-toolbar">
            <h2 className="text-label font-medium text-muted-foreground">{section.title}</h2>
            <dl className="grid grid-cols-1 gap-gap-toolbar rounded-xl border border-border bg-card p-card-pad sm:grid-cols-2">
              {fields.map(({ name, field }) => (
                <div key={name} className="flex min-w-0 flex-col gap-gap-inline">
                  <dt className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd
                    className={cn(
                      "min-w-0 text-sm",
                      field.kind === "longText" ? "whitespace-pre-wrap" : "truncate",
                    )}
                  >
                    {renderFieldValue(field, record[name])}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
