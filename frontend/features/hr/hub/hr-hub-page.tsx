"use client";

import { useMemo } from "react";
import {
  UserPlus,
  Briefcase,
  ClipboardCheck,
  Banknote,
  Megaphone,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  HrHero,
  HrPageContent,
  HrQuickAction,
} from "@/features/hr/shared/hr-ui";
import { cn } from "@/lib/utils";
import { useHrHubAccess } from "./use-hr-hub-access";
import { HrHubQueues } from "./hr-hub-queues";
import { HrHubMetrics } from "./hr-hub-metrics";
import { HrHubRecruitment } from "./hr-hub-recruitment";
import { HrHubToday } from "./hr-hub-today";
import { HrHubActivity } from "./hr-hub-activity";

const ALL_QUICK_ACTIONS = [
  {
    key: "add-employee" as const,
    href: "/hr/onboarding",
    icon: UserPlus,
    label: "Add employee",
    description: "Onboard a new hire",
    tone: "blue" as const,
    permKey: "canOnboarding" as const,
  },
  {
    key: "post-job" as const,
    href: "/hr/recruitment/jobs",
    icon: Briefcase,
    label: "Post job",
    description: "Open a new role",
    tone: "sky" as const,
    permKey: "canRequisitionsManage" as const,
  },
  {
    key: "approvals" as const,
    href: "/hr/approvals",
    icon: ClipboardCheck,
    label: "Approvals",
    description: "Pending decisions",
    tone: "amber" as const,
    permKey: "canWorkflowsApprove" as const,
  },
  {
    key: "run-payroll" as const,
    href: "/payroll/runs",
    icon: Banknote,
    label: "Run payroll",
    description: "Execute payroll cycle",
    tone: "emerald" as const,
    permKey: "canPayrollRunsCreate" as const,
  },
  {
    key: "announce" as const,
    href: "/hr/announcements",
    icon: Megaphone,
    label: "Announce",
    description: "Broadcast to your team",
    tone: "rose" as const,
    permKey: "canAnnouncements" as const,
  },
] as const;

export function HrHubPage() {
  const access = useHrHubAccess();

  const visibleActions = useMemo(
    () => ALL_QUICK_ACTIONS.filter((a) => access[a.permKey]),
    [access],
  );

  return (
    <PageWrapper
      title="HR"
      subtitle="People operations hub — manage your team, track time, and run the full employee lifecycle"
      variant="display"
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <HrPageContent>
          {visibleActions.length > 0 ? (
            <HrHero>
              <div
                className={cn(
                  "flex min-h-0 w-full gap-2.5 overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-hide",
                  "[&>*]:min-w-[min(100%,15.5rem)] [&>*]:shrink-0",
                  "min-[420px]:grid min-[420px]:grid-cols-2 min-[420px]:overflow-visible min-[420px]:pb-0",
                  "min-[420px]:[&>*]:min-w-0 min-[420px]:[&>*]:shrink",
                  "xl:grid-cols-5",
                )}
              >
                {visibleActions.map((action) => (
                  <HrQuickAction
                    key={action.key}
                    href={action.href}
                    icon={action.icon}
                    label={action.label}
                    description={action.description}
                    tone={action.tone}
                  />
                ))}
              </div>
            </HrHero>
          ) : null}

          <HrHubQueues access={access} />
          <HrHubRecruitment access={access} />
          <HrHubToday access={access} />
          <HrHubActivity access={access} />
          <HrHubMetrics access={access} />
        </HrPageContent>
      </div>
    </PageWrapper>
  );
}
