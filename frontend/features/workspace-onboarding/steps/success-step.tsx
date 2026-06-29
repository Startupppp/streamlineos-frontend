"use client";

import { useEffect, useRef } from "react";
import {
  CheckCircle2, Users, Package, ArrowRight,
  UserPlus, FolderOpen, Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useCompleteOnboarding } from "@/hooks/api/workspace-onboarding";
import type { SetupSummary } from "@/features/workspace-onboarding/types";

const NEXT_STEPS = [
  { icon: UserPlus, label: "Add your first employee" },
  { icon: FolderOpen, label: "Create your first project" },
  { icon: Users, label: "Set up your CRM pipeline" },
  { icon: Package, label: "Configure your inventory" },
  { icon: Settings, label: "Customize your settings" },
];

interface SuccessStepProps {
  summary: SetupSummary;
  onEnter: () => void;
}

export function SuccessStep({ summary, onEnter }: SuccessStepProps) {
  const completeOnboarding = useCompleteOnboarding();
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;
    completeOnboarding.mutate();
  }, [completeOnboarding.mutate]);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center text-center space-y-8 py-8 px-4"
    >
      <motion.div variants={fadeUp}>
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto ring-4 ring-primary/20">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center"
          >
            <CheckCircle2 className="h-4 w-4 text-white" />
          </motion.div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Your workspace is ready!</h1>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Everything is configured and your team can start working right away.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-2">
        {summary.industry && (
          <Badge variant="secondary" className="gap-1.5">
            Industry: {summary.industry}
          </Badge>
        )}
        {summary.modulesInstalled.length > 0 && (
          <Badge variant="secondary" className="gap-1.5">
            <Package className="h-3 w-3" />
            {summary.modulesInstalled.length} module{summary.modulesInstalled.length !== 1 ? "s" : ""}
          </Badge>
        )}
        {summary.teamMembersInvited > 0 && (
          <Badge variant="secondary" className="gap-1.5">
            <Users className="h-3 w-3" />
            {summary.teamMembersInvited} invite{summary.teamMembersInvited !== 1 ? "s" : ""} sent
          </Badge>
        )}
      </motion.div>

      <motion.div variants={fadeUp} className="w-full max-w-sm text-left">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Suggested next steps
        </p>
        <div className="space-y-2">
          {NEXT_STEPS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
              <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center shrink-0">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="w-full max-w-sm">
        <Button onClick={onEnter} size="lg" className="w-full h-12 text-base">
          Enter Workspace
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
