"use client";

import { moneyDisplayFor, type RecordLayout } from "@/lib/renderer/layout";
import { DEFAULT_MONEY_DISPLAY, type MoneyDisplay } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import { renderFieldValue, resolveField, type RecordValue } from "./format-value";

export interface RecordDetailProps {
  layout: RecordLayout;
  record: RecordValue;
  className?: string;
  /** The tenant's currency, for `money` fields. See `RecordListProps.money`. */
  money?: MoneyDisplay;
  /**
   * Whether to head the sections with the record's name.
   *
   * True in a sheet, where nothing else names the record. False on a page whose
   * wrapper already carries the name as its heading — printing it twice would
   * put two `h1`s on one document and say the same thing to a screen reader
   * twice.
   */
  showTitle?: boolean;
}

/**
 * A record, rendered from the same description that produced its list.
 *
 * Sections come from the description rather than the component, so a tenant that
 * cares about different things sees a different arrangement without a screen
 * being written for them.
 */
export function RecordDetail({
  layout,
  record,
  className,
  money = DEFAULT_MONEY_DISPLAY,
  showTitle = true,
}: RecordDetailProps) {
  const titleField = resolveField(layout, layout.titleField);
  const title = renderFieldValue(
    titleField,
    record[layout.titleField],
    moneyDisplayFor(titleField, record, money),
  );

  return (
    <div className={cn("flex min-w-0 flex-col gap-gap-section", className)}>
      {showTitle ? (
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
      ) : null}

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
                    {renderFieldValue(field, record[name], moneyDisplayFor(field, record, money))}
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
