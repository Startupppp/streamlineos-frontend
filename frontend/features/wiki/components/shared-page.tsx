"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";

import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useKbPagesTree } from "@/hooks/api/kb";
import { pageHref } from "@/lib/knowledge-routes";
import { KbUsersIcon } from "@/features/wiki/lib/kb-icons";
import type { KbPageTreeNode } from "@/hooks/api/kb/page-types";
import {
  KB_STATUS_LABELS,
  KB_STATUS_BADGE_CLASS,
} from "@/features/wiki/lib/kb-page-status";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import {
  WikiPageCard,
  WIKI_PAGE_CARD_GRID_CLASS,
} from "@/features/wiki/components/wiki-page-card";

function SharedCard({ node }: { node: KbPageTreeNode }) {
  const badgeClass =
    KB_STATUS_BADGE_CLASS[node.status] ??
    "bg-muted text-muted-foreground border-border";
  return (
    <WikiPageCard
      href={pageHref(node.id)}
      title={node.title}
      icon={node.icon}
      coverImage={node.coverImage ?? null}
      subtitle={kbTimeAgo(node.updatedAt ?? "")}
    >
      {node.status ? (
        <Badge
          variant="outline"
          className={`text-micro h-4 px-1.5 shrink-0 ${badgeClass}`}
        >
          {KB_STATUS_LABELS[node.status] ?? node.status}
        </Badge>
      ) : null}
    </WikiPageCard>
  );
}

function SharedSkeleton() {
  return (
    <div className={WIKI_PAGE_CARD_GRID_CLASS}>
      {Array.from({ length: 6 }).map((_, skeletonIndex) => (
        <Skeleton key={skeletonIndex} className="h-28 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function SharedPage() {
  const { data: session } = useSession();
  const { data: treeNodes = [], isLoading, isError } = useKbPagesTree();

  const myId = session?.user?.id;

  const sharedNodes = myId
    ? treeNodes.filter((n) => n.createdById !== null && n.createdById !== myId)
    : [];

  return (
    <PageWrapper title="Shared with me" subtitle="Pages teammates have shared with you">
      {isLoading && <SharedSkeleton />}

      {!isLoading && isError && (
        <EmptyState
          illustration={
            <KbUsersIcon className="w-8 text-muted-foreground" />
          }
          title="Could not load pages"
          description="There was a problem fetching shared pages."
          className={CONTENT_FILL_PANEL}
        />
      )}

      {!isLoading && !isError && sharedNodes.length === 0 && (
        <EmptyState
          illustration={
            <KbUsersIcon className="w-8 text-muted-foreground" />
          }
          illustrationPreset="team"
          title="Nothing shared with you"
          className={CONTENT_FILL_PANEL}
        />
      )}

      {!isLoading && !isError && sharedNodes.length > 0 && (
        <div className={WIKI_PAGE_CARD_GRID_CLASS}>
          {sharedNodes.map((node) => (
            <SharedCard key={node.id} node={node} />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
