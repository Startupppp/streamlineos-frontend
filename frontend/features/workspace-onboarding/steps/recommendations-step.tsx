"use client";

import { useState, useMemo } from "react";
import {
  Users, TrendingUp, FileText, Package, DollarSign, Receipt,
  Wallet, Headphones, BookOpen, MessageSquare, FolderKanban,
  CheckSquare, Sparkles, Zap, ShoppingCart, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUpdateOrgSettings } from "@/hooks/api/organization";

interface ModuleInfo {
  label: string;
  description: string;
  icon: LucideIcon;
}

const MODULE_INFO: Record<string, ModuleInfo> = {
  CRM: { label: "CRM", description: "Manage leads, deals, and customer relationships", icon: Users },
  "Sales Pipeline": { label: "Sales Pipeline", description: "Visual deal tracking and forecasting", icon: TrendingUp },
  Quotes: { label: "Quotes", description: "Create and send professional quotes", icon: FileText },
  "HR Suite": { label: "HR Suite", description: "Employee records, onboarding, and lifecycle", icon: Users },
  Payroll: { label: "Payroll", description: "Automated payroll processing and payslips", icon: DollarSign },
  Calendar: { label: "Calendar", description: "Team scheduling and event management", icon: CheckSquare },
  Inventory: { label: "Inventory", description: "Stock tracking, warehouses, and purchase orders", icon: Package },
  Procurement: { label: "Procurement", description: "Vendor management and purchase workflows", icon: ShoppingCart },
  Accounting: { label: "Accounting", description: "Ledgers, journal entries, and financial reports", icon: Wallet },
  Invoices: { label: "Invoices", description: "Billing, payment tracking, and recurring invoices", icon: Receipt },
  Expenses: { label: "Expenses", description: "Expense claims and reimbursement workflows", icon: DollarSign },
  "Support Desk": { label: "Support Desk", description: "Ticketing system for customer support", icon: Headphones },
  "Knowledge Base": { label: "Knowledge Base", description: "Self-serve articles and help center", icon: BookOpen },
  Chat: { label: "Chat", description: "Real-time team messaging and channels", icon: MessageSquare },
  Projects: { label: "Projects", description: "Project management with sprints and kanban", icon: FolderKanban },
  Tasks: { label: "Tasks", description: "Task assignment, tracking, and queues", icon: CheckSquare },
  "AI Assistant": { label: "AI Assistant", description: "AI-powered workspace automation and insights", icon: Sparkles },
  Automation: { label: "Automation", description: "Workflow automation with triggers and actions", icon: Zap },
};

const GOAL_MODULES: Record<string, string[]> = {
  "grow-sales": ["CRM", "Sales Pipeline", "Quotes"],
  "manage-employees": ["HR Suite", "Payroll", "Calendar"],
  "manage-inventory": ["Inventory", "Procurement"],
  finance: ["Accounting", "Invoices", "Expenses"],
  "customer-support": ["Support Desk", "Knowledge Base", "Chat"],
  projects: ["Projects", "Tasks"],
  "ai-automation": ["AI Assistant", "Automation"],
  "build-everything": [
    "CRM", "HR Suite", "Inventory", "Accounting", "Support Desk",
    "Projects", "AI Assistant", "Automation",
  ],
};

const GOAL_LABELS: Record<string, string> = {
  "grow-sales": "Grow Sales",
  "manage-employees": "Manage Employees",
  "manage-inventory": "Manage Inventory",
  finance: "Finance & Accounting",
  "customer-support": "Customer Support",
  projects: "Manage Projects",
  "ai-automation": "AI Automation",
  "build-everything": "Build Everything",
};

interface RecommendationsStepProps {
  goals: string[];
  industry: string;
  onNext: (installed: string[]) => void;
  onBack: () => void;
}

export function RecommendationsStep({ goals, industry, onNext, onBack }: RecommendationsStepProps) {
  const recommended = useMemo(() => {
    const modules = [...new Set(goals.flatMap((g) => GOAL_MODULES[g] ?? []))];
    return modules;
  }, [goals]);

  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const updateOrgSettings = useUpdateOrgSettings();

  function getGoalReasonForModule(module: string): string {
    const matchingGoals = goals.filter((g) => GOAL_MODULES[g]?.includes(module));
    if (matchingGoals.length === 0) return industry;
    return matchingGoals.map((g) => GOAL_LABELS[g] ?? g).join(", ");
  }

  function toggleSkip(module: string) {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  }

  const installed = recommended.filter((m) => !skipped.has(m));

  async function handleContinue() {
    try {
      if (installed.length > 0) {
        await updateOrgSettings.mutateAsync({ enabledModules: installed });
      }
      onNext(installed);
    } catch {
      toast.error("Failed to save module selection. Continuing anyway.");
      onNext(installed);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold">Recommended modules</h2>
        <p className="text-sm text-muted-foreground">
          Based on your goals, we recommend the following modules. Toggle to skip any.
        </p>
      </div>

      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {recommended.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No specific modules recommended. You can add modules later from Settings.
          </div>
        ) : (
          recommended.map((module) => {
            const info = MODULE_INFO[module];
            if (!info) return null;
            const Icon = info.icon;
            const isInstalled = !skipped.has(module);
            return (
              <div
                key={module}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border transition-all duration-150",
                  isInstalled
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-card opacity-60",
                )}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{info.label}</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                      WHY: {getGoalReasonForModule(module)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
                </div>
                <Button
                  type="button"
                  variant={isInstalled ? "outline" : "ghost"}
                  size="sm"
                  onClick={() => toggleSkip(module)}
                  className="shrink-0 text-xs h-7"
                >
                  {isInstalled ? "Skip" : "Install"}
                </Button>
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={updateOrgSettings.isPending}
          className="flex-1"
        >
          {updateOrgSettings.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : null}
          Continue with {installed.length} selected
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
