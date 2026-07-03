"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useKbPagesTree } from "@/hooks/api/kb";
import { pageHref } from "@/features/knowledge-base/lib/knowledge-routes";
import type { KbPageTreeNode } from "@/hooks/api/kb/pages";

const STATUS_BADGE_CLASS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  in_review: "bg-amber-50 text-amber-700 border-amber-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-slate-100 text-slate-500 border-slate-200 opacity-60",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  published: "Published",
  archived: "Archived",
};

function SharedRow({ node }: { node: KbPageTreeNode }) {
  const badgeClass = STATUS_BADGE_CLASS[node.status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <Link
      href={pageHref(node.id)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
    >
      <span className="text-base shrink-0 w-5 text-center">
        {node.icon ?? "📄"}
      </span>
      <span className="flex-1 text-sm truncate font-medium">
        {node.title || "Untitled"}
      </span>
      {node.status && (
        <Badge
          variant="outline"
          className={`text-[10px] h-4 px-1.5 shrink-0 ${badgeClass}`}
        >
          {STATUS_LABELS[node.status] ?? node.status}
        </Badge>
      )}
    </Link>
  );
}

function SharedSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-lg" />
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

  const subtitle =
    !isLoading && !isError && sharedNodes.length > 0
      ? `${sharedNodes.length} page${sharedNodes.length === 1 ? "" : "s"}`
      : undefined;

  return (
    <PageWrapper title="Shared with me" subtitle={subtitle}>
      {isLoading && <SharedSkeleton />}

      {!isLoading && isError && (
        <EmptyState
          illustration={<Users className="h-8 w-8 text-muted-foreground/40" />}
          title="Could not load pages"
          description="There was a problem fetching shared pages."
        />
      )}

      {!isLoading && !isError && sharedNodes.length === 0 && (
        <EmptyState
          illustration={<Users className="h-8 w-8 text-muted-foreground/40" />}
          title="Nothing shared with you"
          description="Pages created by others will appear here."
        />
      )}

      {!isLoading && !isError && sharedNodes.length > 0 && (
        <div className="space-y-1.5">
          {sharedNodes.map((node) => (
            <SharedRow key={node.id} node={node} />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
