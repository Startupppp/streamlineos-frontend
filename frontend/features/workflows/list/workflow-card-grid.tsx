"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { WorkflowCardItem } from "@/features/workflows/components/workflow-card";
import { fadeUp, staggerContainer } from "@/lib/motion-variants";
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
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        variants={reduceMotion ? undefined : staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate={reduceMotion ? undefined : "visible"}
      >
        {workflows.map((workflow) => (
          <motion.div
            key={workflow.id}
            layout={!reduceMotion}
            variants={reduceMotion ? undefined : fadeUp}
            exit={reduceMotion ? undefined : { opacity: 0 }}
          >
            <WorkflowCardItem
              workflow={workflow}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
