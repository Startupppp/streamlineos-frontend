"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { OvertimeList } from "@/features/hr/overtime/overtime-list";
import { CompOffPanel } from "@/features/hr/overtime/comp-off-panel";
import { OvertimeRequestSheet } from "@/features/hr/overtime/overtime-request-sheet";

export default function OvertimePage() {
  const canManage = useCan("hr:attendance:manage");
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
  }

  return (
    <PageWrapper
      title="Overtime & Comp-Off"
      subtitle="Manage overtime requests and compensatory leave balances"
      actions={
        <Button
          onClick={handleOpen}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Request Overtime
        </Button>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests">Overtime Requests</TabsTrigger>
            <TabsTrigger value="comp-off">Comp-Off Balances</TabsTrigger>
          </TabsList>
          <TabsContent value="requests">
            <OvertimeList canManage={canManage} />
          </TabsContent>
          <TabsContent value="comp-off">
            <CompOffPanel />
          </TabsContent>
        </Tabs>
      </motion.div>
      <OvertimeRequestSheet open={open} onOpenChange={setOpen} />
    </PageWrapper>
  );
}
