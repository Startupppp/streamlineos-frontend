import type { ReactNode } from "react";
import { statusToneClasses } from "@/lib/design-tokens";
import { DEFAULT_MONEY_DISPLAY, formatMoney, type MoneyDisplay } from "@/lib/format-utils";
import { fieldByName, type FieldSpec, type RecordLayout } from "@/lib/renderer/layout";

export type RecordValue = Record<string, unknown>;

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return "";
  return String(value);
}

/** Dates render in the viewer's locale but sort on the raw value the API sent. */
function formatDate(value: unknown): string {
  const text = asText(value);
  if (!text) return "";
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime())
    ? text
    : parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Money renders in the organisation's own currency, never a hardcoded symbol.
 *
 * The display is threaded in rather than read from a hook here, because this is
 * a plain function called from cells and `useOrgDisplay` is a hook — the three
 * renderer components read it once and pass it down. Absent, it falls back to
 * the documented default, so a caller that has not wired it yet renders a
 * plausible number rather than a raw integer.
 *
 * An unparseable value is left as it arrived. A malformed amount rendered as a
 * confident "₹0.00" is worse than one that visibly looks wrong.
 */
function formatMoneyField(value: unknown, display: MoneyDisplay): string {
  const text = asText(value);
  if (!text) return "";
  return Number.isFinite(Number(text)) ? formatMoney(text, display) : text;
}

export function formatFieldText(
  field: FieldSpec,
  value: unknown,
  display: MoneyDisplay = DEFAULT_MONEY_DISPLAY,
): string {
  if (field.kind === "date") return formatDate(value);
  if (field.kind === "money") return formatMoneyField(value, display);

  if (field.kind === "select" || field.kind === "badge") {
    const option = field.options?.find((candidate) => candidate.value === asText(value));
    return option?.label ?? asText(value);
  }

  return asText(value);
}

/**
 * One place that decides how a value looks.
 *
 * A badge takes its colour from the status tokens, so both themes come from the
 * same class and no screen has to remember a `dark:` twin. An email or phone is
 * actionable rather than inert text, because on a record surface the reason you
 * are looking at it is usually to use it.
 */
export function renderFieldValue(
  field: FieldSpec,
  value: unknown,
  display: MoneyDisplay = DEFAULT_MONEY_DISPLAY,
): ReactNode {
  const text = formatFieldText(field, value, display);
  if (!text) return <span className="text-muted-foreground">—</span>;

  if (field.kind === "badge" || field.kind === "select") {
    const option = field.options?.find((candidate) => candidate.value === asText(value));
    if (!option?.tone) return text;
    const tone = statusToneClasses(option.tone);
    return (
      <span
        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-micro font-medium ${tone.surface} ${tone.inkStrong} ${tone.rule}`}
      >
        {option.label}
      </span>
    );
  }

  if (field.kind === "email")
    return (
      <a className="text-primary hover:underline" href={`mailto:${text}`}>
        {text}
      </a>
    );

  if (field.kind === "phone")
    return (
      <a className="text-primary hover:underline" href={`tel:${text}`}>
        {text}
      </a>
    );

  if (field.kind === "url")
    return (
      <a
        className="text-primary hover:underline"
        href={text.startsWith("http") ? text : `https://${text}`}
        target="_blank"
        rel="noreferrer noopener"
      >
        {text}
      </a>
    );

  return text;
}

export function resolveField(layout: RecordLayout, name: string): FieldSpec {
  return (
    fieldByName(layout, name) ?? {
      name,
      label: name,
      kind: "text",
    }
  );
}
