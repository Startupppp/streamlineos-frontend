"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { EmptyKnowledgeIllustration } from "@/components/illustrations";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useCan } from "@/hooks/api/access";
import {
  useKbPagesRecent,
  useKbPagesFavorites,
  useKbPagesTree,
  useKbProjectPagesTree,
  useCreateKbPage,
} from "@/hooks/api/kb";
import { getErrorMessage } from "@/lib/get-error-message";
import type { KbPageTreeNode } from "@/hooks/api/kb/page-types";
import { pageHref, projectPageHref } from "@/lib/knowledge-routes";
import {
  KbClockIcon,
  KbPlusIcon,
  KbStarIcon,
} from "@/features/wiki/lib/kb-icons";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import {
  WikiPageCard,
  WIKI_PAGE_CARD_GRID_CLASS,
} from "@/features/wiki/components/wiki-page-card";

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

  const { data: recentPages = [], isLoading: recentLoading, isError: recentError, error: recentQueryError, refetch: refetchRecent } =
    useKbPagesRecent();
  const { data: favoritePages = [] } = useKbPagesFavorites();
  const orgTree = useKbPagesTree();
  const projectTree = useKbProjectPagesTree(projectId ?? 0);
  const treeQuery = isProjectScoped ? projectTree : orgTree;
  const treeNodes = treeQuery.data ?? [];
  const treeLoading = treeQuery.isLoading;
  const treeError = treeQuery.isError;
  const treeRefetch = treeQuery.refetch;

  const createPage = useCreateKbPage();
  const canCreate = useCan("kb:pages:create");

  const listingLookups = useMemo(() => {
    const covers = new Map<number, string | null>();
    const updatedAt = new Map<number, string>();
    for (const page of [...recentPages, ...favoritePages]) {
      covers.set(page.id, page.coverImage);
      updatedAt.set(page.id, page.updatedAt);
    }
    return { covers, updatedAt };
  }, [recentPages, favoritePages]);

  const rootPages: KbPageTreeNode[] = treeNodes.filter(
    (n: KbPageTreeNode) => n.parentPageId === null,
  );
  const isLoading = recentLoading || treeLoading;
  const isError = recentError || treeError;

  const handleRetry = useCallback(() => {
    void refetchRecent();
    void treeRefetch();
  }, [refetchRecent, treeRefetch]);

  const handleNewPage = useCallback(() => {
    createPage.mutate(
      { projectId: isProjectScoped ? projectId : undefined },
      {
        onSuccess: (page) => router.push(resolvePageHref(page.id)),
        onError: () => toast.error("Failed to create page"),
      },
    );
  }, [createPage, router, projectId, isProjectScoped, resolvePageHref]);

  const newPageAction = canCreate ? (
    <AnimatedIconButton
      type="button"
      icon={KbPlusIcon}
      iconSize={16}
      iconClassName="mr-1.5"
      size="sm"
      onClick={handleNewPage}
      disabled={createPage.isPending}
      suppressHydrationWarning
    >
      New page
    </AnimatedIconButton>
  ) : undefined;

  if (isLoading) {
    return (
      <PageWrapper title="Wiki" actions={newPageAction}>
        <LoadingState variant="cards" />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Wiki" actions={newPageAction}>
        <ErrorState
          title="Couldn't load wiki pages"
          description={getErrorMessage(recentQueryError ?? treeQuery.error)}
          onRetry={handleRetry}
          className="flex-1"
        />
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
          <div className={WIKI_PAGE_CARD_GRID_CLASS}>
            {recentPages.map((page) => (
              <WikiPageCard
                key={page.id}
                icon={page.icon}
                title={page.title}
                subtitle={kbTimeAgo(page.updatedAt)}
                href={resolvePageHref(page.id)}
                coverImage={page.coverImage}
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
          <div className={WIKI_PAGE_CARD_GRID_CLASS}>
            {favoritePages.map((page) => (
              <WikiPageCard
                key={page.id}
                icon={page.icon}
                title={page.title}
                subtitle={kbTimeAgo(page.updatedAt)}
                href={resolvePageHref(page.id)}
                coverImage={page.coverImage}
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
          <div className={WIKI_PAGE_CARD_GRID_CLASS}>
            {rootPages.map((node) => (
              <WikiPageCard
                key={node.id}
                icon={node.icon}
                title={node.title}
                subtitle={kbTimeAgo(
                  node.updatedAt ?? listingLookups.updatedAt.get(node.id) ?? "",
                )}
                href={resolvePageHref(node.id)}
                coverImage={
                  node.coverImage ?? listingLookups.covers.get(node.id) ?? null
                }
              />
            ))}
          </div>
        </section>
      )}
    </PageWrapper>
  );
}
