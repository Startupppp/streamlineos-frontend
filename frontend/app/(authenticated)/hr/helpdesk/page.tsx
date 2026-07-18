"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/hooks/api/access";
import { MyTicketsTab } from "@/features/hr/helpdesk/my-tickets-tab";
import { QueueTab } from "@/features/hr/helpdesk/queue-tab";

export default function HrHelpdeskPage() {
  const canManage = useCan("hr:helpdesk:manage");

  return (
    <PageWrapper
      title="HR Helpdesk"
      subtitle="Submit and track HR support requests"
 variant="display">
      <Tabs defaultValue="my-tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-tickets" className="text-xs">My Tickets</TabsTrigger>
          {canManage && (
            <TabsTrigger value="queue" className="text-xs">Queue</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="my-tickets">
          <MyTicketsTab />
        </TabsContent>
        {canManage && (
          <TabsContent value="queue">
            <QueueTab />
          </TabsContent>
        )}
      </Tabs>
    </PageWrapper>
  );
}
