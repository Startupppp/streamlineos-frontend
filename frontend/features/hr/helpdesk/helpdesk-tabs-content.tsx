"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyTicketsTab } from "@/features/hr/helpdesk/my-tickets-tab";
import { QueueTab } from "@/features/hr/helpdesk/queue-tab";

interface HelpdeskTabsContentProps {
  canManage: boolean;
}

export function HelpdeskTabsContent({ canManage }: HelpdeskTabsContentProps) {
  return (
    <Tabs defaultValue="my-tickets" className="flex flex-1 min-h-0 flex-col gap-4">
      <TabsList>
        <TabsTrigger value="my-tickets">My Tickets</TabsTrigger>
        {canManage && <TabsTrigger value="queue">Queue</TabsTrigger>}
      </TabsList>
      <TabsContent value="my-tickets" className="mt-0 flex flex-1 min-h-0 flex-col">
        <MyTicketsTab />
      </TabsContent>
      {canManage && (
        <TabsContent value="queue" className="mt-0 flex flex-1 min-h-0 flex-col">
          <QueueTab />
        </TabsContent>
      )}
    </Tabs>
  );
}
