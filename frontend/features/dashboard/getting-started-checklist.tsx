"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  X,
  Building2,
  Users,
  CreditCard,
  FileText,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { useOrgMembers } from "@/hooks/api/organization";
import { useSubscription } from "@/hooks/api/subscription";
import { useInvoices } from "@/hooks/api/invoice";

interface ChecklistStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
  isDone: boolean;
}

function useChecklistSteps(): { steps: ChecklistStep[]; isLoading: boolean } {
  const { data: membersData, isLoading: membersLoading } = useOrgMembers(1, 1);
  const { data: subData, isLoading: subLoading } = useSubscription();
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices(
    { limit: 1 },
    { staleTime: 5 * 60_000 },
  );

  const steps = useMemo<ChecklistStep[]>(
    () => [
      {
        id: "workspace",
        label: "Set up your workspace",
        description: "Configure your company profile, branding, and settings.",
        icon: Building2,
        href: "/settings",
        isDone: true,
      },
      {
        id: "team",
        label: "Invite your team",
        description: "Add team members and assign roles.",
        icon: Users,
        href: "/settings",
        isDone: (membersData?.pagination.total ?? 0) > 1,
      },
      {
        id: "subscription",
        label: "Activate your subscription",
        description: "Upgrade from trial to unlock all features.",
        icon: CreditCard,
        href: "/settings/subscription",
        isDone: subData?.subscription?.status === "ACTIVE",
      },
      {
        id: "invoice",
        label: "Create your first invoice",
        description: "Bill a client and start tracking revenue.",
        icon: FileText,
        href: "/billing/invoices/new",
        isDone: (invoicesData?.total ?? 0) > 0,
      },
    ],
    [membersData, subData, invoicesData],
  );

  return {
    steps,
    isLoading: membersLoading || subLoading || invoicesLoading,
  };
}

export function GettingStartedChecklist() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  const orgId = session?.orgId;
  const isOrgOwner = session?.user?.isOrgOwner;

  useEffect(() => {
    if (!orgId) return;
    const dismissed = localStorage.getItem(`gs-checklist-dismissed-${orgId}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (dismissed === "1") setIsDismissed(true);
  }, [orgId]);

  const { steps, isLoading } = useChecklistSteps();
  const completedCount = steps.filter((s) => s.isDone).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  function handleDismiss() {
    if (orgId) {
      localStorage.setItem(`gs-checklist-dismissed-${orgId}`, "1");
    }
    setIsDismissed(true);
  }

  function handleToggle() {
    setIsOpen((prev) => !prev);
  }

  if (!isOrgOwner || isDismissed || isLoading) return null;

  const allDone = completedCount === steps.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
    >
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-sm font-semibold text-foreground">
              Getting started
              {allDone && (
                <span className="ml-2 font-normal text-emerald-600">
                  — all done!
                </span>
              )}
            </p>
            <span className="text-xs text-muted-foreground tabular-nums">
              {completedCount}/{steps.length}
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleToggle}
            aria-label={isOpen ? "Collapse checklist" : "Expand checklist"}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {isOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss getting started checklist"
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="checklist-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border"
          >
            <ul className="divide-y divide-border/60">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <li key={step.id}>
                    <Link
                      href={step.href}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="mt-0.5 shrink-0">
                        {step.isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium leading-tight ${
                            step.isDone
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {step.label}
                        </p>
                        {!step.isDone && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {step.description}
                          </p>
                        )}
                      </div>
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 opacity-50 group-hover:opacity-80 transition-opacity" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
