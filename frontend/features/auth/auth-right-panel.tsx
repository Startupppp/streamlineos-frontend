"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { FloatingComposition } from "@/components/brand/floating-composition";

const EASE_OUT_QUART = [0.22, 1, 0.36, 1] as const;

export function AuthRightPanel() {
  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col">
      <div
        className="absolute inset-0 opacity-[0.35] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(30,64,175,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(30,64,175,0.06) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 0%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 0%, transparent 75%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE_OUT_QUART }}
        className="relative z-10 px-12 pt-14"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-status-info-surface border border-status-info-rule px-3 py-1 mb-5">
          <Sparkles className="h-3 w-3 text-status-info-ink" />
          <span className="text-xs font-medium text-status-info-ink">
            One OS for every team function
          </span>
        </div>

        <h2 className="font-display text-[2.1rem] xl:text-[2.4rem] font-extrabold leading-[1.04] tracking-[-0.025em] text-foreground max-w-md">
          Run your company on{" "}
          <span className="text-status-info-ink">one platform.</span>
        </h2>

        <p className="text-sm text-muted-foreground leading-relaxed mt-3 max-w-md">
          HR, projects, CRM, chat — unified. Sub-100ms realtime. AI-assisted everywhere.
        </p>
      </motion.div>

      <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-12 py-8">
        <FloatingComposition size="auth" />
      </div>
    </div>
  );
}
