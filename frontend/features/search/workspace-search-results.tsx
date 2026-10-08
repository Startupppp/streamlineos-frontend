"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { Box, FolderKanban, Search, Shapes } from "lucide-react";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { useInfiniteAllWork } from "@/hooks/api/build/all-work";
import { useInfiniteManagedProducts } from "@/hooks/api/build/managed-products";
import { useInfiniteProjects } from "@/hooks/api/build/projects";
import { usePageState } from "@/hooks/api/use-page-state";
import { useGuardedDocumentNavigation } from "@/hooks/common/use-guarded-document-navigation";

const SEARCH_MIN_LENGTH = 2;
const SEARCH_PAGE_SIZE = 18;

interface ResultSectionProps {
  title: string;
  children: React.ReactNode;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

function ResultSection({
  title,
  children,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: ResultSectionProps) {
  const headingId = `search-${title.toLocaleLowerCase().replaceAll(" ", "-")}`;
  return (
    <section className="space-y-2" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
      <InfiniteScrollSentinel
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={onLoadMore}
        label={`Load more ${title.toLocaleLowerCase()}`}
      />
    </section>
  );
}

interface SearchResultLinkProps {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onOpen: () => void;
  documentNavigation?: boolean;
}

function SearchResultLink({
  href,
  title,
  subtitle,
  icon,
  onOpen,
  documentNavigation = false,
}: SearchResultLinkProps) {
  const navigateDocument = useGuardedDocumentNavigation();
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (event.defaultPrevented) return;
      if (!documentNavigation) {
        onOpen();
        return;
      }
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return;
      }
      event.preventDefault();
      onOpen();
      navigateDocument(href);
    },
    [documentNavigation, href, navigateDocument, onOpen],
  );
  return (
    <Link
      href={href}
      onClick={handleClick}
      className="group flex min-w-0 items-center gap-3 rounded-lg border bg-card px-3 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:text-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </Link>
  );
}

export function WorkspaceSearchResults({
  query,
  onOpenResult,
}: {
  query: string;
  onOpenResult: () => void;
}) {
  const isSearching = query.length >= SEARCH_MIN_LENGTH;
  const projects = useInfiniteProjects({
    limit: SEARCH_PAGE_SIZE,
    ...(isSearching ? { search: query } : {}),
  });
  const products = useInfiniteManagedProducts({
    limit: SEARCH_PAGE_SIZE,
    ...(isSearching ? { search: query } : {}),
  });
  const tickets = useInfiniteAllWork(
    { limit: SEARCH_PAGE_SIZE, scope: "all", search: query },
    { enabled: isSearching },
  );

  const projectRows = useMemo(
    () => projects.data?.pages.flatMap((page) => page.data) ?? [],
    [projects.data],
  );
  const productRows = useMemo(
    () => products.data?.pages.flatMap((page) => page.data) ?? [],
    [products.data],
  );
  const ticketRows = useMemo(
    () => tickets.data?.pages.flatMap((page) => page.data.flatMap((ticket) => {
      if (ticket.projectId === null || ticket.projectKey === null) return [];
      return [{
        ticket,
        href: getTicketDetailHref(ticket.projectId, ticket.projectKey, ticket.ticketNumber),
      }];
    })) ?? [],
    [tickets.data],
  );

  const hasResults = projectRows.length + productRows.length + ticketRows.length > 0;
  const error = projects.error ?? products.error ?? tickets.error;
  const pageState = usePageState({
    permission: "build:view",
    module: "build",
    isLoading:
      projects.isLoading || products.isLoading || (isSearching && tickets.isLoading),
    isError: projects.isError || products.isError || tickets.isError,
    error,
    isEmpty: !hasResults,
  });
  const refetchProjects = projects.refetch;
  const refetchProducts = products.refetch;
  const refetchTickets = tickets.refetch;
  const fetchMoreProjects = projects.fetchNextPage;
  const fetchMoreProducts = products.fetchNextPage;
  const fetchMoreTickets = tickets.fetchNextPage;
  const handleRetry = useCallback(() => {
    void refetchProjects();
    void refetchProducts();
    if (isSearching) void refetchTickets();
  }, [isSearching, refetchProducts, refetchProjects, refetchTickets]);
  const handleMoreProjects = useCallback(() => void fetchMoreProjects(), [fetchMoreProjects]);
  const handleMoreProducts = useCallback(() => void fetchMoreProducts(), [fetchMoreProducts]);
  const handleMoreTickets = useCallback(() => void fetchMoreTickets(), [fetchMoreTickets]);

  return (
    <PageState
      resolution={pageState}
      loading={<div className="flex-1 animate-pulse rounded-xl border bg-card/40" />}
      empty={
        <EmptyState
          illustration={<Search className="size-8 text-muted-foreground" />}
          illustrationSize="xs"
          title={isSearching ? "No matches" : "Nothing to browse yet"}
          description={isSearching
            ? "Try a project key, product name, or ticket title."
            : "Projects and products you can access will appear here."}
          className="flex-1"
        />
      }
      onRetry={handleRetry}
      className="flex-1"
      compact
    >
      <div className="space-y-6" aria-live="polite">
      {projectRows.length > 0 ? (
        <ResultSection
          title={isSearching ? "Projects" : "Projects you can access"}
          hasNextPage={Boolean(projects.hasNextPage)}
          isFetchingNextPage={projects.isFetchingNextPage}
          onLoadMore={handleMoreProjects}
        >
          {projectRows.map((project) => (
            <SearchResultLink
              key={project.id}
              href={`/build/${project.id}`}
              title={project.name}
              subtitle={`${project.key} · Project`}
              icon={<FolderKanban className="size-4" aria-hidden="true" />}
              onOpen={onOpenResult}
            />
          ))}
        </ResultSection>
      ) : null}

      {productRows.length > 0 ? (
        <ResultSection
          title={isSearching ? "Managed products" : "Products you can access"}
          hasNextPage={Boolean(products.hasNextPage)}
          isFetchingNextPage={products.isFetchingNextPage}
          onLoadMore={handleMoreProducts}
        >
          {productRows.map((product) => (
            <SearchResultLink
              key={product.id}
              href={`/build/managed-products/${product.id}`}
              title={product.name}
              subtitle={`${product.key} · Managed product`}
              icon={<Box className="size-4" aria-hidden="true" />}
              onOpen={onOpenResult}
            />
          ))}
        </ResultSection>
      ) : null}

      {isSearching && ticketRows.length > 0 ? (
        <ResultSection
          title="Tickets"
          hasNextPage={Boolean(tickets.hasNextPage)}
          isFetchingNextPage={tickets.isFetchingNextPage}
          onLoadMore={handleMoreTickets}
        >
          {ticketRows.map(({ ticket, href }) => (
            <SearchResultLink
              key={ticket.id}
              href={href}
              title={ticket.title}
              subtitle={`${ticket.projectKey}-${ticket.ticketNumber} · ${ticket.projectName ?? "Project"}`}
              icon={<Shapes className="size-4" aria-hidden="true" />}
              onOpen={onOpenResult}
              documentNavigation
            />
          ))}
        </ResultSection>
      ) : null}
      </div>
    </PageState>
  );
}
