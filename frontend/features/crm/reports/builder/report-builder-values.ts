import type {
  ReportingFilterLeaf,
  ReportingProjection,
  ReportingQueryDescription,
  ReportingScalarValue,
} from "@/types/crm/reporting";
import {
  EMPTY_FILTER_ROW,
  NO_AGGREGATE,
  type ReportBuilderValues,
  type ReportFilterRow,
  type ReportProjectionRow,
} from "./report-builder-schema";
import { findFieldOption, type ReportFieldOption } from "./report-source-fields";

/**
 * A stored description, read back into the form that produced it.
 *
 * The inverse of `buildQueryDescription`, and it is a *partial* inverse on
 * purpose. The builder emits one flat `and` of comparisons; the description
 * language is a six-deep tree with `or` and `not`, and a definition saved by
 * another client — or by a later, richer builder — may use it. Such a
 * description is returned as `unrepresentable` rather than approximated,
 * because the alternative is a form that silently shows fewer conditions than
 * the report actually applies and then saves that narrower report over the
 * real one.
 *
 * A field the current caller's source catalogue does not offer is a softer
 * failure and is reported separately: the row loads with an empty type, the
 * schema asks for a field, and `unknownFields` says which names could not be
 * resolved so the screen can explain why rather than looking broken.
 */

export type LoadedReportValues =
  | {
      readonly kind: "loaded";
      readonly values: ReportBuilderValues;
      /** Names in the saved report that this caller's source list does not contain. */
      readonly unknownFields: readonly string[];
    }
  | { readonly kind: "unrepresentable"; readonly reason: string };

function scalarToText(value: ReportingScalarValue): string {
  return typeof value === "string" ? value : String(value);
}

function toProjectionRow(
  projection: ReportingProjection,
  options: readonly ReportFieldOption[],
  unknown: string[],
): ReportProjectionRow {
  const field = projection.kind === "field" ? projection.field : (projection.field ?? "");
  const type = field === "" ? "" : (findFieldOption(options, field)?.type ?? "");
  if (field !== "" && type === "") unknown.push(field);

  return {
    aggregate: projection.kind === "field" ? NO_AGGREGATE : projection.aggregate,
    field,
    fieldType: type,
  };
}

function toFilterRow(
  leaf: ReportingFilterLeaf,
  options: readonly ReportFieldOption[],
  unknown: string[],
): ReportFilterRow {
  const type = findFieldOption(options, leaf.field)?.type ?? "";
  if (type === "") unknown.push(leaf.field);

  const row: ReportFilterRow = {
    ...EMPTY_FILTER_ROW,
    field: leaf.field,
    fieldType: type,
    operator: leaf.operator,
  };

  if ("value" in leaf) return { ...row, value: scalarToText(leaf.value) };
  if ("values" in leaf) return { ...row, values: leaf.values.map(scalarToText).join("\n") };
  if ("from" in leaf)
    return { ...row, from: scalarToText(leaf.from), to: scalarToText(leaf.to) };
  return row;
}

/**
 * The filter tree, flattened to the one shape the builder can show.
 *
 * `null` means "this builder cannot represent it", which is the caller's cue to
 * refuse rather than to load something narrower.
 */
function flattenFilter(
  description: ReportingQueryDescription,
): readonly ReportingFilterLeaf[] | null {
  const filter = description.filter;
  if (filter === undefined) return [];
  if (filter.kind === "compare") return [filter];
  if (filter.kind !== "and") return null;
  const leaves = filter.nodes.filter(
    (node): node is ReportingFilterLeaf => node.kind === "compare",
  );
  if (leaves.length !== filter.nodes.length) return null;
  return leaves;
}

export function toBuilderValues(
  description: ReportingQueryDescription,
  options: readonly ReportFieldOption[],
): LoadedReportValues {
  const leaves = flattenFilter(description);
  if (leaves === null)
    return {
      kind: "unrepresentable",
      reason:
        "This report combines its conditions in a way the builder cannot show. It can still be run as it is saved.",
    };

  const unknownFields: string[] = [];
  const values: ReportBuilderValues = {
    source: description.source,
    select: description.select.map((projection) =>
      toProjectionRow(projection, options, unknownFields),
    ),
    groupBy: [...(description.groupBy ?? [])],
    filters: leaves.map((leaf) => toFilterRow(leaf, options, unknownFields)),
    orderBy: (description.orderBy ?? []).map((sort) => ({
      select: sort.select,
      direction: sort.direction,
    })),
    limit: description.limit,
    offset: description.offset ?? 0,
  };

  return { kind: "loaded", values, unknownFields: [...new Set(unknownFields)] };
}
