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
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useOrgSettings } from "@/hooks/api/organization";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "ws_checklist_dismissed";
const DONE_KEY = "ws_checklist_done";
const TOTAL = 5;
const RING_RADIUS = 24;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const SPRING_SNAPPY = { type: "spring" as const, stiffness: 400, damping: 22 };
const SPRING_BOUNCE = { type: "spring" as const, stiffness: 400, damping: 18 };
const PANEL_EASE = { duration: 0.22, ease: "easeOut" as const };

const fabEntrance = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.85 },
  transition: SPRING_SNAPPY,
};

const panelTransition = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: PANEL_EASE,
};

const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: 12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: PANEL_EASE,
  },
};

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
    <motion.div
      variants={rowVariants}
      className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted/50 transition-colors"
    >
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
    </motion.div>
  );
}

interface ProgressBadgeProps {
  doneCount: number;
  total: number;
}

function ProgressBadge({ doneCount, total }: ProgressBadgeProps) {
  return (
    <motion.span
      key={doneCount}
      initial={{ scale: 1.35, opacity: 0.7 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={SPRING_BOUNCE}
      className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-0.5 rounded-full bg-background border border-border text-[10px] font-semibold text-foreground flex items-center justify-center leading-none tabular-nums"
      aria-hidden="true"
    >
      {doneCount}/{total}
    </motion.span>
  );
}

interface FabProgressRingProps {
  progressFraction: number;
}

function FabProgressRing({ progressFraction }: FabProgressRingProps) {
  const offset = RING_CIRCUMFERENCE * (1 - progressFraction);

  return (
    <svg
      className="absolute -inset-1 h-14 w-14 -rotate-90 pointer-events-none"
      viewBox="0 0 56 56"
      aria-hidden="true"
    >
      <circle
        cx="28"
        cy="28"
        r={RING_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-primary/20"
      />
      <motion.circle
        cx="28"
        cy="28"
        r={RING_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-primary-foreground/80"
        strokeDasharray={RING_CIRCUMFERENCE}
        initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
        animate={{ strokeDashoffset: offset }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      />
    </svg>
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
  const progressFraction = doneCount / TOTAL;
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

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence mode="wait">
        {collapsed ? (
          <motion.div
            key="checklist-fab"
            className="relative"
            {...fabEntrance}
          >
            <FabProgressRing progressFraction={progressFraction} />
            <motion.button
              type="button"
              onClick={handleToggleCollapse}
              aria-label="Open getting started checklist"
              initial={false}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 10px 28px -4px rgba(0, 0, 0, 0.22), 0 4px 12px -2px rgba(0, 0, 0, 0.12)",
              }}
              whileTap={{ scale: 0.97 }}
              animate={
                allDone
                  ? { boxShadow: "0 8px 24px -4px rgba(124, 58, 237, 0.45)" }
                  : { boxShadow: "0 4px 14px -2px rgba(0, 0, 0, 0.15)" }
              }
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
              className="relative h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <motion.span
                animate={allDone ? { rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] } : { rotate: 0, scale: 1 }}
                transition={allDone ? { duration: 0.5, ease: "easeOut" } : { duration: 0.2 }}
              >
                <CheckCircle2 className="h-5 w-5" />
              </motion.span>
              <ProgressBadge doneCount={doneCount} total={TOTAL} />
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="checklist-panel"
            className="w-72 origin-bottom-right"
            {...panelTransition}
          >
            <Card className="shadow-lg overflow-hidden">
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate">Getting Started</span>
                    <motion.span
                      key={doneCount}
                      initial={{ scale: 1.2, opacity: 0.6 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={SPRING_BOUNCE}
                      className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums"
                    >
                      {doneCount}/{TOTAL}
                    </motion.span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <motion.button
                      type="button"
                      onClick={handleToggleCollapse}
                      aria-label="Collapse checklist"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.97 }}
                      className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={handleDismiss}
                      aria-label="Dismiss checklist"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.97 }}
                      className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    >
                      <X className="h-3.5 w-3.5" />
                    </motion.button>
                  </div>
                </div>
                <Progress
                  value={progress}
                  className="h-1.5 mt-2"
                  aria-label={`${doneCount} of ${TOTAL} tasks completed`}
                />
              </div>

              <div className="px-3 pb-3 space-y-0.5">
                <AnimatePresence mode="wait">
                  {allDone ? (
                    <motion.div
                      key="all-done"
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={SPRING_BOUNCE}
                      className="py-4 text-center"
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ ...SPRING_BOUNCE, delay: 0.05 }}
                      >
                        <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
                      </motion.div>
                      <p className="text-sm font-medium text-foreground">All done! 🎉</p>
                      <p className="text-xs text-muted-foreground mt-0.5">You&apos;re all set to go!</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="checklist-items"
                      variants={listVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0 }}
                      className="space-y-0.5"
                    >
                      {CHECKLIST_ITEMS.map((item) => (
                        <ChecklistRow
                          key={item.id}
                          item={item}
                          done={completed.has(item.id)}
                          onToggle={handleToggleItem}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
