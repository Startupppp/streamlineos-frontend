"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { fadeUp } from "@/lib/motion-variants";
import { SOURCE_LABELS } from "./contacts-constants";
import { ContactActionsMenu } from "./contact-actions-menu";
import type { Contact } from "@/types/crm";

interface ContactTableViewProps {
  items: Contact[];
  total: number;
  page: number;
  totalPages: number;
  firstItem: number;
  lastItem: number;
  apiSearch: string;
  isEnrichPending: boolean;
  onRequestDelete: (id: number) => void;
  onEdit: (contact: Contact) => void;
  onEnrich: (contact: Contact) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onOpenCreate: () => void;
}

export function ContactTableView({
  items,
  total,
  page,
  totalPages,
  firstItem,
  lastItem,
  apiSearch,
  isEnrichPending,
  onRequestDelete,
  onEdit,
  onEnrich,
  onPrevPage,
  onNextPage,
  onOpenCreate,
}: ContactTableViewProps) {
  return (
    <motion.div variants={fadeUp}>
      <div className="rounded-lg border border-border overflow-hidden flex flex-col h-[calc(100dvh-16rem)] min-h-[320px]">
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="min-w-max">
            <table className="w-full caption-bottom text-[11px]">
              <TableHeader className="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm">
                <TableRow className="border-b-2 border-border">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                    Email
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                    Phone
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                    Company
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                    Source
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                    Created
                  </TableHead>
                  <TableHead className="text-[10px] w-8 px-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <EmptyState
                        illustration={
                          <EmptyTeamIllustration className="w-28 h-28" />
                        }
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
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="h-8 hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="px-2 py-1">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-semibold text-violet-700 shrink-0">
                            {contact.name[0]?.toUpperCase() ?? "?"}
                          </div>
                          <Link
                            href={`/crm/contacts/${contact.id}`}
                            className="text-[12px] font-medium truncate max-w-[120px] hover:text-blue-600 hover:underline transition-colors"
                          >
                            {contact.name}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-1 truncate max-w-[140px]">
                        {contact.email ? (
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-[11px] text-blue-600 hover:underline truncate"
                          >
                            {contact.email}
                          </a>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        {contact.phone ? (
                          <a
                            href={`tel:${contact.phone}`}
                            className="text-[11px] text-muted-foreground font-mono hover:text-foreground transition-colors"
                          >
                            {contact.phone}
                          </a>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground px-2 py-1 truncate max-w-[100px]">
                        {contact.company || "—"}
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        {contact.source ? (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 h-4"
                          >
                            {SOURCE_LABELS[contact.source] ?? contact.source}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground px-2 py-1 whitespace-nowrap">
                        {contact.createdAt
                          ? new Date(contact.createdAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <ContactActionsMenu
                          contact={contact}
                          isEnrichPending={isEnrichPending}
                          onDelete={onRequestDelete}
                          onEdit={onEdit}
                          onEnrich={onEnrich}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </table>
          </div>
        </div>
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t">
          {total > 0 ? (
            <span className="text-xs text-muted-foreground">
              Showing {firstItem}–{lastItem} of {total} contacts
            </span>
          ) : (
            <span />
          )}
          {totalPages > 1 && (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={onPrevPage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={onNextPage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
