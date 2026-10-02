"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { UserCheck } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CutoffChip, PersonDrawer } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import {
  hrmsCanvasEnter,
  hrmsCanvasEnterReduced,
  hrmsMd,
  hrmsTransition,
  hrmsVariants,
} from "@/lib/hrms/motion";
import { InstanceDetailSheet } from "@/features/hr/workflows/instance-detail-sheet";
import { DelegationSettings } from "@/features/hr/workflows/delegation-settings";
import { ActionCenterQueueView } from "@/features/hr/action-center/action-center-queue";
import { ActedHistory } from "@/features/hr/action-center/acted-history";
import { PersonQueueOverview } from "@/features/hr/action-center/person-queue-overview";
import { useActionCenterQueue } from "@/features/hr/action-center/use-action-center-queue";
import type { ActionCenterItem } from "@/features/hr/action-center/queue-item";

export function HrActionCenterPage() {
  const reduced = useReducedMotion();
  const queue = useActionCenterQueue();
  const canDelegate = useCan("hr:workflows:view");
  const canSeePay = useCan("payroll:salaries:view");

  const [activeTab, setActiveTab] = useState("pending");
  const [delegationOpen, setDelegationOpen] = useState(false);
  const [instanceId, setInstanceId] = useState<number | null>(null);
  const [personUserId, setPersonUserId] = useState<string | null>(null);

  const personItems = useMemo(
    () =>
      personUserId === null
        ? []
        : queue.items.filter(
            (item) => item.requester?.userId === personUserId,
          ),
    [queue.items, personUserId],
  );
  const person = personItems[0]?.requester ?? null;

  function handleOpenDelegation(): void {
    setDelegationOpen(true);
  }

  function handleCloseInstance(): void {
    setInstanceId(null);
  }

  function handleOpenRequester(item: ActionCenterItem): void {
    if (item.requester) setPersonUserId(item.requester.userId);
    else if (item.source === "workflow") setInstanceId(item.sourceId);
  }

  function handlePersonOpenChange(open: boolean): void {
    if (!open) setPersonUserId(null);
  }

  return (
    <PageWrapper
      title="Action Center"
      subtitle="Everything waiting on a decision from you, in one queue"
      actions={
        <div className="flex items-center gap-2">
          <CutoffChip cutoff={queue.cutoff} href="/payroll/readiness" />
          {canDelegate ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenDelegation}
              className="gap-1.5"
            >
              <UserCheck className="h-4 w-4" />
              My delegations
            </Button>
          ) : null}
        </div>
      }
    >
      <motion.div
        initial="hidden"
        animate="show"
        variants={hrmsVariants(reduced, hrmsCanvasEnter, hrmsCanvasEnterReduced)}
        transition={hrmsTransition(reduced, hrmsMd)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <PageTabsToolbar
            tabsDensity="labeled"
            tabs={
              <TabsList>
                <TabsTrigger value="pending" className="gap-1.5">
                  Pending
                  {queue.items.length > 0 ? (
                    <Badge
                      variant="secondary"
                      className="text-micro h-4 px-1.5 leading-none tabular-nums"
                    >
                      {queue.items.length}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="acted">Acted</TabsTrigger>
              </TabsList>
            }
          />

          <TabsContent value="pending" className="flex min-h-0 flex-1 flex-col">
            <ActionCenterQueueView
              queue={queue}
              onOpenRequester={handleOpenRequester}
            />
          </TabsContent>

          <TabsContent value="acted" className="flex min-h-0 flex-1 flex-col">
            <ActedHistory
              enabled={activeTab === "acted"}
              onOpenInstance={setInstanceId}
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      <PersonDrawer
        open={personUserId !== null}
        onOpenChange={handlePersonOpenChange}
        person={person}
        canSeePay={canSeePay}
        hiddenSections={["pay"]}
        profileHref={person ? `/hr/employees/${person.userId}` : undefined}
        sections={{ overview: <PersonQueueOverview items={personItems} /> }}
      />

      <InstanceDetailSheet
        instanceId={instanceId}
        onClose={handleCloseInstance}
        showActions
      />

      <DelegationSettings
        open={delegationOpen}
        onOpenChange={setDelegationOpen}
      />
    </PageWrapper>
  );
}
