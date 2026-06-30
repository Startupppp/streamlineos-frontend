"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import type { WizardData } from "../_lib/types";
import { NEXT_ACTIONS } from "../_lib/constants";
import { clearDraft } from "../_lib/draft";

type StepCompleteProps = {
  data: WizardData;
};

export function StepComplete({ data }: StepCompleteProps) {
  const { update } = useSession();

  const handleEnterWorkspace = useCallback(async () => {
    clearDraft();
    try { await update(); } catch {}
    window.location.href = "/dashboard";
  }, [update]);

  return (
    <div className="space-y-5 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.05 }}
        className="mx-auto"
      >
        <CheckCircle2 className="h-12 w-12 text-foreground mx-auto" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.2 }}
        className="space-y-1"
      >
        <h2 className="text-base font-semibold text-foreground">Your workspace is ready</h2>
        <p className="text-[13px] text-muted-foreground">
          Everything has been set up for your team.
        </p>
      </motion.div>

      <motion.dl
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-0 text-left border border-border rounded-lg divide-y divide-border"
      >
        {[
          { label: "Industry", value: data.industry || "General" },
          { label: "Modules", value: `${data.installedApps.length} active` },
          { label: "Invites", value: data.invitees.length > 0 ? `${data.invitees.length} sent` : "None" },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center px-3 py-2">
            <dt className="text-[12px] text-muted-foreground">{label}</dt>
            <dd className="text-[13px] font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </motion.dl>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
        className="text-left space-y-1.5"
      >
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Next steps
        </p>
        <ul className="space-y-1">
          {NEXT_ACTIONS.map((action, i) => (
            <motion.li
              key={action}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.32 + i * 0.06 }}
              className="flex items-center gap-2 text-[13px] text-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
              {action}
            </motion.li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          className="w-full h-9 text-sm gap-1.5"
          onClick={handleEnterWorkspace}
        >
          Enter Workspace <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </motion.div>
    </div>
  );
}
