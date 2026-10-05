"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { useFlushableDebouncedValue } from "@/hooks/common/use-debounce";
import { useUrlFilters } from "@/lib/url-state/use-url-filters";
import { useCan } from "@/hooks/api/access";
import {
  useKbPagesFavorites,
  useKbPagesRecent,
  useCreateKbPage,
} from "@/hooks/api/kb";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { KB_SEARCH, pageHref, projectPageHref } from "@/lib/knowledge-routes";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import {
  KbClockIcon,
  KbPlusIcon,
  KbStarIcon,
} from "@/features/wiki/lib/kb-icons";
import {
  WikiPageCard,
  WIKI_PAGE_CARD_GRID_CLASS,
} from "@/features/wiki/components/wiki-page-card";
import {
  WikiHomeAllPages,
  KB_PAGE_CURSOR_PARAM,
} from "./wiki-home-all-pages";
import { WikiCompanyDocumentsStrip } from "./wiki-company-documents-strip";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import PageTree from "./page-tree";

interface WikiHomePageProps {
  projectId?: number;
}

export default function WikiHomePage({ projectId }: WikiHomePageProps) {
  const isProjectScoped = projectId !== undefined && projectId > 0;
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = (searchParams.get("q") ?? "").trim();
  const [searchValue, setSearchValue] = useState(urlQuery);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [pageItemCount, setPageItemCount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const allPagesRowsRef = useRef<{ id: number }[]>([]);

  const [debouncedSearch, flushSearch] = useFlushableDebouncedValue(
    searchValue,
    300,
  );
  const { update } = useUrlFilters({ pageParam: KB_PAGE_CURSOR_PARAM });
  const updateRef = useRef(update);

  useEffect(() => {
    updateRef.current = update;
  }, [update]);

  useEffect(() => {
    if (!isProjectScoped) return;
    const next = debouncedSearch.trim();
    if (next === urlQuery) return;
    updateRef.current({ q: next === "" ? null : next });
  }, [isProjectScoped, debouncedSearch, urlQuery]);

  const { data: recentPages = [] } = useKbPagesRecent();
  const { data: favoritePages = [] } = useKbPagesFavorites();
  const createPage = useCreateKbPage();
  const canCreate = useCan("kb:pages:create");

  const resolveHref = useCallback(
    (pageId: number): string =>
      projectId !== undefined && projectId > 0
        ? projectPageHref(projectId, pageId)
        : pageHref(pageId),
    [projectId],
  );

  function handleSearchSubmit() {
    if (isProjectScoped) {
      flushSearch();
      return;
    }
    const q = searchValue.trim();
    if (q) {
      router.push(`${KB_SEARCH}?q=${encodeURIComponent(q)}`);
    }
  }

  function handleSearchFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSearchSubmit();
  }

  function handleNewPage() {
    createPage.mutate(
      { projectId: isProjectScoped ? projectId : undefined },
      {
        onSuccess: (page) => router.push(resolveHref(page.id)),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);
  const handleClearSelection = useCallback(() => {}, []);

  const handleOpenPage = useCallback((index: number) => {
    const row = allPagesRowsRef.current[index];
    if (!row) return;
    router.push(resolveHref(row.id));
  }, [router, resolveHref]);

  const handleRowsChange = useCallback((rows: readonly { id: number }[]) => {
    allPagesRowsRef.current = [...rows];
  }, []);

  const handleItemCountChange = useCallback((count: number) => {
    setPageItemCount(count);
  }, []);

  useBuildListKeyboard({
    itemCount: pageItemCount,
    onOpen: handleOpenPage,
    onEdit: handleOpenPage,
    onCreate: canCreate ? handleNewPage : undefined,
    onClearSelection: handleClearSelection,
    onShortcutHelp: handleShortcutHelp,
    searchInputRef: searchInputRef,
  });

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

  const baseHref = isProjectScoped ? `/build/${projectId}/wiki` : undefined;

  return (
    <>
    <PageWrapper
      title="Wiki"
      subtitle={
        isProjectScoped
          ? "Docs and decisions for this project"
          : "Your team knowledge base"
      }
      actions={newPageAction}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <form onSubmit={handleSearchFormSubmit} role="search">
          <SearchInput
            ref={searchInputRef}
            value={searchValue}
            onValueChange={setSearchValue}
            onSubmitSearch={handleSearchSubmit}
            placeholder={
              isProjectScoped
                ? "Filter this project's pages…"
                : "Search wiki pages…"
            }
            fill
          />
        </form>

        {!isProjectScoped && recentPages.length > 0 && (
          <section>
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
                  href={pageHref(page.id)}
                  coverImage={page.coverImage}
                />
              ))}
            </div>
          </section>
        )}

        {!isProjectScoped && favoritePages.length > 0 && (
          <section>
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
                  href={pageHref(page.id)}
                  coverImage={page.coverImage}
                />
              ))}
            </div>
          </section>
        )}

        {!isProjectScoped && <WikiCompanyDocumentsStrip />}

        <div className="flex min-h-0 flex-1 gap-4">
          {isProjectScoped && (
            <aside
              className="hidden w-[200px] shrink-0 flex-col overflow-y-auto rounded-lg border border-border/60 bg-card/50 p-3 md:flex"
              aria-label="Page tree"
            >
              <PageTree projectId={projectId} baseHref={baseHref} />
            </aside>
          )}
          <section className="flex min-h-0 flex-1 flex-col">
            {!isProjectScoped && (
              <h2 className="text-sm font-semibold text-foreground mb-3">
                All pages
              </h2>
            )}
            <WikiHomeAllPages
              projectId={isProjectScoped ? projectId : undefined}
              onItemCountChange={handleItemCountChange}
              onRowsChange={handleRowsChange}
            />
          </section>
        </div>
      </div>
    </PageWrapper>
    <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
    </>
  );
}
