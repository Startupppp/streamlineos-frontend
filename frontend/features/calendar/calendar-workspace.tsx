"use client";

import { useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useShellVariant } from "@/components/layout/shell-variant-context";
import { useCan } from "@/hooks/api/access";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { CalendarResourceApprovalQueue } from "./calendar-resource-approval-queue";
import { CalendarModeTabs } from "./calendar-toolbar";
import { CalendarView } from "./calendar-view";

export function CalendarWorkspace() {
  const searchParams = useSearchParams();
  const shellVariant = useShellVariant();
  const narrowViewport = useIsMobile();
  const hideCalendarGrid = shellVariant === "mobile" || narrowViewport;
  const canRead = useCan("calendar:read");
  const canApproveCalendar = useCan("calendar:admin:manage");
  const canApproveAssets = useCan("hr:assets:manage");
  const canApproveInventory = useCan("inventory:warehouses:manage");
  const canApprove = canApproveCalendar || canApproveAssets || canApproveInventory;
  const showApprovals =
    canApprove && (searchParams.get("section") === "approvals" || !canRead);

  if (showApprovals) {
    return (
      <PageWrapper
        noInternalScroll
        actionsInline
        title={
          <div className="flex flex-col">
            <span>Resource approvals</span>
            <span className="text-sm font-normal text-muted-foreground">
              Review pending room and equipment requests
            </span>
          </div>
        }
      >
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          {canRead ? (
            <div className="flex min-w-0 select-none flex-col gap-2 border-b border-border pb-2">
              <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2">
                <CalendarModeTabs
                  value="resource-approvals"
                  onValueChange={(mode) => {
                    if (mode !== "resource-approvals") {
                      window.history.pushState(
                        null,
                        "",
                        mode === "calendar" ? "/calendar" : `/calendar?mode=${mode}`,
                      );
                    }
                  }}
                  showResourceApprovals
                  hideCalendarGrid={hideCalendarGrid}
                />
              </div>
            </div>
          ) : null}
          <CalendarResourceApprovalQueue />
        </div>
      </PageWrapper>
    );
  }

  return (
    <CalendarView
      onOpenResourceApprovals={
        canApprove
          ? () => window.history.pushState(null, "", "/calendar?section=approvals")
          : undefined
      }
    />
  );
}
