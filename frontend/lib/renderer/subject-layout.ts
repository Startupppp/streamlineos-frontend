import type { FieldSpec, RecordLayout, SectionSpec } from "./layout";
import type { SubjectType } from "@/types/party/subjects";


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
          ...(index === 0 ? { primary: true } : {}),
        })),
        { field: "reference", width: "w-32 shrink-0" },
        { field: "createdAt", width: "w-32 shrink-0" },
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

export interface RenderableSubject {
  subjectId: string;
  reference: string | null;
  status: string | null;
  createdAt: string;
  customFields: Record<string, unknown> | null;
}

export function subjectRecord(subject: RenderableSubject): Record<string, unknown> {
  return {
    ...(subject.customFields ?? {}),
    subjectId: subject.subjectId,
    reference: subject.reference,
    status: subject.status,
    createdAt: subject.createdAt,
  };
}
