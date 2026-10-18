"use client";

import { useCallback, useMemo } from "react";
import { notFound, usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TicketDetailPage } from "./ticket-detail-page";
import {
  parseTicketKey,
  ticketKeyMatchesProject,
} from "@/components/shared/format-ticket-key";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { TicketDetailPane } from "@/features/build/ticket-details/ticket-detail-pane";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  isTicketDetailPath,
  resolveTicketBackHref,
} from "@/features/build/ticket-details/build-ticket-detail-url";
import { useTicketByKey } from "@/hooks/api/build/ticket-queries";

interface TicketPanelInnerProps {
  projectId: number;
  ticketKey: string;
  returnTo: string | null;
}

export function TicketPanelInner({
  projectId,
  ticketKey,
  returnTo,
}: TicketPanelInnerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isCurrentTicketRoute = useMemo(
    () => isTicketDetailPath(pathname, projectId, ticketKey),
    [pathname, projectId, ticketKey],
  );
  const parsed = useMemo(() => parseTicketKey(ticketKey), [ticketKey]);
  const lookup = useTicketByKey(
    projectId,
    isCurrentTicketRoute ? (parsed?.ticketNumber ?? null) : null,
  );
  const resolvedProjectKey = lookup.data?.project?.key ?? null;
  const routeKeyMismatch =
    Boolean(parsed?.projectKey) &&
    resolvedProjectKey != null &&
    !ticketKeyMatchesProject(parsed, resolvedProjectKey);
  const originHref = useMemo(
    () => resolveTicketBackHref(projectId, returnTo),
    [projectId, returnTo],
  );
  const pageState = usePageState({
    permission: "build:tickets:view",
    isLoading: lookup.isLoading,
    isError: lookup.isError || !parsed,
    error: lookup.error,
  });
  const { refetch } = lookup;
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  const handleClose = useCallback(() => {
    router.push(originHref, { scroll: false });
  }, [router, originHref]);

  if (!isCurrentTicketRoute) return null;
  if (routeKeyMismatch) return notFound();
  if (searchParams.get("draft") === "resume") return <TicketDetailPage projectId={projectId} ticketKey={ticketKey} />;

  const loadingSheet = (
    <Sheet open onOpenChange={(open) => { if (!open) handleClose(); }}>
      <SheetContent
        aria-describedby={undefined}
        side="right"
        className="flex w-full max-w-xl flex-col p-0 sm:max-w-xl"
      >
        <SheetHeader className="flex flex-row items-center gap-2 border-b px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={handleClose}
            aria-label="Close ticket pane"
          >
            <X className="h-4 w-4" />
          </Button>
          <SheetTitle className="line-clamp-1 text-sm font-medium">
            Ticket
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <PageState resolution={pageState} loading={loadingSheet} onRetry={parsed ? handleRetry : undefined}>
      {lookup.data ? (
        <TicketDetailPane
          ticketId={lookup.data.id}
          projectId={projectId}
          originHref={originHref}
        />
      ) : null}
    </PageState>
  );
}
