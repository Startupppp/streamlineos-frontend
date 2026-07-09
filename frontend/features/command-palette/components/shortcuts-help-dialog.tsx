"use client";

import { useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCommandPalette } from "../hooks/use-command-palette";

interface ShortcutRowProps {
  keys: string[];
  label: string;
}

function ShortcutRow({ keys, label }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-foreground/80">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((key) => (
          <kbd
            key={key}
            className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}

const GLOBAL_SHORTCUTS: ShortcutRowProps[] = [
  { keys: ["⌘", "K"], label: "Open command palette" },
  { keys: ["/"], label: "Open command palette" },
  { keys: ["?"], label: "Show keyboard shortcuts" },
];

const PROJECT_SHORTCUTS: ShortcutRowProps[] = [
  { keys: ["C"], label: "Create ticket" },
  { keys: ["G", "B"], label: "Go to Board" },
  { keys: ["G", "I"], label: "Go to My Tickets" },
];

export function ShortcutsHelpDialog() {
  const { helpOpen, setHelpOpen } = useCommandPalette();

  const handleOpenChange = useCallback(
    (open: boolean) => setHelpOpen(open),
    [setHelpOpen],
  );

  return (
    <Dialog open={helpOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm gap-0">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-base">Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Global
            </p>
            <div className="divide-y divide-border/50">
              {GLOBAL_SHORTCUTS.map((s) => (
                <ShortcutRow key={s.label + s.keys.join("")} keys={s.keys} label={s.label} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Inside a project
            </p>
            <div className="divide-y divide-border/50">
              {PROJECT_SHORTCUTS.map((s) => (
                <ShortcutRow key={s.label + s.keys.join("")} keys={s.keys} label={s.label} />
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground/50">
          Shortcuts are disabled while typing in inputs.
        </p>
      </DialogContent>
    </Dialog>
  );
}
