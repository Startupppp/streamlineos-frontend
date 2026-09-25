"use client";

import { getUserDisplayName } from "@/lib/person-display";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { kbTimeAgo, kbFormatDate } from "@/features/wiki/lib/kb-date-utils";

interface PageDocumentMetaFooterProps {
  trustState: "unverified" | "verified" | "verification_expired";
  nextReviewAt: string | null;
  updatedAt: string;
  lastEditedById: string | null;
  ownerUserId?: string | null;
}

const TRUST_LABELS: Record<PageDocumentMetaFooterProps["trustState"], string> = {
  unverified: "Unverified",
  verified: "Verified",
  verification_expired: "Verification expired",
};

/**
 * Quiet page metadata at the bottom of the document — keeps authorship and
 * trust out of the writing flow between title and body. Status lives in the
 * sticky header badge; visibility lives in Share.
 */
export function PageDocumentMetaFooter({
  trustState,
  nextReviewAt,
  updatedAt,
  lastEditedById,
  ownerUserId,
}: PageDocumentMetaFooterProps) {
  const memberIds = [lastEditedById, ownerUserId].filter(
    (id): id is string => id !== null && id !== undefined,
  );

  const { data: membersPage } = useOrgMembersByIds(memberIds);
  const members = membersPage?.data ?? [];

  function getMemberName(userId: string | null | undefined): string | null {
    if (!userId) return null;
    const member = members.find((m) => m.userId === userId);
    return member
      ? getUserDisplayName({ name: member.name, email: member.email })
      : null;
  }

  const editorName = getMemberName(lastEditedById);
  const ownerName = getMemberName(ownerUserId);
  const trustLabel = TRUST_LABELS[trustState];
  const showTrust = trustState !== "unverified";

  return (
    <footer className="mt-14 border-t border-border/60 pt-4 pb-2 text-xs text-muted-foreground">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
        {showTrust ? <span>{trustLabel}</span> : null}
        {ownerName ? (
          <span>
            Owner{" "}
            <span className="font-medium text-foreground/80">{ownerName}</span>
          </span>
        ) : null}
        {nextReviewAt ? (
          <span>
            Review due{" "}
            <span className="font-medium text-foreground/80">
              {kbFormatDate(nextReviewAt)}
            </span>
          </span>
        ) : null}
        <span className="sm:ml-auto" suppressHydrationWarning>
          Updated {kbTimeAgo(updatedAt)}
          {editorName ? (
            <>
              {" "}
              by{" "}
              <span className="font-medium text-foreground/80">{editorName}</span>
            </>
          ) : null}
        </span>
      </div>
    </footer>
  );
}
