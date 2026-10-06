"use client";

import { useState, useCallback } from "react";
import { type UseFormReturn } from "react-hook-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { ProjectAutomation } from "@/types/projects";
import { type FormValues } from "./automation-schema";
import { AutomationDryRunPanel } from "./automation-dry-run-panel";
import { AutomationRunHistory } from "./automation-run-history";
import { AutomationSettingsTab } from "./automation-settings-tab";
import { AutomationRulesForm } from "./automation-rules-form";

type SheetTab = "rules" | "test" | "history" | "settings";

interface AutomationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAutomation: ProjectAutomation | null;
  form: UseFormReturn<FormValues>;
  conditionFields: Array<{ id: string }>;
  actionFields: Array<{ id: string }>;
  onAppendCondition: () => void;
  onRemoveCondition: (index: number) => void;
  onAppendAction: () => void;
  onRemoveAction: (index: number) => void;
  onSubmit: (values: FormValues) => void;
  onClose: () => void;
  projectId: number;
  createIsPending: boolean;
  updateIsPending: boolean;
}

export function AutomationSheet({
  open,
  onOpenChange,
  editingAutomation,
  form,
  conditionFields,
  actionFields,
  onAppendCondition,
  onRemoveCondition,
  onAppendAction,
  onRemoveAction,
  onSubmit,
  onClose,
  projectId,
  createIsPending,
  updateIsPending,
}: AutomationSheetProps) {
  const [activeTab, setActiveTab] = useState<SheetTab>("rules");
  const handleTabRules = useCallback(() => setActiveTab("rules"), []);
  const handleTabTest = useCallback(() => setActiveTab("test"), []);
  const handleTabHistory = useCallback(() => setActiveTab("history"), []);
  const handleTabSettings = useCallback(() => setActiveTab("settings"), []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 w-full sm:max-w-lg overflow-hidden">
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <SheetTitle className="text-base">
            {editingAutomation ? "Edit Automation" : "New Automation"}
          </SheetTitle>
          {editingAutomation !== null && (
            <div className="flex gap-1 mt-1.5" role="tablist" aria-label="Automation tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "rules"}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  activeTab === "rules"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
                onClick={handleTabRules}
              >
                Rules
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "test"}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  activeTab === "test"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
                onClick={handleTabTest}
              >
                Test
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "history"}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  activeTab === "history"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
                onClick={handleTabHistory}
              >
                History
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "settings"}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  activeTab === "settings"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
                onClick={handleTabSettings}
              >
                Settings
              </button>
            </div>
          )}
        </SheetHeader>

        {editingAutomation !== null && activeTab === "test" && (
          <SheetBody className="px-4 py-3">
            <AutomationDryRunPanel
              projectId={projectId}
              automationId={editingAutomation.id}
              triggerEvent={editingAutomation.triggerEvent}
            />
          </SheetBody>
        )}

        {editingAutomation !== null && activeTab === "history" && (
          <SheetBody className="px-4 py-3">
            <AutomationRunHistory
              projectId={projectId}
              automationId={editingAutomation.id}
            />
          </SheetBody>
        )}

        {editingAutomation !== null && activeTab === "settings" && (
          <SheetBody className="px-4 py-3">
            <AutomationSettingsTab
              projectId={projectId}
              automationId={editingAutomation.id}
            />
          </SheetBody>
        )}

        {(editingAutomation === null || activeTab === "rules") && (
          <AutomationRulesForm
            form={form}
            conditionFields={conditionFields}
            actionFields={actionFields}
            onAppendCondition={onAppendCondition}
            onRemoveCondition={onRemoveCondition}
            onAppendAction={onAppendAction}
            onRemoveAction={onRemoveAction}
            onSubmit={onSubmit}
            onClose={onClose}
            projectId={projectId}
            createIsPending={createIsPending}
            updateIsPending={updateIsPending}
            editingAutomation={editingAutomation}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
