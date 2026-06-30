"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Sparkles, BarChart3, GitBranch, FileText, Target } from "lucide-react";

type StepAIProps = {
  onBack: () => void;
  onNext: () => void;
};

const FEATURES = [
  { icon: BarChart3, label: "Smart dashboards" },
  { icon: GitBranch, label: "Workflow suggestions" },
  { icon: FileText, label: "Report templates" },
  { icon: Target, label: "OKR tracking" },
];

export function StepAI({ onBack, onNext }: StepAIProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleCustomize() {
    setIsLoading(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 1200));
    setIsLoading(false);
    onNext();
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">
        AI will generate dashboards, pipelines, workflows and reports tailored to your business.
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        {FEATURES.map(({ icon: Icon, label }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border"
          >
            <div className="h-6 w-6 rounded-md bg-card border border-border flex items-center justify-center shrink-0">
              <Icon className="h-3.5 w-3.5 text-foreground" />
            </div>
            <span className="text-[12px] font-medium text-foreground">{label}</span>
          </motion.div>
        ))}
      </div>

      <div className="space-y-1.5 pt-1">
        <Button
          className="w-full h-9 text-sm gap-1.5"
          onClick={handleCustomize}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {isLoading ? "Customising…" : "Yes, customise with AI"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full h-9 text-sm text-muted-foreground"
          onClick={onNext}
          disabled={isLoading}
        >
          Skip, I&apos;ll do it later
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="w-full h-8 text-[12px] text-muted-foreground/60"
          disabled={isLoading}
        >
          <ArrowLeft className="h-3 w-3 mr-1" /> Back
        </Button>
      </div>
    </div>
  );
}
