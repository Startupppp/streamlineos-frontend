"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ChevronDown,
  X,
  Check,
  Users,
  Database,
  Mail,
  UserCircle,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useOrgSettings } from "@/hooks/api/organization";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "ws_checklist_dismissed";
const DONE_KEY = "ws_checklist_done";
const TOTAL = 5;

interface ChecklistItem {
  id: string;
  label: string;
  href: string;
  Icon: LucideIcon;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: "invite", label: "Invite your first teammate", href: "/settings/members", Icon: Users },
  { id: "record", label: "Create your first record", href: "/dashboard", Icon: Database },
  { id: "email", label: "Connect your email", href: "/settings/integrations", Icon: Mail },
  { id: "profile", label: "Complete your profile", href: "/settings/profile", Icon: UserCircle },
  { id: "ai", label: "Try the AI Assistant", href: "/ai", Icon: Sparkles },
];

function readStorageSet(): Set<string> {
  try {
    const raw = localStorage.getItem(DONE_KEY);
    if (!raw) return new Set<string>();
    return new Set<string>(JSON.parse(raw) as string[]);
  } catch {
    return new Set<string>();
  }
}

function writeStorageSet(value: Set<string>): void {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify([...value]));
  } catch {
  }
}

interface ChecklistRowProps {
  item: ChecklistItem;
  done: boolean;
  onToggle: (id: string) => void;
}

function ChecklistRow({ item, done, onToggle }: ChecklistRowProps) {
  const { id, label, href, Icon } = item;

  const handleToggle = useCallback(() => {
    onToggle(id);
  }, [id, onToggle]);

  return (
    <div className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted/50 transition-colors">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={done ? `Mark "${label}" as incomplete` : `Mark "${label}" as complete`}
        aria-pressed={done}
        className={cn(
          "h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
          done
            ? "bg-primary border-primary text-primary-foreground"
            : "border-border bg-background hover:border-primary",
        )}
      >
        {done && <Check className="h-2.5 w-2.5" />}
      </button>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", done ? "text-muted-foreground" : "text-foreground")} />
      <Link
        href={href}
        className={cn(
          "text-xs flex-1 truncate transition-colors hover:text-primary focus-visible:outline-none focus-visible:underline",
          done ? "line-through text-muted-foreground" : "text-foreground",
        )}
      >
        {label}
      </Link>
    </div>
  );
}

export function SuccessChecklist() {
  const { data: org } = useOrgSettings();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [completed, setCompleted] = useState<Set<string>>(readStorageSet);
  const [collapsed, setCollapsed] = useState(false);

  const doneCount = completed.size;
  const progress = Math.round((doneCount / TOTAL) * 100);
  const allDone = doneCount >= TOTAL;

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
    }
    setDismissed(true);
  }, []);

  const handleToggleItem = useCallback((id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      writeStorageSet(next);
      return next;
    });
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  if (!org?.onboardingCompletedAt || dismissed) return null;

  if (collapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          type="button"
          onClick={handleToggleCollapse}
          aria-label="Open getting started checklist"
          className="relative h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <CheckCircle2 className="h-5 w-5" />
          <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-background border border-border text-[10px] font-semibold text-foreground flex items-center justify-center leading-none">
            {doneCount}/{TOTAL}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72">
      <Card className="shadow-lg overflow-hidden">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">Getting Started</span>
              <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                {doneCount}/{TOTAL}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleToggleCollapse}
                aria-label="Collapse checklist"
                className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss checklist"
                className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <Progress
            value={progress}
            className="h-1.5 mt-2"
            valueLabel={`${doneCount} of ${TOTAL} tasks completed`}
          />
        </div>

        <div className="px-3 pb-3 space-y-0.5">
          {allDone ? (
            <div className="py-4 text-center">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">All done! 🎉</p>
              <p className="text-xs text-muted-foreground mt-0.5">You&apos;re all set to go!</p>
            </div>
          ) : (
            CHECKLIST_ITEMS.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                done={completed.has(item.id)}
                onToggle={handleToggleItem}
              />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
