"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  X,
  LayoutGrid,
  Users,
  Package,
  Landmark,
  FolderKanban,
  Headphones,
  BookOpen,
  MessageSquare,
  CreditCard,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import {
  useModuleChecklists,
  useCompleteChecklistItem,
  useDismissModuleChecklist,
  type ModuleChecklist,
} from "@/hooks/api/onboarding-flow";
import { getErrorMessage } from "@/lib/get-error-message";

const MODULE_LABELS: Record<string, string> = {
  CRM: "Set up CRM",
  HR: "Set up HR",
  INVENTORY: "Set up Inventory",
  FINANCE: "Set up Accounting",
  PROJECTS: "Set up Projects",
  HELPDESK: "Set up Support",
  KNOWLEDGE: "Set up Knowledge",
  CHAT: "Set up Chat",
  PAYMENTS: "Connect payments",
};

const MODULE_ICONS: Record<string, LucideIcon> = {
  CRM: Target,
  HR: Users,
  INVENTORY: Package,
  FINANCE: Landmark,
  PROJECTS: FolderKanban,
  HELPDESK: Headphones,
  KNOWLEDGE: BookOpen,
  CHAT: MessageSquare,
  PAYMENTS: CreditCard,
};

const MODULE_TONE: Record<string, { bg: string; text: string }> = {
  CRM: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  HR: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  INVENTORY: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  FINANCE: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  PROJECTS: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  HELPDESK: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  KNOWLEDGE: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  CHAT: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  PAYMENTS: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
};

const DEFAULT_TONE = { bg: "bg-muted", text: "text-muted-foreground" };

function ModuleSetupBanner({ checklist }: { checklist: ModuleChecklist }) {
  const [isOpen, setIsOpen] = useState(false);
  const completeItem = useCompleteChecklistItem();
  const dismissChecklist = useDismissModuleChecklist();

  const sortedItems = [...checklist.items].sort((a, b) => a.sortOrder - b.sortOrder);
  const label = MODULE_LABELS[checklist.moduleKey] ?? `Set up ${checklist.moduleKey}`;
  const Icon = MODULE_ICONS[checklist.moduleKey] ?? LayoutGrid;
  const tone = MODULE_TONE[checklist.moduleKey] ?? DEFAULT_TONE;

  async function handleDismiss() {
    try {
      await dismissChecklist.mutateAsync(checklist.moduleKey);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleMarkDone(itemKey: string) {
    completeItem.mutate({ moduleKey: checklist.moduleKey, itemKey });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
    >
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0", tone.bg)}>
          <Icon className={cn("h-4 w-4", tone.text)} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <span className="text-xs text-muted-foreground tabular-nums">{checklist.progress}%</span>
          </div>
          <Progress value={checklist.progress} className="h-1.5" />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label={isOpen ? "Collapse checklist" : "Expand checklist"}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={dismissChecklist.isPending}
            aria-label={`Dismiss ${label} checklist`}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="checklist-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border"
          >
            <ul className="divide-y divide-border/60">
              {sortedItems.map((item) => {
                const done = item.status === "done" || item.status === "skipped";
                return (
                  <li key={item.itemKey} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group">
                    <button
                      type="button"
                      onClick={() => handleMarkDone(item.itemKey)}
                      disabled={done || completeItem.isPending}
                      aria-label={done ? `${item.title} completed` : `Mark ${item.title} as done`}
                      className="mt-0.5 shrink-0"
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      )}
                    </button>
                    <Link href={item.actionHref ?? "#"} className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium leading-tight ${
                          done ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {item.title}
                        {item.required && !done && (
                          <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">required</span>
                        )}
                      </p>
                      {!done && item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                    </Link>
                    {item.actionHref && (
                      <LayoutGrid className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 opacity-50 group-hover:opacity-80 transition-opacity" />
                    )}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ModuleSetupBanners() {
  const canView = useCan("onboarding:module-checklists:view");
  const { data: checklists, isLoading } = useModuleChecklists(canView);

  if (!canView || isLoading || !checklists) return null;

  const active = checklists.filter((c) => c.status !== "completed" && !c.dismissedAt);
  if (active.length === 0) return null;

  return (
    <div className="space-y-2">
      {active.map((checklist) => (
        <ModuleSetupBanner key={checklist.id} checklist={checklist} />
      ))}
    </div>
  );
}
