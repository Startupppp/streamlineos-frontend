"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { RostersGrid } from "./rosters-grid";
import { CreateRosterSheet } from "./create-roster-sheet";

export function RostersPage() {
  const canManage = useCan("hr:attendance:manage");
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
  }

  return (
    <PageWrapper
      title="Rosters"
      subtitle="Weekly scheduling grid for your team"
      actions={
        canManage ? (
          <Button
            onClick={handleOpen}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200">
            <Plus className="h-4 w-4 mr-2" />
            New Roster
          </Button>
        ) : undefined
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <RostersGrid canManage={canManage} />
      </motion.div>
      <CreateRosterSheet open={open} onOpenChange={setOpen} />
    </PageWrapper>
  );
}
