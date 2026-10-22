"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { TabsNavigation, TabsNavigationLink } from "@/components/ui/tabs";
import { useAccess, useModuleEnabled } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useT } from "@/lib/i18n/i18n";
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
  money: "Expenses & Pay",
  career: "Hiring & Referrals",
};

const SelfServiceHubContext = createContext<{ hub: Hub; available: readonly Section[]; active: string } | null>(null);

export function SelfServiceHubTabs() {
  const context = useContext(SelfServiceHubContext);
  const searchParams = useSearchParams();
  const t = useT();
  if (!context) throw new Error("SelfServiceHubTabs must be rendered inside SelfServiceHub");
  const { hub, available, active } = context;
  const tabs = hub === "workday"
    ? [
        { value: "today", label: t("attendance.tabToday"), href: "/me/workday" },
        { value: "history", label: t("attendance.tabHistory"), href: "/me/workday?tab=history" },
        { value: "my-leaves", label: t("timeOff.tabMyLeaves"), href: "/me/workday?section=time-off" },
        { value: "wfh", label: t("timeOff.shortWfh"), href: "/me/workday?section=time-off&tab=wfh" },
      ]
    : available.map(({ value, label }) => ({
        value,
        label,
        href: value === SECTIONS[hub][0].value ? `/me/${hub}` : `/me/${hub}?section=${value}`,
      }));
  const activeTab = hub === "workday" && active === "attendance"
    ? searchParams.get("tab") === "history" ? "history" : "today"
    : hub === "workday" ? searchParams.get("tab") === "wfh" ? "wfh" : "my-leaves"
    : active;

  return (
    <TabsNavigation aria-label={`${HUB_TITLES[hub]} sections`} className="w-full shrink-0 md:w-fit">
      {tabs.map(({ value, label, href }) => (
        <TabsNavigationLink key={value} active={value === activeTab}>
          <a
            href={href}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              window.history.pushState(null, "", href);
            }}
          >
            {label}
          </a>
        </TabsNavigationLink>
      ))}
    </TabsNavigation>
  );
}

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
      loading={<SelfServiceHubSkeleton title={HUB_TITLES[hub]} tabCount={hub === "workday" ? 4 : hub === "career" ? 3 : 2} />}
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
        <SelfServiceHubContext.Provider value={{ hub, available, active: active.value }}>
          {content[active.value]}
        </SelfServiceHubContext.Provider>
      )}
    </PageState>
  );
}
