import type { ReactNode } from "react";
import Link from "next/link";
import { statusToneClasses } from "@/lib/design-tokens";
import { DEFAULT_MONEY_DISPLAY, formatMoney, formatPercent, type MoneyDisplay } from "@/lib/format-utils";
import {
  DEFAULT_BOOLEAN_OPTIONS,
  fieldByName,
  toneForSignedValue,
  type FieldSpec,
  type RecordLayout,
  type SelectOption,
} from "@/lib/renderer/layout";
import { referenceHref } from "@/lib/renderer/reference-route";

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

/**
 * A percentage as the API stores it: 12.4 means 12.4%.
 *
 * Not `Intl`'s `style: "percent"`, which divides by a hundred — every CRM
 * endpoint here sends the figure already scaled, and the two conventions
 * silently differ by two orders of magnitude. There is no minimum fraction
 * digit, so a round sixty reads "60%" rather than "60.0%"; a table of figures
 * padded with decimals nobody asked for is density spent on nothing.
 */
function formatPercentField(value: unknown, display: MoneyDisplay): string {
  const text = asText(value);
  if (!text) return "";
  const amount = Number(text);
  if (!Number.isFinite(amount)) return text;
  return formatPercent(amount, display.locale);
}

/** A moment, not a day — a task due at 4pm is not a task due on Tuesday. */
function formatDateTime(value: unknown): string {
  const text = asText(value);
  if (!text) return "";
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime())
    ? text
    : parsed.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

/**
 * A boolean as one of two options.
 *
 * `false` is a value, not an absence — an inactive pricebook is not a pricebook
 * with no state — so it renders its own label rather than the em dash the engine
 * shows for nothing. Only null and undefined are nothing.
 *
 * The description supplies the two labels through `options` if it wants domain
 * words ("Active"/"Inactive"), and gets "Yes"/"No" if it does not.
 */
function booleanOption(field: FieldSpec, value: unknown): SelectOption | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const truthy = value === true || value === "true" || value === 1 || value === "1";
  const options = field.options ?? DEFAULT_BOOLEAN_OPTIONS;
  return options.find((option) => option.value === String(truthy));
}

/**
 * A repeating group, read at a glance.
 *
 * A list cell has room for a fact about the rows, not the rows: the screen this
 * replaced printed "2 conditions" and it was the right amount. The count is
 * derived rather than stored, so it cannot drift from the rows the form edits —
 * the hand-written rule row read `rule.conditions.length` and the layout reads
 * the same array.
 *
 * Zero is said out loud rather than left as an em dash. A rule with no
 * conditions matches everything, which is a fact worth seeing in a table.
 */
function formatLines(field: FieldSpec, value: unknown): string {
  if (!Array.isArray(value)) return "";
  const noun = (field.lineLabel ?? field.label).toLowerCase();
  const plural = value.length === 1 ? noun : `${noun}s`;
  return `${value.length} ${plural}`;
}

export function formatFieldText(
  field: FieldSpec,
  value: unknown,
  display: MoneyDisplay = DEFAULT_MONEY_DISPLAY,
): string {
  if (field.kind === "lines") return formatLines(field, value);
  if (field.kind === "date") return formatDate(value);
  if (field.kind === "dateTime") return formatDateTime(value);
  if (field.kind === "money") return formatMoneyField(value, display);
  if (field.kind === "percent") return formatPercentField(value, display);

  if (field.kind === "boolean") return booleanOption(field, value)?.label ?? "";

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
  /**
   * The record the value came from, so a reference can find the sibling field
   * carrying its name. Optional, because every other kind renders from its own
   * value alone and a caller that has only a value should not have to invent a
   * record to pass.
   */
  record?: RecordValue,
): ReactNode {
  if (field.kind === "reference") {
    const id = asText(value);
    if (!id) return <span className="text-muted-foreground">—</span>;

    const label = field.referenceLabel ? asText(record?.[field.referenceLabel]) : "";

    /*
      The row's own domain wins over the field's, because a polymorphic pointer
      has no single one. Falls back to `referenceTo` when the row carries
      nothing — a lead list whose rows all point at leads should not need the
      column repeated on every record.
    */
    const domain = field.referenceToField
      ? asText(record?.[field.referenceToField]).toLowerCase() || field.referenceTo
      : field.referenceTo;
    const href = referenceHref(domain, id);
    const shown = label || id;

    /*
      No route for this domain means plain text, not a link to nowhere. A
      reference the product has no page for is still a fact about the record.
    */
    if (!href) return shown;

    return (
      <Link className="text-primary hover:underline" href={href}>
        {shown}
      </Link>
    );
  }

  const text = formatFieldText(field, value, display);
  if (!text) return <span className="text-muted-foreground">—</span>;

  /*
    A signed figure is toned from the same status tokens a badge uses, so ROI
    green and "active" green are the same green in both themes. The description
    said which direction is good news; nothing here knows what a campaign is.

    Weight rather than a second colour carries the emphasis, and the minus sign
    is still there — colour is never the only thing distinguishing the two cases.
  */
  const signTone = toneForSignedValue(field, value);
  if (signTone) {
    const tone = statusToneClasses(signTone);
    return <span className={`font-medium ${tone.inkStrong}`}>{text}</span>;
  }

  if (field.kind === "boolean") {
    const option = booleanOption(field, value);
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

/**
 * A typed record as the engine's row shape.
 *
 * An interface is not assignable to `Record<string, unknown>` — TypeScript gives
 * an implicit index signature to type aliases and withholds it from interfaces —
 * so every surface handing the engine its rows would otherwise carry a double
 * cast. Copying the own enumerable properties produces the index signature
 * honestly, in one place, instead of asserting it at forty call sites.
 */
export function asRecordValue<T extends object>(row: T): RecordValue {
  return Object.fromEntries(Object.entries(row));
}

export function asRecordValues<T extends object>(rows: readonly T[]): RecordValue[] {
  return rows.map(asRecordValue);
}
