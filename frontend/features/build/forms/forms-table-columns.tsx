"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { ProjectForm } from "@/types/projects/forms";
import { FORM_TYPE_LABELS } from "./field-type-meta";

export const FORMS_TABLE_HEADERS = [
  "Form ID",
  "Name",
  "Type",
  "Status",
  "Fields",
  "",
  "Actions",
] as const;

interface FormRowHandlers {
  projectId: number;
}

export function FormStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? "default" : "secondary"} className="text-micro px-1.5">
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}

export function buildFormsColumns({
  projectId,
}: FormRowHandlers): DataTableColumn<ProjectForm>[] {
  return [
    {
      key: "formNumber",
      header: "Form ID",
      cell: (row) => (
        <Link
          href={`/build/${projectId}/forms/${row.id}`}
          className="font-mono tabular-nums text-dense font-semibold text-primary hover:underline"
        >
          FORM-{row.formNumber}
        </Link>
      ),
      className: "w-24",
    },
    {
      key: "name",
      header: "Name",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <Link
          href={`/build/${projectId}/forms/${row.id}`}
          className="block min-w-0 text-sm font-medium hover:underline"
        >
          <TruncatedText text={row.name} />
        </Link>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline" className="text-micro px-1.5">
          {FORM_TYPE_LABELS[row.type]}
        </Badge>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => <FormStatusBadge isActive={row.isActive} />,
    },
    {
      key: "fields",
      header: "Fields",
      cell: (row) => (
        <span className="font-mono tabular-nums text-sm text-muted-foreground">
          {row.fields.length}
        </span>
      ),
      className: "w-16",
    },
    {
      key: "isPublic",
      header: "",
      className: "w-20",
      cell: (row) =>
        row.isPublic ? (
          <Badge variant="outline" className="text-micro px-1.5 text-primary border-primary/30">
            Public
          </Badge>
        ) : null,
    },
  ];
}

export function FormMobileCard({ form }: { form: ProjectForm }) {
  return (
    <BuildMobileCard
      eyebrow={`FORM-${form.formNumber}`}
      title={form.name}
      status={<FormStatusBadge isActive={form.isActive} />}
      meta={[
        {
          label: "Type",
          value: (
            <Badge variant="outline" className="text-micro px-1.5">
              {FORM_TYPE_LABELS[form.type]}
            </Badge>
          ),
        },
        { label: "Fields", value: form.fields.length },
      ]}
    />
  );
}
