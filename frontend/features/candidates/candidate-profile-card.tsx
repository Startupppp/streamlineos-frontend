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
import { Mail, Phone, Briefcase, Calendar, Star, ExternalLink } from "lucide-react";
import type { CandidateStatus } from "@/types/hr";
import { TruncatedText } from "@/components/ui/truncated-text";

const STATUSES: CandidateStatus[] = ["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];

function statusColor(s: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (s === "HIRED") return "default";
  if (s === "REJECTED") return "destructive";
  if (s === "OFFER" || s === "INTERVIEW") return "secondary";
  return "outline";
}

interface CandidateProfileCardProps {
  status: CandidateStatus | null;
  rating?: number | null;
  email: string;
  phone?: string | null;
  source?: string | null;
  experienceYears?: number | string | null;
  linkedinUrl?: string | null;
  skills?: string[] | null;
  onStatusChange: (status: CandidateStatus) => void;
  isUpdating: boolean;
}

function SkillBadge({ skill }: { skill: string }) {
  return (
    <Badge key={skill} variant="outline" className="text-micro">
      {skill}
    </Badge>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/20"}`}
        />
      ))}
    </div>
  );
}

function StatusItem({ status }: { status: CandidateStatus }) {
  return <SelectItem value={status}>{status}</SelectItem>;
}

export const CandidateProfileCard = memo(function CandidateProfileCard({
  status,
  rating,
  email,
  phone,
  source,
  experienceYears,
  linkedinUrl,
  skills,
  onStatusChange,
  isUpdating,
}: CandidateProfileCardProps) {
  const handleValueChange = useCallback(
    (v: string) => onStatusChange(v as CandidateStatus),
    [onStatusChange]
  );

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant={statusColor(status)}>{status}</Badge>
          {rating != null && <StarRating rating={rating} />}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <TruncatedText text={email ?? ""} />
          </div>
          {phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{phone}</span>
            </div>
          )}
          {source && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5 shrink-0" />
              <span>Source: {source}</span>
            </div>
          )}
          {experienceYears != null && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{experienceYears} years exp.</span>
            </div>
          )}
        </div>

        {linkedinUrl && (
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />LinkedIn
          </a>
        )}

        {skills && skills.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {skills.map((skill) => (
              <SkillBadge key={skill} skill={skill} />
            ))}
          </div>
        )}

        <div className="pt-2 border-t">
          <label className="text-xs font-medium mb-1 block">Move to stage</label>
          <Select
            value={status ?? "NEW"}
            onValueChange={handleValueChange}
            disabled={isUpdating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              {STATUSES.map((s) => (
                <StatusItem key={s} status={s} />
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
});
