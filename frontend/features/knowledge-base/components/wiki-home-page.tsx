"use client";

import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { EmptyKnowledgeIllustration } from "@/components/illustrations";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import {
  useKbPagesRecent,
  useKbPagesFavorites,
  useKbPagesTree,
  useCreateKbPage,
} from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import type { KbPageTreeNode } from "@/hooks/api/kb/pages";
import { pageHref } from "@/features/knowledge-base/lib/knowledge-routes";
import {
  KbClockIcon,
  KbFileTextIcon,
  KbPlusIcon,
  KbStarIcon,
} from "@/features/knowledge-base/lib/kb-icons";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

interface PageCardProps {
  id: number;
  icon: string | null;
  title: string;
  updatedAt: string;
}

const PageCard = memo(function PageCard({ id, icon, title, updatedAt }: PageCardProps) {
  return (
    <Link
      href={pageHref(id)}
      className="block p-3 rounded-lg border border-border bg-card shadow-soft hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">
          {icon ?? <KbFileTextIcon className="h-5 w-5 text-muted-foreground mt-0.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{title || "Untitled"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(updatedAt)}</p>
        </div>
      </div>
    </Link>
  );
});

export default function WikiHomePage() {
  const router = useRouter();
  const { data: recentPages = [], isLoading: recentLoading } = useKbPagesRecent();
  const { data: favoritePages = [] } = useKbPagesFavorites();
  const { data: treeNodes = [], isLoading: treeLoading } = useKbPagesTree();
  const createPage = useCreateKbPage();
  const canCreate = useCan("kb:pages:create");
  const shouldReduceMotion = useReducedMotion();

  const rootPages: KbPageTreeNode[] = treeNodes.filter(
    (n: KbPageTreeNode) => n.parentPageId === null
  );
  const isLoading = recentLoading || treeLoading;

  const itemVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : fadeUp;

  const handleNewPage = useCallback(() => {
    createPage.mutate(
      {},
      {
        onSuccess: (page) => router.push(pageHref(page.id)),
        onError: () => toast.error("Failed to create page"),
      }
    );
  }, [createPage, router]);

  const newPageAction = canCreate ? (
    <Button onClick={handleNewPage} disabled={createPage.isPending} size="sm">
      <KbPlusIcon className="h-4 w-4 mr-1" />
      New page
    </Button>
  ) : undefined;

  if (isLoading) {
    return (
      <PageWrapper title="Wiki">
        <LoadingState variant="cards" />
      </PageWrapper>
    );
  }

  if (rootPages.length === 0 && recentPages.length === 0) {
    return (
      <PageWrapper title="Wiki" actions={newPageAction}>
        <EmptyState
          illustration={<EmptyKnowledgeIllustration />}
          title="Your wiki starts here"
          description="Create your first page to build a shared knowledge base for your team."
          action={
            canCreate ? { label: "New page", onClick: handleNewPage } : undefined
          }
          className={CONTENT_FILL_PANEL}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Wiki" subtitle="Your team knowledge base" actions={newPageAction}>
      {recentPages.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <KbClockIcon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Recently visited</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentPages.slice(0, 6).map((page) => (
              <PageCard
                key={page.id}
                id={page.id}
                icon={page.icon}
                title={page.title}
                updatedAt={page.updatedAt}
              />
            ))}
          </div>
        </section>
      )}

      {favoritePages.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <KbStarIcon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Favorites</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {favoritePages.slice(0, 6).map((page) => (
              <PageCard
                key={page.id}
                id={page.id}
                icon={page.icon}
                title={page.title}
                updatedAt={page.updatedAt}
              />
            ))}
          </div>
        </section>
      )}

      {rootPages.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">All pages</h2>
          <motion.div
            className="space-y-1"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {rootPages.map((node) => (
              <motion.div key={node.id} variants={itemVariants}>
                <Link
                  href={pageHref(node.id)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                >
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center leading-none">
                    {node.icon ?? <KbFileTextIcon className="h-4 w-4 text-muted-foreground" />}
                  </span>
                  <span className="flex-1 truncate text-sm leading-normal">{node.title || "Untitled"}</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}
    </PageWrapper>
  );
}
