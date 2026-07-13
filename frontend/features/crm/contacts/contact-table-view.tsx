"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { CrmOptionBadge } from "@/features/crm/shared/metadata";
import { useCrmOptions, resolveOption } from "@/hooks/api/crm/metadata";
import { fadeUp } from "@/lib/motion-variants";
import { PAGE_SIZE } from "./contacts-constants";
import { ContactActionsMenu } from "./contact-actions-menu";
import type { Contact } from "@/types/crm";

interface ContactTableViewProps {
  items: Contact[];
  total: number;
  page: number;
  totalPages: number;
  apiSearch: string;
  isEnrichPending: boolean;
  selectedIds: Set<number>;
  onSelectionChange: (ids: Set<number>) => void;
  onRequestDelete: (id: number) => void;
  onEdit: (contact: Contact) => void;
  onEnrich: (contact: Contact) => void;
  onPageChange: (page: number) => void;
  onOpenCreate: () => void;
}

export function ContactTableView({
  items,
  total,
  page,
  apiSearch,
  isEnrichPending,
  selectedIds,
  onSelectionChange,
  onRequestDelete,
  onEdit,
  onEnrich,
  onPageChange,
  onOpenCreate,
}: ContactTableViewProps) {
  const { data: sourceOptions = [] } = useCrmOptions("source");
  const columns: DataTableColumn<Contact>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (c) => c.name,
      cell: (c) => (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
            {c.name[0]?.toUpperCase() ?? "?"}
          </div>
          <Link
            href={`/crm/contacts/${c.id}`}
            className="font-medium truncate max-w-[120px] hover:text-primary hover:underline transition-colors"
          >
            {c.name}
          </Link>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      cell: (c) =>
        c.email ? (
          <a
            href={`mailto:${c.email}`}
            className="text-primary hover:underline truncate block max-w-[140px]"
          >
            {c.email}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "phone",
      header: "Phone",
      cell: (c) =>
        c.phone ? (
          <a
            href={`tel:${c.phone}`}
            className="font-mono tabular-nums text-muted-foreground hover:text-foreground transition-colors"
          >
            {c.phone}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "company",
      header: "Company",
      cell: (c) => (
        <span className="text-muted-foreground truncate block max-w-[100px]">
          {c.company || "—"}
        </span>
      ),
    },
    {
      key: "source",
      header: "Source",
      cell: (c) =>
        c.source ? (
          <CrmOptionBadge option={resolveOption(sourceOptions, c.source)} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "created",
      header: "Created",
      cell: (c) => (
        <span className="font-mono tabular-nums text-muted-foreground whitespace-nowrap">
          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-8",
      cell: (c) => (
        <ContactActionsMenu
          contact={c}
          isEnrichPending={isEnrichPending}
          onDelete={onRequestDelete}
          onEdit={onEdit}
          onEnrich={onEnrich}
        />
      ),
    },
  ];

  const selectionSet: Set<string | number> = selectedIds;

  const handleSelectionChange = (sel: Set<string | number>) => {
    const next = new Set<number>();
    sel.forEach((v) => next.add(Number(v)));
    onSelectionChange(next);
  };

  return (
    <motion.div variants={fadeUp} className="flex flex-col flex-1 min-h-0">
      <DataTable
        data={items}
        columns={columns}
        getRowKey={(c) => c.id}
        selection={{ selected: selectionSet, onChange: handleSelectionChange }}
        pagination={{
          mode: "server",
          page,
          pageSize: PAGE_SIZE,
          total,
          onPageChange,
        }}
        emptyState={
          <EmptyState
            illustration={<EmptyPersonIllustration />}
            title="No contacts found"
            description={
              apiSearch
                ? "No contacts match your search."
                : "Create your first contact to get started."
            }
            action={
              apiSearch
                ? undefined
                : { label: "New Contact", onClick: onOpenCreate }
            }
            className="border-0 bg-transparent min-h-[40vh]"
          />
        }
        minWidth="580px"
        className="flex-1 min-h-0"
      />
    </motion.div>
  );
}
