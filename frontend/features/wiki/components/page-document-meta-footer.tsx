"use client";

import { cn } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { getUserDisplayName } from "@/lib/person-display";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { kbTimeAgo, kbFormatDate } from "@/features/wiki/lib/kb-date-utils";
import type { OrgMember } from "@/hooks/api/organization";

interface PageDocumentMetaFooterProps {
  status: "draft" | "in_review" | "published" | "archived";
  trustState: "unverified" | "verified" | "verification_expired";
  visibility: "private" | "org" | "public";
  nextReviewAt: string | null;
  updatedAt: string;
  lastEditedById: string | null;
  ownerUserId?: string | null;
}

const STATUS_LABELS: Record<PageDocumentMetaFooterProps["status"], string> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
  archived: "Archived",
};

const STATUS_TONES: Record<
  PageDocumentMetaFooterProps["status"],
  "neutral" | "info" | "success" | "warning"
> = {
  draft: "neutral",
  in_review: "info",
  published: "success",
  archived: "neutral",
};

const TRUST_LABELS: Record<PageDocumentMetaFooterProps["trustState"], string> = {
  unverified: "Unverified",
  verified: "Verified",
  verification_expired: "Expired",
};

const TRUST_TONES: Record<
  PageDocumentMetaFooterProps["trustState"],
  "neutral" | "success" | "warning"
> = {
  unverified: "neutral",
  verified: "success",
  verification_expired: "warning",
};

const VISIBILITY_LABELS: Record<PageDocumentMetaFooterProps["visibility"], string> = {
  private: "Private",
  org: "Team",
  public: "Public",
};

const VISIBILITY_TONES: Record<
  PageDocumentMetaFooterProps["visibility"],
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

function findMember(members: OrgMember[] | undefined, userId: string | null | undefined): OrgMember | undefined {
  if (!userId || !members) return undefined;
  return members.find((m) => m.userId === userId);
}

export function PageDocumentMetaFooter({
  status,
  trustState,
  visibility,
  nextReviewAt,
  updatedAt,
  lastEditedById,
  ownerUserId,
}: PageDocumentMetaFooterProps) {
  const memberIds = [lastEditedById, ownerUserId]
    .filter((id): id is string => id !== null && id !== undefined);

  const { data: membersPage } = useOrgMembersByIds(memberIds);
  const members = membersPage?.data;

  const editor = findMember(members, lastEditedById);
  const owner = findMember(members, ownerUserId);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
      <ToneBadge label={STATUS_LABELS[status]} tone={STATUS_TONES[status]} />
      <ToneBadge label={TRUST_LABELS[trustState]} tone={TRUST_TONES[trustState]} />
      <ToneBadge label={VISIBILITY_LABELS[visibility]} tone={VISIBILITY_TONES[visibility]} />

      {nextReviewAt !== null ? (
        <span>
          Review due{" "}
          <time dateTime={nextReviewAt} className="tabular-nums">
            {kbFormatDate(nextReviewAt)}
          </time>
        </span>
      ) : null}

      {ownerUserId !== null && ownerUserId !== undefined ? (
        <span>
          Owner:{" "}
          <span className="text-foreground">
            {owner ? getUserDisplayName(owner) : ownerUserId}
          </span>
        </span>
      ) : null}

      <span>
        Updated {kbTimeAgo(updatedAt)}
        {editor ? (
          <>
            {" by "}
            <span className="text-foreground">{getUserDisplayName(editor)}</span>
          </>
        ) : null}
      </span>
    </div>
  );
}
