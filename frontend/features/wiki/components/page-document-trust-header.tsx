"use client";

import { cn } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { getUserDisplayName } from "@/lib/person-display";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { kbTimeAgo, kbFormatDate } from "@/features/wiki/lib/kb-date-utils";

interface PageDocumentTrustHeaderProps {
  status: "draft" | "in_review" | "published" | "archived";
  trustState: "unverified" | "verified" | "verification_expired";
  visibility: "private" | "org" | "public";
  nextReviewAt: string | null;
  updatedAt: string;
  lastEditedById: string | null;
}

const STATUS_LABELS: Record<PageDocumentTrustHeaderProps["status"], string> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
  archived: "Archived",
};

const STATUS_TONES: Record<
  PageDocumentTrustHeaderProps["status"],
  "neutral" | "info" | "success" | "warning"
> = {
  draft: "neutral",
  in_review: "info",
  published: "success",
  archived: "neutral",
};

const TRUST_LABELS: Record<PageDocumentTrustHeaderProps["trustState"], string> = {
  unverified: "Unverified",
  verified: "Verified",
  verification_expired: "Expired",
};

const TRUST_TONES: Record<
  PageDocumentTrustHeaderProps["trustState"],
  "neutral" | "success" | "warning"
> = {
  unverified: "neutral",
  verified: "success",
  verification_expired: "warning",
};

const VISIBILITY_LABELS: Record<PageDocumentTrustHeaderProps["visibility"], string> = {
  private: "Private",
  org: "Team",
  public: "Public",
};

const VISIBILITY_TONES: Record<
  PageDocumentTrustHeaderProps["visibility"],
  "neutral" | "info" | "success"
> = {
  private: "neutral",
  org: "info",
  public: "success",
};

interface ToneBadgeProps {
  label: string;
  tone: "neutral" | "info" | "success" | "warning";
}

function ToneBadge({ label, tone }: ToneBadgeProps) {
  const { surface, ink } = statusToneClasses(tone);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        surface,
        ink,
      )}
    >
      {label}
    </span>
  );
}

export function PageDocumentTrustHeader({
  status,
  trustState,
  visibility,
  nextReviewAt,
  updatedAt,
  lastEditedById,
}: PageDocumentTrustHeaderProps) {
  const { data: membersPage } = useOrgMembersByIds(
    lastEditedById ? [lastEditedById] : [],
  );
  const editorMember = lastEditedById
    ? membersPage?.data.find((m) => m.userId === lastEditedById)
    : undefined;
  const editorName = editorMember
    ? getUserDisplayName({ name: editorMember.name, email: editorMember.email })
    : null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2 text-xs text-muted-foreground">
      <ToneBadge label={STATUS_LABELS[status]} tone={STATUS_TONES[status]} />
      <ToneBadge label={TRUST_LABELS[trustState]} tone={TRUST_TONES[trustState]} />
      <ToneBadge label={VISIBILITY_LABELS[visibility]} tone={VISIBILITY_TONES[visibility]} />
      {nextReviewAt && (
        <span>
          Review due{" "}
          <span className="font-medium text-foreground">{kbFormatDate(nextReviewAt)}</span>
        </span>
      )}
      <span>
        Updated{" "}
        <span className="font-medium text-foreground">{kbTimeAgo(updatedAt)}</span>
        {editorName && (
          <>
            {" "}by{" "}
            <span className="font-medium text-foreground">{editorName}</span>
          </>
        )}
      </span>
    </div>
  );
}
