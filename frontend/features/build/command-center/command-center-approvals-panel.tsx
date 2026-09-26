"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCanState } from "@/hooks/api/access";
import { useApprovalInbox } from "@/hooks/api/build/approvals";
import { PmSection, PmPanel } from "@/components/pm-chrome";
import { PanelHeader } from "./panel-header";
import {
  COMMAND_CENTER_LIST_PANEL,
  COMMAND_CENTER_PANEL_BODY_SCROLL,
} from "./command-center-constants";

function ApprovalRow({ title, entityType }: { title: string; entityType: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 border-b border-border/40 px-3 py-2 last:border-0">
      <span className="min-w-0 flex-1 truncate text-xs text-foreground">{title}</span>
      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-micro font-medium text-muted-foreground">
        {entityType}
      </span>
    </div>
  );
}

export function ApprovalsPanel() {
  const canState = useCanState("build:approvals:view");
  const { data, isLoading, isError, error } = useApprovalInbox();

  if (canState === "denied") return null;

  const allItems = data?.pages.flatMap((p) => p.data) ?? [];
  const totalCount = allItems.length;
  const isLoadingState = canState === "loading" || isLoading;

  return (
    <PmSection
      index={3}
      className="flex min-h-0 min-w-0 w-full max-w-full flex-col lg:col-span-2"
    >
      <PmPanel className={COMMAND_CENTER_LIST_PANEL}>
        <PanelHeader
          title="Pending approvals"
          actions={
            totalCount > 0 ? (
              <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-micro" asChild>
                <Link href="/build/approvals">
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            ) : undefined
          }
        />
        <div className={COMMAND_CENTER_PANEL_BODY_SCROLL}>
          {isLoadingState ? (
            <div className="flex flex-col gap-1 p-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex h-full items-center justify-center p-4">
              <ErrorState
                description={getErrorMessage(error)}
                compact
              />
            </div>
          ) : totalCount === 0 ? (
            <div className="flex h-full items-center justify-center p-4">
              <EmptyState
                title="No pending approvals"
                description="Nothing waiting for your review"
                compact
              />
            </div>
          ) : (
            <div className="overflow-y-auto">
              {allItems.slice(0, 8).map((item) => (
                <ApprovalRow key={item.id} title={item.title} entityType={item.entityType} />
              ))}
            </div>
          )}
        </div>
      </PmPanel>
    </PmSection>
  );
}
