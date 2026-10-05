"use client";

import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/lib/person-display";
import { TruncatedText } from "@/components/ui/truncated-text";

interface ReporterShape {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  email?: string | null;
}

interface TicketSidebarMetadataProps {
  timeSpent: string | null | undefined;
  originalEstimate: string | null | undefined;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  reporter?: ReporterShape | null;
  rank?: string | null;
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-9 items-center gap-3 py-1">
      <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0 flex-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

export function TicketSidebarMetadata({
  timeSpent: timeSpentStr,
  originalEstimate: originalEstimateStr,
  createdAt,
  updatedAt,
  reporter,
  rank,
}: TicketSidebarMetadataProps) {
  const timeSpent = timeSpentStr ? parseFloat(timeSpentStr) : 0;
  const originalEstimate = originalEstimateStr ? parseFloat(originalEstimateStr) : 0;
  const timeProgress =
    originalEstimate > 0 ? Math.min((timeSpent / originalEstimate) * 100, 100) : 0;

  return (
    <div className="flex flex-col gap-1">
      <h3 className="mb-2 text-xs font-semibold text-muted-foreground">History</h3>
      {(timeSpent > 0 || originalEstimate > 0) && (
          <PropertyRow label="Time">
            <div className="flex items-center gap-2 tabular-nums">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>{timeSpent}h logged</span>
              {originalEstimate > 0 && (
                <span className="text-muted-foreground">
                  / {originalEstimate}h est
                </span>
              )}
            </div>
            {originalEstimate > 0 && (
              <Progress value={timeProgress} className="mt-2 h-1" />
            )}
          </PropertyRow>
      )}

      <PropertyRow label="Created">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>{createdAt ? format(new Date(createdAt), "MMM d, yyyy") : "—"}</span>
        </div>
      </PropertyRow>
      <PropertyRow label="Updated">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>{updatedAt ? format(new Date(updatedAt), "MMM d, yyyy") : "—"}</span>
        </div>
      </PropertyRow>

      {reporter ? (
        <PropertyRow label="Reporter">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarImage src={resolveImageUrl(reporter.image)} />
              <AvatarFallback className="bg-primary/10 text-micro text-primary">
                {getUserInitials(reporter)}
              </AvatarFallback>
            </Avatar>
            <TruncatedText
              text={getUserDisplayName(reporter)}
              className="min-w-0 flex-1 text-sm"
            />
          </div>
        </PropertyRow>
      ) : null}

      {rank ? (
        <PropertyRow label="Rank">
          <span className="font-mono text-sm tabular-nums text-muted-foreground">{rank}</span>
        </PropertyRow>
      ) : null}
    </div>
  );
}
