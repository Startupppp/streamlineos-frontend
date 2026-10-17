"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TRUST_BADGE_CLASS: Record<string, string> = {
  verified:
    "bg-status-success-surface text-status-success-ink-strong border-status-success-rule",
  verification_expired:
    "bg-status-warning-surface text-status-warning-ink-strong border-status-warning-rule",
  unverified: "bg-muted text-muted-foreground border-border",
};

const TRUST_BADGE_LABEL: Record<string, string> = {
  verified: "Verified",
  verification_expired: "Stale",
  unverified: "Unverified",
};

export const KB_ACCESS_LABELS: Record<string, string> = {
  view: "Can view",
  comment: "Can comment",
  edit: "Can edit",
  manage: "Can manage",
};

interface TrustBadgeProps {
  trustState: string;
}

export function TrustBadge({ trustState }: TrustBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-micro h-4 px-1.5 shrink-0",
        TRUST_BADGE_CLASS[trustState] ?? TRUST_BADGE_CLASS.unverified,
      )}
    >
      {TRUST_BADGE_LABEL[trustState] ?? trustState}
    </Badge>
  );
}

interface OwnerMissingBadgeProps {
  ownerMembershipId: number | null;
}

export function OwnerMissingBadge({ ownerMembershipId }: OwnerMissingBadgeProps) {
  if (ownerMembershipId !== null) return null;
  return (
    <Badge
      variant="outline"
      className="text-micro h-4 px-1.5 shrink-0 text-muted-foreground"
    >
      Owner missing
    </Badge>
  );
}

interface StatusBadgeProps {
  status: string;
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  in_review:
    "bg-status-warning-surface text-status-warning-ink-strong border-status-warning-rule",
  published:
    "bg-status-success-surface text-status-success-ink-strong border-status-success-rule",
  archived: "bg-muted text-muted-foreground border-border",
};

const STATUS_BADGE_LABEL: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  published: "Published",
  archived: "Archived",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-micro h-4 px-1.5 shrink-0",
        STATUS_BADGE_CLASS[status] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {STATUS_BADGE_LABEL[status] ?? status}
    </Badge>
  );
}
