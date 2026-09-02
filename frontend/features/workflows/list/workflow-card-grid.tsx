"use client";

import { AnimatePresence, motion } from "framer-motion";
import { WorkflowCardItem } from "@/features/workflows/components/workflow-card";
import type { Workflow } from "@/hooks/api/workflows";

interface WorkflowCardGridProps {
  workflows: Workflow[];
  onDuplicate: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
}

export function WorkflowCardGrid({
  workflows,
  onDuplicate,
  onDelete,
}: WorkflowCardGridProps) {
  return (
    <AnimatePresence mode="popLayout">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((workflow, idx) => (
          <motion.div
            key={workflow.id}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
            transition={{ duration: 0.22, ease: "easeOut", delay: idx * 0.04 }}
          >
            <WorkflowCardItem
              workflow={workflow}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}
