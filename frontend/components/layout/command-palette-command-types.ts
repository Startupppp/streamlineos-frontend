import type { ComponentType } from "react";

export interface CommandPaletteCommand {
  id: string;
  label: string;
  group: string;
  keywords: string[];
  shortcut?: string;
  icon: ComponentType<{ className?: string }>;
  isAvailable: boolean;
  confirm?: boolean;
  execute(): void | Promise<void>;
}
