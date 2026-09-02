"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { ShiftTemplatesTab } from "./shift-templates-tab";
import { ShiftAssignmentsTab } from "./shift-assignments-tab";
import { ShiftSwapsTab } from "./shift-swaps-tab";
import { ShiftFormSheet } from "./shift-form-sheet";
import type { ShiftTemplate } from "@/hooks/api/hr/shifts";

export function ShiftsPage() {
  const canManage = useCan("hr:attendance:manage");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftTemplate | null>(null);

  function handleOpenSheet() {
    setEditing(null);
    setSheetOpen(true);
  }

  function handleEdit(shift: ShiftTemplate) {
    setEditing(shift);
    setSheetOpen(true);
  }

  function handleSheetOpenChange(next: boolean) {
    setSheetOpen(next);
    if (!next) setEditing(null);
  }

  return (
    <PageWrapper
      title="Shifts"
      subtitle="Manage shift templates, employee assignments, and swap requests"
      actions={
        canManage ? (
          <Button onClick={handleOpenSheet}>
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
        className="flex flex-1 min-h-0 flex-col"
      >
        <Tabs defaultValue="templates" className="flex flex-1 min-h-0 flex-col gap-4">
          <TabsList>
            <TabsTrigger value="templates">Shift Templates</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="swaps">Swap Requests</TabsTrigger>
          </TabsList>
          <TabsContent value="templates" className="mt-0 flex flex-1 min-h-0 flex-col">
            <ShiftTemplatesTab canManage={canManage} onEdit={handleEdit} />
          </TabsContent>
          <TabsContent value="assignments" className="mt-0 flex flex-1 min-h-0 flex-col">
            <ShiftAssignmentsTab />
          </TabsContent>
          <TabsContent value="swaps" className="mt-0 flex flex-1 min-h-0 flex-col">
            <ShiftSwapsTab canManage={canManage} />
          </TabsContent>
        </Tabs>
      </motion.div>
      <ShiftFormSheet open={sheetOpen} onOpenChange={handleSheetOpenChange} shift={editing} />
    </PageWrapper>
  );
}
