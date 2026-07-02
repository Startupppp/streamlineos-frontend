"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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
import { EmptyTeamIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { fadeUp } from "@/lib/motion-variants";
import { SOURCE_LABELS } from "./contacts-constants";
import { ContactActionsMenu } from "./contact-actions-menu";
import type { Contact } from "@/types/crm";

interface ContactCardViewProps {
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

export function ContactCardView({
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
}: ContactCardViewProps) {
  return (
    <>
      <motion.div
        variants={fadeUp}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        {items.map((contact) => (
          <Card
            key={contact.id}
            className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all hover:border-blue-500/40 group"
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-semibold text-violet-700 shrink-0">
                  {contact.name[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors">
                    {contact.name}
                  </p>
                  {contact.title && (
                    <p className="text-xs text-muted-foreground truncate">
                      {contact.title}
                    </p>
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
                    <span className="truncate">{contact.company}</span>
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
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1.5 py-0 h-4"
                  >
                    {SOURCE_LABELS[contact.source] ?? contact.source}
                  </Badge>
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
                        className="text-[10px] text-blue-600 border-blue-200 hover:border-blue-400 gap-1 cursor-pointer"
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
                        className="text-[10px] text-amber-700 border-amber-200 hover:border-amber-400 gap-1 cursor-pointer"
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
          illustration={<EmptyTeamIllustration className="w-36 h-36" />}
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
              size="sm"
              disabled={page <= 1}
              onClick={onPrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={onNextPage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </>
  );
}
