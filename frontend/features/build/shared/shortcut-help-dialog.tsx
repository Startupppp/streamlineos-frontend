"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS: Array<{ keys: string; description: string }> = [
  { keys: "/", description: "Focus search" },
  { keys: "c", description: "Create new item" },
  { keys: "j / ↓", description: "Move down" },
  { keys: "k / ↑", description: "Move up" },
  { keys: "Enter", description: "Open focused item" },
  { keys: "e", description: "Edit focused item" },
  { keys: "Esc", description: "Clear selection / close" },
  { keys: "?", description: "Show keyboard shortcuts" },
];

interface ShortcutHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutHelpDialog({ open, onOpenChange }: ShortcutHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <table className="w-full text-sm">
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.keys} className="border-b border-border last:border-0">
                <td className="py-2 pr-4">
                  <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {s.keys}
                  </kbd>
                </td>
                <td className="py-2 text-muted-foreground">{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}
