"use client";

import { useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/hooks/api/access";
import { GeneralSettingsForm } from "./general-settings-form";
import { RatesTab } from "./rates-tab";
import { AuditTab } from "./audit-tab";
import { EmptyState } from "@/components/ui/empty-state";

const tabMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.18, ease: "easeOut" as const },
};

export function SettingsView() {
  const canViewSettings = useCan("timesheets:settings:view");
  const canViewRates = useCan("timesheets:rates:view");
  const shouldReduceMotion = useReducedMotion();

  const motionProps = shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.1 } }
    : tabMotion;

  const handleTabChange = useCallback((_value: string) => {}, []);

  if (!canViewSettings) {
    return (
      <PageWrapper
        title="Timesheet Settings"
        eyebrow="Timesheets"
        noInternalScroll
        className="flex-none"
      >
        <EmptyState
          title="Access restricted"
          description="You don't have permission to view timesheet settings."
          className="min-h-[30vh]"
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Timesheet Settings"
      eyebrow="Timesheets"
      noInternalScroll
      className="flex-none"
    >
      <Tabs defaultValue="general" onValueChange={handleTabChange}>
        <TabsList className="h-8 mb-4">
          <TabsTrigger value="general" className="text-xs h-7">
            General
          </TabsTrigger>
          {canViewRates && (
            <TabsTrigger value="rates" className="text-xs h-7">
              Rates
            </TabsTrigger>
          )}
          <TabsTrigger value="audit" className="text-xs h-7">
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

        <TabsContent value="audit" forceMount className="mt-0 data-[state=inactive]:hidden">
          <motion.div key="audit" {...motionProps}>
            <AuditTab />
          </motion.div>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
