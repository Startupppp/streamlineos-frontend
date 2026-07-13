"use client";

import Link from "next/link";
import {
  Mail,
  Phone,
  Linkedin,
  Twitter,
  Globe,
  Tag,
  Calendar,
  Building2,
  Briefcase,
  Pencil,
} from "lucide-react";
import { MessagingPanel } from "@/features/crm/shared/messaging-panel";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Contact } from "@/types/crm";
import { AiAssistantPanel } from "@/features/crm/shared/ai-assistant-panel";
import { CrmOptionBadge } from "@/features/crm/shared/metadata";
import { useCrmOptions, resolveOption } from "@/hooks/api/crm/metadata";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface InfoRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  className?: string;
}

function InfoRow({ icon: Icon, label, value, className }: InfoRowProps) {
  return (
    <div className={cn("flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0", className)}>
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
        <span className="text-xs text-muted-foreground shrink-0">{label}</span>
        <span className="text-xs text-foreground text-right min-w-0 truncate">{value}</span>
      </div>
    </div>
  );
}

interface ContactInfoCardProps {
  contact: Contact;
  onEdit: () => void;
  onSendEmail: () => void;
  onLogCall: () => void;
  entityId: number;
}

export function ContactInfoCard({ contact, onEdit, onSendEmail, onLogCall, entityId }: ContactInfoCardProps) {
  const { data: sourceOptions = [] } = useCrmOptions("source");
  const hasLinks =
    contact.email ||
    contact.phone ||
    contact.linkedinUrl ||
    contact.twitterUrl ||
    contact.websiteUrl ||
    contact.source ||
    contact.tags.length > 0 ||
    contact.createdAt;

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <Card className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <CardHeader className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xl font-bold shrink-0">
              {getInitials(contact.name)}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-base font-semibold text-foreground truncate leading-tight">
                {contact.name}
              </h2>
              {(contact.title || contact.company) && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {[contact.title, contact.company].filter(Boolean).join(" · ")}
                </p>
              )}
              {contact.status && (
                <Badge
                  variant="secondary"
                  className="mt-1.5 text-[10px] px-1.5 py-0 h-4 capitalize"
                >
                  {contact.status.toLowerCase().replace(/_/g, " ")}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <Separator className="mx-5 w-auto" />

        <CardContent className="px-5 py-3">
          {!hasLinks && (
            <p className="text-xs text-muted-foreground py-2">No details recorded.</p>
          )}

          {contact.company && (
            <InfoRow icon={Building2} label="Company" value={contact.company} />
          )}
          {contact.title && (
            <InfoRow icon={Briefcase} label="Title" value={contact.title} />
          )}
          {contact.email && (
            <InfoRow
              icon={Mail}
              label="Email"
              value={
                <a
                  href={`mailto:${contact.email}`}
                  className="text-blue-600 hover:underline truncate block max-w-[160px]"
                >
                  {contact.email}
                </a>
              }
            />
          )}
          {contact.phone && (
            <InfoRow
              icon={Phone}
              label="Phone"
              value={
                <a
                  href={`tel:${contact.phone}`}
                  className="text-blue-600 hover:underline font-mono"
                >
                  {contact.phone}
                </a>
              }
            />
          )}
          {contact.linkedinUrl && (
            <InfoRow
              icon={Linkedin}
              label="LinkedIn"
              value={
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View profile
                </a>
              }
            />
          )}
          {contact.twitterUrl && (
            <InfoRow
              icon={Twitter}
              label="Twitter"
              value={
                <a
                  href={contact.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View profile
                </a>
              }
            />
          )}
          {contact.websiteUrl && (
            <InfoRow
              icon={Globe}
              label="Website"
              value={
                <a
                  href={contact.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline truncate block max-w-[160px]"
                >
                  {contact.websiteUrl}
                </a>
              }
            />
          )}
          {contact.source && (
            <InfoRow
              icon={Tag}
              label="Source"
              value={<CrmOptionBadge option={resolveOption(sourceOptions, contact.source)} size="card" />}
            />
          )}
          {contact.createdAt && (
            <InfoRow
              icon={Calendar}
              label="Created"
              value={new Date(contact.createdAt).toLocaleDateString()}
            />
          )}
          {contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {contact.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 border-blue-200 text-blue-700"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {contact.crmOrganization && (
            <div className="pt-3 mt-2 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground mb-1">Organization</p>
              <Link
                href={`/crm/companies/${contact.crmOrganization.id}`}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                {contact.crmOrganization.name}
              </Link>
            </div>
          )}
        </CardContent>

        <div className="px-5 pb-5 space-y-2">
          <div className="flex gap-2">
            <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={onSendEmail}
              >
                <Mail className="h-3 w-3 text-blue-500" />
                Send Email
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={onLogCall}
              >
                <Phone className="h-3 w-3 text-blue-500" />
                Log Call
              </Button>
            </motion.div>
          </div>
          <MessagingPanel
            phone={contact.phone}
            entityType="CONTACT"
            entityId={entityId}
          />
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
              onClick={onEdit}
            >
              <Pencil className="h-3 w-3" />
              Edit Contact
            </Button>
          </motion.div>
        </div>
      </Card>
    </motion.div>
    <AiAssistantPanel entityType="contact" entityId={contact.id} entityName={contact.name} />
    </>
  );
}
