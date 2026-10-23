"use client";

import { useGuardedCreateKbPage } from "@/features/wiki/hooks/use-guarded-create-kb-page";
import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { useFlushableDebouncedValue } from "@/hooks/common/use-debounce";
import { useUrlFilters } from "@/lib/url-state/use-url-filters";
import { useCan } from "@/hooks/api/access";
import { useKbPagesFavorites, useKbPagesRecent } from "@/hooks/api/kb/pages";
import { ErrorState } from "@/components/shared/error-state";
import { KB_IMPORT, KB_SEARCH, KB_TEMPLATES, pageHref, projectPageHref } from "@/lib/knowledge-routes";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import { KbClockIcon, KbStarIcon } from "@/features/wiki/lib/kb-icons";
import { WikiPageCard } from "@/features/wiki/components/wiki-page-card";
import { WikiPageCollectionTable, KB_PAGE_CURSOR_PARAM, collectionCountSubtitle } from "./wiki-page-collection-table";
import { WikiHomeHeaderActions } from "./wiki-home-sections";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import PageTree from "./page-tree";

const HOME_SHORTCUT_LIMIT = 6;
const HOME_SHORTCUT_STRIP_CLASS =
  "flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory";
const HOME_SHORTCUT_CARD_CLASS = "w-56 shrink-0 snap-start sm:w-64";

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
  const [documentCountLabel, setDocumentCountLabel] = useState<string | null>(null);
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
  const favoritesQuery = useKbPagesFavorites();
  const favoritePages = favoritesQuery.data ?? [];
  const canCreate = useCan("kb:pages:create");
  const canImport = useCan("kb:pages:import");

  function resolveHref(pageId: number): string {
    return projectId !== undefined && projectId > 0
      ? projectPageHref(projectId, pageId)
      : pageHref(pageId);
  }
  const createPage = useGuardedCreateKbPage((page) =>
    router.push(resolveHref(page.id)),
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
    void createPage.submit({
      projectId: isProjectScoped ? projectId : undefined,
    });
  }

  function handleRetryFavorites() {
    void favoritesQuery.refetch();
  }

  function handleShortcutHelp() {
    setShortcutHelpOpen(true);
  }

  const recentPreview = recentPages.slice(0, HOME_SHORTCUT_LIMIT);
  const favoritePreview = favoritePages.slice(0, HOME_SHORTCUT_LIMIT);
  function handleClearSelection() {}

  function handleOpenPage(index: number) {
    const row = allPagesRowsRef.current[index];
    if (!row) return;
    router.push(resolveHref(row.id));
  }

  function handleRowsChange(rows: readonly { id: number }[]) {
    allPagesRowsRef.current = [...rows];
  }

  function handleItemCountChange(count: number) {
    setPageItemCount(count);
  }

  useBuildListKeyboard({
    itemCount: pageItemCount,
    onOpen: handleOpenPage,
    onEdit: handleOpenPage,
    onCreate: canCreate ? handleNewPage : undefined,
    onClearSelection: handleClearSelection,
    onShortcutHelp: handleShortcutHelp,
    searchInputRef: searchInputRef,
  });

  const headerActions = (
    <WikiHomeHeaderActions
      canCreate={canCreate}
      isProjectScoped={isProjectScoped}
      projectId={projectId}
    />
  );

  const baseHref = isProjectScoped ? `/build/${projectId}/wiki` : undefined;

  return (
    <>
      <PageWrapper
        title="Docs"
        subtitle={collectionCountSubtitle(
          isProjectScoped
            ? "Docs and decisions for this project"
            : "Files, documents and decisions for your team",
          documentCountLabel,
        )}
        actions={headerActions}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <form
            onSubmit={handleSearchFormSubmit}
            role="search"
            className="w-full max-w-md"
          >
            <SearchInput
              ref={searchInputRef}
              value={searchValue}
              onValueChange={setSearchValue}
              onSubmitSearch={handleSearchSubmit}
              placeholder={
                isProjectScoped
                  ? "Filter this project's files…"
                  : "Search documents…"
              }
            />
          </form>

          {!isProjectScoped && recentPreview.length > 0 && (
            <section className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <KbClockIcon className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  Recently visited
                </h2>
              </div>
              <div className={HOME_SHORTCUT_STRIP_CLASS}>
                {recentPreview.map((page) => (
                  <div key={page.id} className={HOME_SHORTCUT_CARD_CLASS}>
                    <WikiPageCard
                      icon={page.icon}
                      title={page.title}
                      subtitle={kbTimeAgo(page.updatedAt)}
                      href={pageHref(page.id)}
                      coverImage={page.coverImage}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {!isProjectScoped &&
            (favoritePreview.length > 0 || favoritesQuery.isError) && (
              <section className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <KbStarIcon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Starred
                  </h2>
                </div>
                {favoritePreview.length > 0 && (
                  <div className={HOME_SHORTCUT_STRIP_CLASS}>
                    {favoritePreview.map((page) => (
                      <div key={page.id} className={HOME_SHORTCUT_CARD_CLASS}>
                        <WikiPageCard
                          icon={page.icon}
                          title={page.title}
                          subtitle={kbTimeAgo(page.updatedAt)}
                          href={pageHref(page.id)}
                          coverImage={page.coverImage}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {favoritesQuery.isError && (
                  <ErrorState
                    title="Could not load favorites"
                    error={favoritesQuery.error}
                    onRetry={handleRetryFavorites}
                    compact
                    className="mt-2"
                  />
                )}
              </section>
            )}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 md:flex-row">
            {isProjectScoped && (
              <aside
                className="hidden w-[200px] shrink-0 flex-col overflow-y-auto rounded-lg border border-border/60 bg-card/50 p-3 md:flex"
                aria-label="Folder tree"
              >
                <PageTree projectId={projectId} baseHref={baseHref} />
              </aside>
            )}
            <section className="flex min-h-0 min-w-0 flex-1 flex-col">
              {!isProjectScoped && (
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  All documents
                </h2>
              )}
              <WikiPageCollectionTable
                fixedParams={{
                  projectId: isProjectScoped ? projectId : undefined,
                }}
                searchPlaceholder={null}
                emptyTitle="Your Docs workspace starts here"
                emptyDescription="Create your first document to give your team one place for current knowledge."
                emptyAction={
                  canCreate
                    ? { label: "Create a document", onClick: handleNewPage }
                    : undefined
                }
                emptySecondaryAction={{
                  label: "Browse templates",
                  href: KB_TEMPLATES,
                }}
                emptyTertiaryAction={
                  canImport
                    ? { label: "Import documents", href: KB_IMPORT }
                    : undefined
                }
                onItemCountChange={handleItemCountChange}
                onDocumentCountLabelChange={setDocumentCountLabel}
                onRowsChange={handleRowsChange}
              />
            </section>
          </div>
        </div>
      </PageWrapper>
      <ShortcutHelpDialog
        open={shortcutHelpOpen}
        onOpenChange={setShortcutHelpOpen}
      />
    </>
  );
}
