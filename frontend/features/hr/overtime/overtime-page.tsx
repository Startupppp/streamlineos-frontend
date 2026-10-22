"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { OvertimeList } from "./overtime-list";
import { CompOffPanel } from "./comp-off-panel";
import { OvertimeRequestSheet } from "./overtime-request-sheet";

export function OvertimePage() {
  const canManage = useCan("hr:attendance:manage");
  const canRequest = useCan("hr:attendance:view");
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
  }

  return (
    <PageWrapper
      title="Overtime & Comp-Off"
      subtitle="Manage overtime requests and compensatory leave balances"
      actions={
        canRequest ? (
          <Button size="sm" onClick={handleOpen}>
            <Plus className="h-4 w-4" />
            Request overtime
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <Tabs defaultValue="requests" className="flex flex-1 min-h-0 flex-col">
          <TabsList className="shrink-0">
            <TabsTrigger value="requests">Overtime Requests</TabsTrigger>
            <TabsTrigger value="comp-off">Comp-Off Balances</TabsTrigger>
          </TabsList>
          <TabsContent value="requests" className="mt-0 flex flex-1 min-h-0 flex-col">
            <OvertimeList canManage={canManage} />
          </TabsContent>
          <TabsContent value="comp-off" className="mt-0">
            <CompOffPanel />
          </TabsContent>
        </Tabs>
      </div>
      <OvertimeRequestSheet open={open} onOpenChange={setOpen} />
    </PageWrapper>
  );
}
