"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/hooks/api/access";
import { GeneralSettingsForm } from "./general-settings-form";
import { RatesTab } from "./rates-tab";
import { AuditTab } from "./audit-tab";
import { SettingsHistoryTab } from "./settings-history-tab";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";

const tabMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.18, ease: "easeOut" as const },
};

const VALID_TABS = ["general", "rates", "history", "audit"] as const;

export function SettingsView() {
  const canViewSettings = useCan("timesheets:settings:view");
  const canViewRates = useCan("timesheets:rates:view");
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam && (VALID_TABS as readonly string[]).includes(tabParam) && (tabParam !== "rates" || canViewRates)
      ? tabParam
      : "general";

  const motionProps = shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.1 } }
    : tabMotion;

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "general") params.delete("tab");
      else params.set("tab", value);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "/timesheets/settings", { scroll: false });
    },
    [searchParams, router],
  );

  if (!canViewSettings) {
    return (
      <PageWrapper
        title="Timesheet Settings"
        noInternalScroll
        className="flex-none"
      >
        <EmptyState
          title="Access restricted"
          description="You don't have permission to view timesheet settings."
          className={CONTENT_FILL_PANEL}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Timesheet Settings"
      noInternalScroll
      className="flex-none"
    >
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">
            General
          </TabsTrigger>
          {canViewRates && (
            <TabsTrigger value="rates">
              Rates
            </TabsTrigger>
          )}
          <TabsTrigger value="history">
            Change history
          </TabsTrigger>
          <TabsTrigger value="audit">
            Audit trail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" forceMount className="mt-0 data-[state=inactive]:hidden">
          <motion.div key="general" {...motionProps}>
            <GeneralSettingsForm />
          </motion.div>
        </TabsContent>

        {canViewRates && (
          <TabsContent value="rates" forceMount className="mt-0 data-[state=inactive]:hidden">
            <motion.div key="rates" {...motionProps}>
              <RatesTab />
            </motion.div>
          </TabsContent>
        )}

        {/*
          Not forceMount, unlike its siblings. The history is a separate request
          and mounting it eagerly would fire it for everyone who opens Settings
          to change one switch. The tab is where somebody goes to ask a question
          about the past, so it loads when they ask it.
        */}
        <TabsContent value="history" className="mt-0">
          <motion.div key="history" {...motionProps}>
            <SettingsHistoryTab />
          </motion.div>
        </TabsContent>

        <TabsContent value="audit" forceMount className="mt-0 data-[state=inactive]:hidden">
          <motion.div key="audit" {...motionProps}>
            <AuditTab />
          </motion.div>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
