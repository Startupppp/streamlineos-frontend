"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGenerateWorkspace } from "@/hooks/api/workspace-onboarding";

const TASKS = [
  "Creating your organization",
  "Setting up departments",
  "Configuring roles",
  "Installing default settings",
  "Preparing your dashboard",
];

interface GenerationStepProps {
  orgName: string;
  industry: string;
  onComplete: () => void;
}

export function GenerationStep({ orgName, industry, onComplete }: GenerationStepProps) {
  const [visibleTasks, setVisibleTasks] = useState<number[]>([]);
  const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);
  const hasFiredRef = useRef(false);
  const hasCompletedRef = useRef(false);

  const generateWorkspace = useGenerateWorkspace();

  useEffect(() => {
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;

    const timers: ReturnType<typeof setTimeout>[] = [];

    TASKS.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setVisibleTasks((prev) => [...prev, i]);
        }, i * 300),
      );
    });

    timers.push(
      setTimeout(() => {
        generateWorkspace.mutate({ industry });
      }, TASKS.length * 300 + 500),
    );

    return () => timers.forEach(clearTimeout);
  }, [industry, generateWorkspace.mutate]);

  useEffect(() => {
    if (generateWorkspace.isSuccess && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      setIsWorkspaceReady(true);
      const timer = setTimeout(() => {
        onComplete();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [generateWorkspace.isSuccess, onComplete]);

  function handleRetry() {
    generateWorkspace.reset();
    generateWorkspace.mutate({ industry });
  }

  return (
    <div className="flex flex-col items-center space-y-8 py-10 px-4">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">Building your workspace…</h2>
        {orgName && (
          <p className="text-muted-foreground text-sm">
            Setting up{" "}
            <span className="font-medium text-foreground">{orgName}</span>
          </p>
        )}
      </div>

      <div className="w-full max-w-sm space-y-3">
        {TASKS.map((task, i) => {
          const isVisible = visibleTasks.includes(i);
          const isDone = isVisible && !generateWorkspace.isError;
          return (
            <AnimatePresence key={task}>
              {isVisible && (
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex items-center gap-3"
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                      isDone
                        ? "bg-primary/10"
                        : "bg-muted",
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      isDone ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {task}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          );
        })}
      </div>

      <AnimatePresence>
        {isWorkspaceReady && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center gap-3 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-primary/20">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">Workspace ready!</p>
              <p className="text-sm text-muted-foreground">Taking you to the next step…</p>
            </div>
          </motion.div>
        )}

        {generateWorkspace.isError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-destructive">Setup encountered an error</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {generateWorkspace.error.message}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
