"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { ShiftTemplatesTab } from "@/features/hr/shifts/shift-templates-tab";
import { ShiftAssignmentsTab } from "@/features/hr/shifts/shift-assignments-tab";
import { ShiftSwapsTab } from "@/features/hr/shifts/shift-swaps-tab";
import { ShiftFormSheet } from "@/features/hr/shifts/shift-form-sheet";

export default function ShiftsPage() {
  const canManage = useCan("hr:attendance:manage");
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleOpenSheet() {
    setSheetOpen(true);
  }

  return (
    <PageWrapper
      title="Shifts"
      subtitle="Manage shift templates, employee assignments, and swap requests"
      actions={
        canManage ? (
          <Button
            onClick={handleOpenSheet}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Shift
          </Button>
        ) : undefined
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <Tabs defaultValue="templates">
          <TabsList className="mb-4">
            <TabsTrigger value="templates">Shift Templates</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="swaps">Swap Requests</TabsTrigger>
          </TabsList>
          <TabsContent value="templates">
            <ShiftTemplatesTab canManage={canManage} />
          </TabsContent>
          <TabsContent value="assignments">
            <ShiftAssignmentsTab canManage={canManage} />
          </TabsContent>
          <TabsContent value="swaps">
            <ShiftSwapsTab canManage={canManage} />
          </TabsContent>
        </Tabs>
      </motion.div>
      <ShiftFormSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageWrapper>
  );
}
