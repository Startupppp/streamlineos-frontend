import type { ReactNode } from "react";
import Link from "next/link";
import { statusToneClasses } from "@/lib/design-tokens";
import {
  DEFAULT_MONEY_DISPLAY,
  formatMoney,
  formatPercent,
  type MoneyDisplay,
} from "@/lib/format-utils";
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

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});
const DATETIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

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
  return Number.isNaN(parsed.getTime()) ? text : DATE_FORMATTER.format(parsed);
}

function formatMoneyField(value: unknown, display: MoneyDisplay): string {
  const text = asText(value);
  if (!text) return "";
  return Number.isFinite(Number(text)) ? formatMoney(text, display) : text;
}

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
    : DATETIME_FORMATTER.format(parsed);
}

function booleanOption(
  field: FieldSpec,
  value: unknown,
): SelectOption | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const truthy =
    value === true || value === "true" || value === 1 || value === "1";
  const options = field.options ?? DEFAULT_BOOLEAN_OPTIONS;
  return options.find((option) => option.value === String(truthy));
}

export function formatFieldText(
  field: FieldSpec,
  value: unknown,
  display: MoneyDisplay = DEFAULT_MONEY_DISPLAY,
): string {
  if (field.kind === "date") return formatDate(value);
  if (field.kind === "dateTime") return formatDateTime(value);
  if (field.kind === "money") return formatMoneyField(value, display);
  if (field.kind === "percent") return formatPercentField(value, display);

  if (field.kind === "boolean") return booleanOption(field, value)?.label ?? "";

  if (field.kind === "select" || field.kind === "badge") {
    const option = field.options?.find(
      (candidate) => candidate.value === asText(value),
    );
    return option?.label ?? asText(value);
  }

  return asText(value);
}

export function renderFieldValue(
  field: FieldSpec,
  value: unknown,
  display: MoneyDisplay = DEFAULT_MONEY_DISPLAY,

  record?: RecordValue,
): ReactNode {
  if (field.kind === "reference") {
    const id = asText(value);
    if (!id) return <span className="text-muted-foreground">—</span>;

    const label = field.referenceLabel
      ? asText(record?.[field.referenceLabel])
      : "";

    const domain = field.referenceToField
      ? asText(record?.[field.referenceToField]).toLowerCase() ||
        field.referenceTo
      : field.referenceTo;
    const href = referenceHref(domain, id);
    const shown = label || id;

    if (!href) return shown;

    return (
      <Link className="text-primary hover:underline" href={href}>
        {shown}
      </Link>
    );
  }

  const text = formatFieldText(field, value, display);
  if (!text) return <span className="text-muted-foreground">—</span>;

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
    const option = field.options?.find(
      (candidate) => candidate.value === asText(value),
    );
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

export function asRecordValue<T extends object>(row: T): RecordValue {
  return Object.fromEntries(Object.entries(row));
}

export function asRecordValues<T extends object>(
  rows: readonly T[],
): RecordValue[] {
  return rows.map(asRecordValue);
}
