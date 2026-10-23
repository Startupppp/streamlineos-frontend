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
        title="Calendar & resource approvals"
        subtitle="Review pending room and equipment requests."
      >
        {canRead ? (
          <div className="mb-3 flex min-w-0 items-center border-b border-border pb-2">
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
        ) : null}
        <CalendarResourceApprovalQueue />
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
