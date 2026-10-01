"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { CalendarPlus, FileText, Upload } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageState } from "@/hooks/api/use-page-state";
import { useMyOnboarding } from "@/hooks/api/hr/onboarding";
import { getUserDisplayName } from "@/lib/person-display";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { EssClockRow } from "./ess-clock-row";
import { EssRecentStrip } from "./ess-recent-strip";

const PRIMARY_ACTIONS = [
  { href: "/me/time-off", label: "Request leave or WFH", icon: CalendarPlus },
  { href: "/me/pay", label: "View payslip", icon: FileText },
  { href: "/me/documents", label: "Upload a document", icon: Upload },
];

function EssHomeSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function OnboardingTaskChip() {
  const { data, isLoading } = useMyOnboarding();
  if (isLoading) return null;
  const pending = (data ?? []).filter((task) => task.status !== "COMPLETED").length;
  if (pending === 0) return null;
  const tone = statusToneClasses("warning");
  return (
    <Link
      href="/me/onboarding"
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border px-3 text-dense font-medium",
        tone.surface,
        tone.inkStrong,
        tone.rule,
      )}
    >
      {pending} onboarding {pending === 1 ? "task" : "tasks"}
    </Link>
  );
}

export function EssHomePage() {
  const { data: session } = useSession();
  const pageState = usePageState({ module: "hr", isLoading: false, isError: false });
  const name = getUserDisplayName({
    name: session?.user?.name ?? null,
    email: session?.user?.email ?? null,
  });

  return (
    <PageWrapper
      variant="display"
      title={`${greeting(new Date())}${name ? `, ${name}` : ""}`}
      subtitle="Your day, your leave and your pay — nothing else."
    >
      <PageState resolution={pageState} loading={<EssHomeSkeleton />}>
        <div className="flex flex-col gap-4">
          <EssClockRow />

          <div className="flex flex-wrap items-center gap-2">
            <OnboardingTaskChip />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PRIMARY_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex min-h-11 items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
              >
                <action.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                {action.label}
              </Link>
            ))}
          </div>

          <EssRecentStrip />
        </div>
      </PageState>
    </PageWrapper>
  );
}
