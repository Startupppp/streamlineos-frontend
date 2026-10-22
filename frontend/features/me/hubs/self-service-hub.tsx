"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { PageState } from "@/components/shared/page-state";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
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
  money: "Expenses & Pay",
  career: "Hiring & Referrals",
};

const SelfServiceHubContext = createContext<{ hub: Hub; available: readonly Section[]; active: string } | null>(null);

export function SelfServiceSectionSelector() {
  const context = useContext(SelfServiceHubContext);
  if (!context) throw new Error("SelfServiceSectionSelector must be rendered inside SelfServiceHub");
  const { hub, available, active } = context;
  const activeLabel = available.find((section) => section.value === active)?.label ?? HUB_TITLES[hub];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${activeLabel}; switch section`}
          className="inline-flex max-w-full items-center gap-1.5 rounded-md text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="truncate">{activeLabel}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{HUB_TITLES[hub]}</DropdownMenuLabel>
        {available.map(({ value, label }) => (
          <DropdownMenuItem key={value} asChild>
            <Link
              href={value === SECTIONS[hub][0].value ? `/me/${hub}` : `/me/${hub}?section=${value}`}
              aria-current={value === active ? "page" : undefined}
              className="justify-between"
            >
              {label}
              {value === active ? <Check className="size-4" aria-hidden="true" /> : null}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
      loading={<SelfServiceHubSkeleton title={SECTIONS[hub][0].label} />}
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
