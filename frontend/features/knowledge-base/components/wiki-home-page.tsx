"use client";

import { memo, useCallback, useMemo } from "react";
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
  useKbProjectPagesTree,
  useCreateKbPage,
} from "@/hooks/api/kb";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import type { KbPageTreeNode } from "@/hooks/api/kb/pages";
import { pageHref, projectPageHref } from "@/features/knowledge-base/lib/knowledge-routes";
import {
  KbClockIcon,
  KbFileTextIcon,
  KbPlusIcon,
  KbStarIcon,
} from "@/features/knowledge-base/lib/kb-icons";
import { TruncatedText } from "@/components/ui/truncated-text";
import { kbTimeAgo } from "@/features/knowledge-base/lib/kb-date-utils";

interface PageCardProps {
  id: number;
  icon: string | null;
  title: string;
  updatedAt: string;
  href: string;
}

const PageCard = memo(function PageCard({
  icon,
  title,
  updatedAt,
  href,
}: PageCardProps) {
  return (
    <Link
      href={href}
      className="block p-3 rounded-lg border border-border bg-card shadow-soft hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">
          {icon ?? (
            <KbFileTextIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <TruncatedText
            text={title || "Untitled"}
            className="font-medium text-sm"
          />
          <p className="text-xs text-muted-foreground mt-0.5">
            {kbTimeAgo(updatedAt)}
          </p>
        </div>
      </div>
    </Link>
  );
});

interface WikiHomePageProps {
  projectId?: number;
}

export default function WikiHomePage({ projectId }: WikiHomePageProps) {
  const router = useRouter();
  const isProjectScoped = projectId !== undefined && projectId > 0;

  const resolvePageHref = useMemo(
    () => (pageId: number): string =>
      isProjectScoped ? projectPageHref(projectId, pageId) : pageHref(pageId),
    [isProjectScoped, projectId],
  );

  const { data: recentPages = [], isLoading: recentLoading } =
    useKbPagesRecent();
  const { data: favoritePages = [] } = useKbPagesFavorites();
  const orgTree = useKbPagesTree();
  const projectTree = useKbProjectPagesTree(projectId ?? 0);
  const treeQuery = isProjectScoped ? projectTree : orgTree;
  const treeNodes = treeQuery.data ?? [];
  const treeLoading = treeQuery.isLoading;

  const createPage = useCreateKbPage();
  const shouldReduceMotion = useReducedMotion();

  const rootPages: KbPageTreeNode[] = treeNodes.filter(
    (n: KbPageTreeNode) => n.parentPageId === null,
  );
  const isLoading = recentLoading || treeLoading;

  const itemVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : fadeUp;

  const handleNewPage = useCallback(() => {
    createPage.mutate(
      { projectId: isProjectScoped ? projectId : undefined },
      {
        onSuccess: (page) => router.push(resolvePageHref(page.id)),
        onError: () => toast.error("Failed to create page"),
      },
    );
  }, [createPage, router, projectId, isProjectScoped, resolvePageHref]);

  const newPageAction = (
    <Button onClick={handleNewPage} disabled={createPage.isPending} size="sm">
      <KbPlusIcon className="h-4 w-4 mr-1" />
      New page
    </Button>
  );

  if (isLoading) {
    return (
      <PageWrapper title="Wiki">
        <LoadingState variant="cards" />
      </PageWrapper>
    );
  }

  const emptyCondition = isProjectScoped
    ? rootPages.length === 0
    : rootPages.length === 0 && recentPages.length === 0;

  if (emptyCondition) {
    return (
      <PageWrapper title="Wiki" actions={newPageAction}>
        <EmptyState
          illustration={<EmptyKnowledgeIllustration />}
          title="Your wiki starts here"
          description={
            isProjectScoped
              ? "Create your first page to document this project."
              : "Create your first page to build a shared knowledge base for your team."
          }
          action={{ label: "New page", onClick: handleNewPage }}
          className={CONTENT_FILL_PANEL}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Wiki"
      subtitle="Your team knowledge base"
      actions={newPageAction}
    >
      {!isProjectScoped && recentPages.length > 0 && (
        <section className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <KbClockIcon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Recently visited
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentPages.slice(0, 6).map((page) => (
              <PageCard
                key={page.id}
                id={page.id}
                icon={page.icon}
                title={page.title}
                updatedAt={page.updatedAt}
                href={resolvePageHref(page.id)}
              />
            ))}
          </div>
        </section>
      )}

      {!isProjectScoped && favoritePages.length > 0 && (
        <section className="mb-4">
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
                href={resolvePageHref(page.id)}
              />
            ))}
          </div>
        </section>
      )}

      {rootPages.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            All pages
          </h2>
          <motion.div
            className="space-y-1"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {rootPages.map((node) => (
              <motion.div key={node.id} variants={itemVariants}>
                <Link
                  href={resolvePageHref(node.id)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                >
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center leading-none">
                    {node.icon ?? (
                      <KbFileTextIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </span>
                  <TruncatedText
                    text={node.title || "Untitled"}
                    className="flex-1 text-sm leading-normal"
                  />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}
    </PageWrapper>
  );
}
