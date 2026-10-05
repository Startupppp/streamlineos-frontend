"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy } from "lucide-react";

interface WebhookSecretRevealPanelProps {
  revealedSecret: string | null;
  secretCopied: boolean;
  onCopy: () => void;
  onDismiss: () => void;
}

export function WebhookSecretRevealPanel({
  revealedSecret,
  secretCopied,
  onCopy,
  onDismiss,
}: WebhookSecretRevealPanelProps) {
  return (
    <AnimatePresence>
      {revealedSecret && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden border-t border-border bg-muted/30"
        >
          <div className="p-3.5">
            <p className="text-xs font-normal text-muted-foreground mb-2">
              New signing secret — copy it now, it will not be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-background border border-border rounded px-2 py-1 truncate">
                {revealedSecret}
              </code>
              <button
                type="button"
                onClick={onCopy}
                aria-label="Copy signing secret"
                className="flex items-center justify-center h-7 w-7 rounded border border-border bg-background hover:bg-muted transition-colors shrink-0"
              >
                {secretCopied ? (
                  <Check className="h-3.5 w-3.5 text-status-success-ink-strong" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss secret"
                className="text-micro text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
