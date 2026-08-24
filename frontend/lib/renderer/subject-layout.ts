import type { FieldSpec, RecordLayout, SectionSpec } from "./layout";
import type { SubjectType } from "@/types/party/subjects";

/**
 * A tenant's subject type, as a record layout.
 *
 * This is the function ticket 07 exists to test. If one fixed schema can serve
 * any industry, then a declaration a tenant wrote at runtime has to produce the
 * same list, detail view and form that a layout written at compile time does —
 * through the same engine, with no branch anywhere asking "is this a subject?".
 *
 * It can, because the declaration and `FieldSpec` are the same shape on purpose.
 * The work here is not translation; it is supplying the three things a
 * declaration does not carry, because they are presentation rather than domain:
 * which fields become columns, how the detail and form group them, and the two
 * platform-owned fields every subject has regardless of type.
 */

/** Carried by every subject whatever its type, so they are appended, not declared. */
const PLATFORM_FIELDS: readonly FieldSpec[] = [
  {
    name: "reference",
    label: "Reference",
    kind: "text",
    hint: "Your own code for this record — a listing number, a requisition id.",
  },
  { name: "status", label: "Status", kind: "text" },
  { name: "createdAt", label: "Added", kind: "date", readOnly: true },
];

/**
 * How many declared fields reach the list before it stops being readable.
 *
 * A tenant may declare forty; a table showing forty columns is not a table. The
 * first few are the ones a person put first, which is the best signal available
 * until layouts are stored and can be arranged deliberately.
 */
const MAX_DECLARED_COLUMNS = 4;

const SECTION_SIZE = 6;

function detailSections(declared: readonly FieldSpec[], singular: string): SectionSpec[] {
  const sections: SectionSpec[] = [];

  for (let index = 0; index < declared.length; index += SECTION_SIZE) {
    const slice = declared.slice(index, index + SECTION_SIZE);
    sections.push({
      title: index === 0 ? singular : `${singular} (continued)`,
      fields: slice.map((field) => field.name),
    });
  }

  sections.push({ title: "Record", fields: ["reference", "status", "createdAt"] });
  return sections;
}

export function subjectLayout(type: SubjectType): RecordLayout {
  const declared: FieldSpec[] = type.fields.map((field) => ({
    name: field.name,
    label: field.label,
    kind: field.kind,
    ...(field.required === undefined ? {} : { required: field.required }),
    ...(field.options === undefined ? {} : { options: field.options }),
    ...(field.hint === undefined ? {} : { hint: field.hint }),
  }));

  const fields: FieldSpec[] = [...declared, ...PLATFORM_FIELDS];

  // The title column comes first whatever position it was declared in: a list
  // whose first column is not the record's name reads as a spreadsheet.
  const titleFirst = [
    ...declared.filter((field) => field.name === type.titleField),
    ...declared.filter((field) => field.name !== type.titleField),
  ].slice(0, MAX_DECLARED_COLUMNS);

  const formSections = detailSections(declared, type.singular).filter(
    (section) => section.title !== "Record",
  );

  return {
    key: `subject:${type.key}`,
    singular: type.singular,
    plural: type.plural,
    titleField: type.titleField,
    fields,
    list: {
      searchPlaceholder: `Search ${type.plural.toLowerCase()}…`,
      columns: [
        ...titleFirst.map((field, index) => ({
          field: field.name,
          ...(index === 0 ? { primary: true, sortable: true } : {}),
        })),
        { field: "reference", width: "w-32 shrink-0" },
        { field: "createdAt", sortable: true, width: "w-32 shrink-0" },
      ],
    },
    detail: { sections: detailSections(declared, type.singular) },
    form: {
      sections: [
        ...formSections,
        { title: "Record", fields: ["reference", "status"] },
      ],
    },
  };
}

/**
 * Flattens a subject into the row shape the renderer reads.
 *
 * The renderer addresses fields by name at the top level; a subject keeps its
 * declared values nested under `customFields`, because that is what makes the
 * schema fixed. This is the one place the two representations meet.
 */
export function subjectRecord(subject: {
  subjectId: string;
  reference: string | null;
  status: string | null;
  createdAt: string;
  customFields: Record<string, unknown> | null;
}): Record<string, unknown> {
  return {
    ...(subject.customFields ?? {}),
    subjectId: subject.subjectId,
    reference: subject.reference,
    status: subject.status,
    createdAt: subject.createdAt,
  };
}
