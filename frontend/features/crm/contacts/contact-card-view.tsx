"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Link2,
  Linkedin,
  Mail,
  Phone,
  Twitter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { fadeUp } from "@/lib/motion-variants";
import { CrmOptionBadge } from "@/features/crm/shared/metadata";
import { useCrmOptions, resolveOption } from "@/hooks/api/crm/metadata";
import { ContactActionsMenu } from "./contact-actions-menu";
import type { Contact } from "@/types/crm";

interface ContactCardViewProps {
  items: Contact[];
  total: number;
  page: number;
  totalPages: number;
  apiSearch: string;
  isEnrichPending: boolean;
  onRequestDelete: (id: number) => void;
  onEdit: (contact: Contact) => void;
  onEnrich: (contact: Contact) => void;
  onPageChange: (page: number) => void;
  onOpenCreate: () => void;
}

export function ContactCardView({
  items,
  total,
  page,
  totalPages,
  apiSearch,
  isEnrichPending,
  onRequestDelete,
  onEdit,
  onEnrich,
  onPageChange,
  onOpenCreate,
}: ContactCardViewProps) {
  const { data: sourceOptions = [] } = useCrmOptions("source");
  const firstItem = total > 0 ? (page - 1) * 20 + 1 : 0;
  const lastItem = Math.min(page * 20, total);

  function handlePrev() {
    onPageChange(page - 1);
  }

  function handleNext() {
    onPageChange(page + 1);
  }

  return (
    <>
      <motion.div
        variants={fadeUp}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        {items.map((contact) => (
          <Card
            key={contact.id}
            className="bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow group"
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                  {contact.name[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <TruncatedText text={contact.name} className="text-sm font-medium group-hover:text-primary transition-colors" />
                  {contact.title && (
                    <TruncatedText text={contact.title} className="text-xs text-muted-foreground" />
                  )}
                </div>
                <ContactActionsMenu
                  contact={contact}
                  isEnrichPending={isEnrichPending}
                  onDelete={onRequestDelete}
                  onEdit={onEdit}
                  onEnrich={onEnrich}
                  triggerClassName="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
              <div className="mt-3 space-y-1.5">
                {contact.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="truncate hover:text-foreground transition-colors"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" />
                    <a
                      href={`tel:${contact.phone}`}
                      className="hover:text-foreground transition-colors"
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.company && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <TruncatedText text={contact.company} />
                  </div>
                )}
              </div>
              {(contact.linkedinUrl ||
                contact.twitterUrl ||
                contact.websiteUrl) && (
                <div className="mt-3 flex items-center gap-2">
                  {contact.linkedinUrl && (
                    <a
                      href={contact.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="LinkedIn profile"
                      className="text-muted-foreground hover:text-blue-500 transition-colors"
                    >
                      <Linkedin className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {contact.twitterUrl && (
                    <a
                      href={contact.twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Twitter profile"
                      className="text-muted-foreground hover:text-sky-500 transition-colors"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {contact.websiteUrl && (
                    <a
                      href={contact.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Website"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Globe className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {contact.source && (
                  <CrmOptionBadge option={resolveOption(sourceOptions, contact.source)} />
                )}
                {contact.tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 h-4"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              {(contact.lead || contact.deal) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {contact.lead && (
                    <Link href={`/crm/leads/${contact.lead.id}`}>
                      <Badge
                        variant="secondary"
                        className="text-[10px] text-primary border-primary/30 hover:border-primary/60 gap-1 cursor-pointer"
                      >
                        <Link2 className="h-2.5 w-2.5" />
                        Lead: {contact.lead.name}
                      </Badge>
                    </Link>
                  )}
                  {contact.deal && (
                    <Link href={`/crm/deals/${contact.deal.id}`}>
                      <Badge
                        variant="secondary"
                        className="text-[10px] text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 hover:border-amber-400 gap-1 cursor-pointer"
                      >
                        <Link2 className="h-2.5 w-2.5" />
                        Deal: {contact.deal.name}
                      </Badge>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {items.length === 0 && (
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
          className="min-h-[50vh]"
        />
      )}

      {totalPages > 1 && (
        <motion.div
          variants={fadeUp}
          className="flex items-center justify-between"
        >
          <span className="text-xs text-muted-foreground">
            Showing {firstItem}–{lastItem} of {total} contacts
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="w-7"
              disabled={page <= 1}
              onClick={handlePrev}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="w-7"
              disabled={page >= totalPages}
              onClick={handleNext}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      )}
    </>
  );
}
