"use client";

import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, User, Calendar } from "lucide-react";
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
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-center gap-2 min-h-[36px]">
      <span className="text-xs text-muted-foreground font-medium truncate">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function TicketSidebarMetadata({
  timeSpent: timeSpentStr,
  originalEstimate: originalEstimateStr,
  createdAt,
  updatedAt,
  reporter,
}: TicketSidebarMetadataProps) {
  const timeSpent = timeSpentStr ? parseFloat(timeSpentStr) : 0;
  const originalEstimate = originalEstimateStr ? parseFloat(originalEstimateStr) : 0;
  const timeProgress =
    originalEstimate > 0 ? Math.min((timeSpent / originalEstimate) * 100, 100) : 0;

  return (
    <>
      {(timeSpent > 0 || originalEstimate > 0) && (
        <div>
          <PropertyRow label="Time">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
              <span>{timeSpent}h logged</span>
              {originalEstimate > 0 && (
                <span className="text-muted-foreground">
                  / {originalEstimate}h est
                </span>
              )}
            </div>
            {originalEstimate > 0 && (
              <Progress value={timeProgress} className="h-1 mt-1" />
            )}
          </PropertyRow>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 @[18rem]:grid-cols-2 @[18rem]:gap-3">
        <div className="flex items-center gap-1.5 text-dense text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>
            Created{" "}
            {createdAt ? format(new Date(createdAt), "MMM d, yyyy") : "—"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-dense text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          <span>
            Updated{" "}
            {updatedAt ? format(new Date(updatedAt), "MMM d, yyyy") : "—"}
          </span>
        </div>
      </div>

      {reporter && (
        <div className="flex items-center gap-2">
          <span className="text-micro text-muted-foreground font-medium uppercase tracking-wide shrink-0">
            <User className="h-3 w-3 inline mr-0.5" />
            Reporter
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarImage src={resolveImageUrl(reporter.image)} />
              <AvatarFallback className="text-micro bg-primary/10 text-primary">
                {getUserInitials(reporter)}
              </AvatarFallback>
            </Avatar>
            <TruncatedText
              text={getUserDisplayName(reporter)}
              className="min-w-0 flex-1 text-xs"
            />
          </div>
        </div>
      )}
    </>
  );
}
