"use client";

import { memo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, Briefcase, Calendar, Star, ExternalLink, Linkedin } from "lucide-react";
import type { CandidateStatus } from "@/types/hr";

const STATUSES: CandidateStatus[] = ["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];

const SOURCE_LABELS: Record<string, string> = {
  CAREERS_PAGE: "Careers Page",
  LINKEDIN: "LinkedIn",
  NAUKRI: "Naukri",
  INDEED: "Indeed",
  REFERRAL: "Referral",
  DIRECT: "Direct",
};

function statusStyles(s: string | null): string {
  switch (s) {
    case "HIRED":
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
    case "REJECTED":
      return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
    case "OFFER":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    case "INTERVIEW":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    case "SCREENING":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
    default:
      return "bg-muted text-foreground border-border";
  }
}

interface CandidateProfileCardProps {
  firstName: string;
  lastName: string;
  status: CandidateStatus | null;
  rating?: number | null;
  email: string;
  phone?: string | null;
  source?: string | null;
  experienceYears?: number | string | null;
  linkedinUrl?: string | null;
  currentRole?: string | null;
  currentCompany?: string | null;
  skills?: string[] | null;
  onStatusChange: (status: CandidateStatus) => void;
  isUpdating: boolean;
}

function initials(first: string, last: string): string {
  const a = first?.[0] ?? "";
  const b = last?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/20"
          }`}
        />
      ))}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-2.5 group">
      <div className="shrink-0 h-7 w-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </p>
        <p className="text-sm text-foreground truncate" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href} className="block hover:bg-muted/50 -mx-1 px-1 py-0.5 rounded-md transition-colors">
        {content}
      </a>
    );
  }
  return <div className="-mx-1 px-1 py-0.5">{content}</div>;
}

export const CandidateProfileCard = memo(function CandidateProfileCard({
  firstName,
  lastName,
  status,
  rating,
  email,
  phone,
  source,
  experienceYears,
  linkedinUrl,
  currentRole,
  currentCompany,
  skills,
  onStatusChange,
  isUpdating,
}: CandidateProfileCardProps) {
  const handleValueChange = useCallback(
    (v: string) => onStatusChange(v as CandidateStatus),
    [onStatusChange],
  );

  const sourceLabel = source ? (SOURCE_LABELS[source] ?? source) : null;
  const fullName = `${firstName} ${lastName}`.trim();
  const subtitle = currentRole
    ? `${currentRole}${currentCompany ? ` · ${currentCompany}` : ""}`
    : null;

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-5 pb-4 bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent border-b">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-primary/15 ring-offset-2 ring-offset-card">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {initials(firstName, lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-tight truncate" title={fullName}>
              {fullName}
            </h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate" title={subtitle}>
                {subtitle}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${statusStyles(status)}`}
              >
                {status ?? "NEW"}
              </span>
              {rating != null && rating > 0 && <StarRating rating={rating} />}
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        <div className="space-y-1">
          <InfoRow icon={Mail} label="Email" value={email} href={`mailto:${email}`} />
          {phone && <InfoRow icon={Phone} label="Phone" value={phone} href={`tel:${phone}`} />}
          {sourceLabel && <InfoRow icon={Briefcase} label="Source" value={sourceLabel} />}
          {experienceYears != null && (
            <InfoRow
              icon={Calendar}
              label="Experience"
              value={`${experienceYears} year${Number(experienceYears) === 1 ? "" : "s"}`}
            />
          )}
        </div>

        {linkedinUrl && (
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 rounded-lg border bg-[#0a66c2]/5 hover:bg-[#0a66c2]/10 border-[#0a66c2]/15 px-3 py-2 transition-colors group"
          >
            <span className="flex items-center gap-2 text-xs font-medium text-[#0a66c2]">
              <Linkedin className="h-3.5 w-3.5" />
              View LinkedIn profile
            </span>
            <ExternalLink className="h-3 w-3 text-[#0a66c2]/60 group-hover:text-[#0a66c2]" />
          </a>
        )}

        {skills && skills.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
              Skills
            </p>
            <div className="flex flex-wrap gap-1">
              {skills.map((skill) => (
                <Badge key={skill} variant="outline" className="text-[10px] font-normal">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
            Move to stage
          </label>
          <Select value={status ?? "NEW"} onValueChange={handleValueChange} disabled={isUpdating}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
});
