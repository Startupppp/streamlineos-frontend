"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/api/access";
import { TrainingList } from "@/features/hr/training/training-list";
import { AttendancePanel } from "@/features/hr/training/attendance-panel";
import { CreateProgramSheet } from "@/features/hr/training/create-program-sheet";

export default function TrainingPage() {
  const canManage = useCan("hr:learning:manage");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);

  function handleOpenSheet() {
    setSheetOpen(true);
  }

  function handleSelectProgram(id: number) {
    setSelectedProgramId(id === 0 ? null : id);
  }

  return (
    <PageWrapper
      title="Training Programs"
      subtitle="Manage sessions, track attendance and feedback"
      actions={
        canManage ? (
          <Button
            onClick={handleOpenSheet}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200">
            <Plus className="h-4 w-4 mr-2" />
            New Program
          </Button>
        ) : undefined
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="space-y-4"
      >
        <TrainingList
          canManage={canManage}
          onSelectProgram={handleSelectProgram}
          selectedProgramId={selectedProgramId}
        />

        {selectedProgramId !== null && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="bg-card/90 backdrop-blur-sm rounded-2xl border border-border/80 shadow-sm p-4"
          >
            <h2 className="text-sm font-semibold text-foreground mb-3">Attendance</h2>
            <AttendancePanel programId={selectedProgramId} canManage={canManage} />
          </motion.div>
        )}
      </motion.div>

      <CreateProgramSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageWrapper>
  );
}
