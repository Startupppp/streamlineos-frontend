"use client";

import { useCallback, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { TabsNavigation, TabsNavigationLink } from "@/components/ui/tabs";
import { useAccess, useModuleEnabled } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { SelfServiceHubSkeleton } from "./self-service-hub-skeleton";

type Hub = "workday" | "records" | "money" | "career";
type Section = { value: string; label: string; module?: "hr" | "payroll" };

const SECTIONS: Record<Hub, readonly Section[]> = {
  workday: [
    { value: "attendance", label: "Attendance", module: "hr" },
    { value: "time-off", label: "Time off", module: "hr" },
  ],
  records: [
    { value: "documents", label: "My documents" },
    { value: "onboarding", label: "Onboarding", module: "hr" },
  ],
  money: [
    { value: "expenses", label: "Expenses", module: "hr" },
    { value: "pay", label: "Pay", module: "payroll" },
  ],
  career: [
    { value: "interviews", label: "Interviews", module: "hr" },
    { value: "openings", label: "Job openings", module: "hr" },
    { value: "referrals", label: "Referrals", module: "hr" },
  ],
};

const HUB_TITLES: Record<Hub, string> = {
  workday: "Attendance & Time Off",
  records: "Documents & Onboarding",
  money: "Pay & Expenses",
  career: "Career",
};

export function SelfServiceHub({ hub, content }: { hub: Hub; content: Record<string, ReactNode> }) {
  const searchParams = useSearchParams();
  const {
    data: accessData,
    isLoading: accessLoading,
    isError: accessFailed,
    error: accessError,
    refetch: refetchAccess,
  } = useAccess();
  const pageState = usePageState({
    isLoading: accessLoading && !accessData,
    isError: accessFailed && !accessData,
    error: accessError,
  });
  const handleRetry = useCallback(() => {
    void refetchAccess();
  }, [refetchAccess]);
  const hrEnabled = useModuleEnabled("hr");
  const payrollEnabled = useModuleEnabled("payroll");
  const available = SECTIONS[hub].filter(
    (section) => !section.module || (section.module === "hr" ? hrEnabled : payrollEnabled),
  );
  const requested = searchParams.get("section");
  const requestedSection = SECTIONS[hub].find((section) => section.value === requested);
  const active = requestedSection ?? available[0];

  return (
    <PageState
      resolution={pageState}
      loading={<SelfServiceHubSkeleton title={HUB_TITLES[hub]} />}
      onRetry={handleRetry}
    >
      {!active || !available.some((section) => section.value === active.value) ? (
        <PageWrapper title={HUB_TITLES[hub]}>
          <EmptyState
            title="This area is not available"
            description="Your organization has not enabled the module for this section."
            action={{ label: "Go to Home", href: "/dashboard" }}
          />
        </PageWrapper>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-w-0 shrink-0 border-b border-border px-4 py-2 sm:px-6">
            <TabsNavigation aria-label={`${HUB_TITLES[hub]} sections`} className="w-full max-w-full md:w-fit">
              {available.map((section) => (
                <TabsNavigationLink key={section.value} active={active.value === section.value}>
                  <Link href={section.value === SECTIONS[hub][0].value ? `/me/${hub}` : `/me/${hub}?section=${section.value}`}>
                    {section.label}
                  </Link>
                </TabsNavigationLink>
              ))}
            </TabsNavigation>
          </div>
          {content[active.value]}
        </div>
      )}
    </PageState>
  );
}
