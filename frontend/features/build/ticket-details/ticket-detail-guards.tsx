"use client";

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { isApiError, getApiErrorCode } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { pageStateFromError } from "@/lib/page-state/resolve-page-state";
import type { ParsedTicketKey } from "@/components/shared/format-ticket-key";
import type { AccessState } from "@/lib/rbac/gate";
import { DetailSkeleton } from "./ticket-detail-skeleton";

interface TicketDetailGuardsProps {
  parsed: ParsedTicketKey | null;
  backHref: string;
  displayKey: string;
  projectLoading: boolean;
  byKeyLoading: boolean;
  canViewAccess: AccessState;
  byKeyError: Error | null;
  byKeyPending: boolean;
  byKeyTicketExists: boolean;
  routeKeyMismatch: boolean;
  isLoading: boolean;
  ticketError: Error | null;
  ticketExists: boolean;
  versionedTicketExists: boolean;
  ticketIdExists: boolean;
  refetchByKey: () => void;
  refetchTicket: () => void;
  onBackToIssues: () => void;
  children: ReactNode;
}

function RestrictedAccessContent() {
  return (
    <div className="px-4 py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mb-1 font-medium text-foreground">Restricted Access</p>
      <p className="text-sm text-muted-foreground">
        You can only view details of tickets assigned to you.
      </p>
    </div>
  );
}

export function TicketDetailGuards({
  parsed,
  backHref,
  displayKey,
  projectLoading,
  byKeyLoading,
  canViewAccess,
  byKeyError,
  byKeyPending,
  byKeyTicketExists,
  routeKeyMismatch,
  isLoading,
  ticketError,
  ticketExists,
  versionedTicketExists,
  ticketIdExists,
  refetchByKey,
  refetchTicket,
  onBackToIssues,
  children,
}: TicketDetailGuardsProps): ReactNode {
  if (!parsed) return notFound();

  if (projectLoading || byKeyLoading || canViewAccess === "loading") {
    return (
      <PageWrapper title="Loading..." backHref={backHref} noInternalScroll className="h-full">
        <DetailSkeleton />
      </PageWrapper>
    );
  }

  if (routeKeyMismatch) return notFound();

  if (byKeyError) {
    if (isApiError(byKeyError) && getApiErrorCode(byKeyError) === "PROJECTS_FORBIDDEN_TICKET") {
      return (
        <PageWrapper title={displayKey} backHref={backHref}>
          <RestrictedAccessContent />
        </PageWrapper>
      );
    }
    if (isApiError(byKeyError) && byKeyError.status === 404) return notFound();
    const byKeyState = pageStateFromError(byKeyError);
    if (byKeyState !== null && byKeyState.kind !== "error" && byKeyState.kind !== "denied") {
      return (
        <PageWrapper title="Build" backHref={backHref}>
          <PageState resolution={byKeyState} loading={<DetailSkeleton />} onRetry={refetchByKey}>
            <span />
          </PageState>
        </PageWrapper>
      );
    }
    return (
      <PageWrapper title="Ticket" backHref={backHref}>
        <ErrorState
          className="flex-1"
          title="Couldn't load ticket"
          description={getErrorMessage(byKeyError)}
          error={byKeyError}
          onRetry={refetchByKey}
        />
      </PageWrapper>
    );
  }

  if (canViewAccess === "denied") {
    return (
      <PageWrapper title="Ticket" backHref={backHref}>
        <NoPermissionState permission="build:tickets:view" />
      </PageWrapper>
    );
  }

  if (!byKeyTicketExists && !byKeyPending) return notFound();

  if (isLoading || byKeyPending) {
    return (
      <PageWrapper title="Loading..." backHref={backHref} noInternalScroll className="h-full">
        <DetailSkeleton />
      </PageWrapper>
    );
  }

  if (isApiError(ticketError) && getApiErrorCode(ticketError) === "PROJECTS_FORBIDDEN_TICKET") {
    return (
      <PageWrapper title={displayKey} backHref={backHref}>
        <RestrictedAccessContent />
      </PageWrapper>
    );
  }

  if (isApiError(ticketError) && getApiErrorCode(ticketError) === "PROJECTS_TICKET_NOT_FOUND") {
    return notFound();
  }

  if (ticketError && !ticketExists) {
    const ticketState = pageStateFromError(ticketError);
    if (ticketState !== null && ticketState.kind !== "error" && ticketState.kind !== "denied") {
      return (
        <PageWrapper title="Build" backHref={backHref}>
          <PageState resolution={ticketState} loading={<DetailSkeleton />} onRetry={refetchTicket}>
            <span />
          </PageState>
        </PageWrapper>
      );
    }
    return (
      <PageWrapper title={displayKey} backHref={backHref}>
        <ErrorState
          className="flex-1"
          title="Couldn't load ticket"
          description={getErrorMessage(ticketError)}
          error={ticketError}
          onRetry={refetchTicket}
        />
      </PageWrapper>
    );
  }

  if (!ticketExists || !ticketIdExists) {
    return (
      <PageWrapper title="Ticket not found" backHref={backHref}>
        <div className="px-4 py-16 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <p className="mb-4 font-medium text-destructive">Ticket not found</p>
          <Button variant="outline" size="sm" onClick={onBackToIssues}>
            Back to issues
          </Button>
        </div>
      </PageWrapper>
    );
  }

  if (!versionedTicketExists) {
    return (
      <PageWrapper title={displayKey} backHref={backHref}>
        <ErrorState
          className="flex-1"
          title="Couldn't load ticket"
          description="This issue arrived without the version token its edits need, so nothing here could be saved. Reload to try again."
          onRetry={refetchTicket}
        />
      </PageWrapper>
    );
  }

  return children;
}
