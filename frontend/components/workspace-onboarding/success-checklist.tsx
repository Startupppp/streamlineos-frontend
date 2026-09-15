"use client";

import { useState, useCallback, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSession } from "next-auth/react";
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
import { useAccess } from "@/hooks/api/access";
import {
  useWorkspaceChecklistProgress,
  type ChecklistItemId,
} from "@/hooks/common/use-workspace-checklist-progress";
import { cn } from "@/lib/utils";
import { ChecklistErrorBoundary } from "./checklist-error-boundary";

const MOBILE_HEADER_SLOT_ID = "mobile-header-checklist-slot";

function dismissedKey(orgId: string): string {
  return `ws_checklist_dismissed_${orgId}`;
}

const dismissListeners = new Set<() => void>();

function readDismissed(orgId: string | null | undefined): boolean {
  if (!orgId) return false;
  try {
    const legacy = localStorage.getItem("ws_checklist_dismissed") === "true";
    const scoped = localStorage.getItem(dismissedKey(orgId)) === "true";
    return legacy || scoped;
  } catch {
    return false;
  }
}

function subscribeDismissed(callback: () => void): () => void {
  dismissListeners.add(callback);
  return () => {
    dismissListeners.delete(callback);
  };
}

function persistDismissed(orgId: string | null | undefined): void {
  if (!orgId) return;
  try {
    localStorage.setItem(dismissedKey(orgId), "true");
    localStorage.removeItem("ws_checklist_dismissed");
  } catch {
    return;
  }
  dismissListeners.forEach((listener) => listener());
}

const TOTAL = 5;
const RING_RADIUS = 18;
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
  id: ChecklistItemId;
  label: string;
  href: string;
  Icon: LucideIcon;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: "invite", label: "Invite your first teammate", href: "/settings/users", Icon: Users },
  { id: "record", label: "Create your first record", href: "/crm/leads", Icon: Database },
  { id: "email", label: "Connect your calendar", href: "/calendar", Icon: Mail },
  { id: "profile", label: "Complete your profile", href: "/settings", Icon: UserCircle },
  { id: "ai", label: "Try the AI Assistant", href: "/dashboard", Icon: Sparkles },
];

interface ChecklistRowProps {
  item: ChecklistItem;
  done: boolean;
}

function ChecklistRow({ item, done }: ChecklistRowProps) {
  const { label, href, Icon } = item;

  return (
    <motion.div variants={rowVariants}>
      <Link
        href={href}
        className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted/50 transition-colors group"
      >
        <span
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors",
            done
              ? "bg-primary border-primary text-primary-foreground"
              : "border-border bg-background group-hover:border-primary",
          )}
        >
          {done && <Check className="h-2.5 w-2.5" />}
        </span>
        <Icon className={cn("h-3.5 w-3.5 shrink-0", done ? "text-muted-foreground" : "text-foreground")} />
        <span
          className={cn(
            "text-xs flex-1 truncate transition-colors group-hover:text-primary",
            done ? "line-through text-muted-foreground" : "text-foreground",
          )}
        >
          {label}
        </span>
      </Link>
    </motion.div>
  );
}

interface ProgressBadgeProps {
  doneCount: number;
  total: number;
  compact?: boolean;
}

function ProgressBadge({ doneCount, total, compact = false }: ProgressBadgeProps) {
  return (
    <motion.span
      key={doneCount}
      initial={{ scale: 1.35, opacity: 0.7 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={SPRING_BOUNCE}
      className={cn(
        "absolute rounded-full bg-background border border-border font-semibold text-foreground flex items-center justify-center leading-none tabular-nums",
        compact
          ? "-top-1 -right-1 h-4 min-w-4 px-0.5 text-micro"
          : "-top-1.5 -right-1.5 h-5 min-w-5 px-0.5 text-micro",
      )}
      aria-hidden="true"
    >
      {doneCount}/{total}
    </motion.span>
  );
}

interface ChecklistPanelProps {
  doneCount: number;
  progress: number;
  completed: Set<ChecklistItemId>;
  onCollapse: () => void;
  onDismiss: () => void;
}

function ChecklistPanel({
  doneCount,
  progress,
  completed,
  onCollapse,
  onDismiss,
}: ChecklistPanelProps) {
  return (
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
              onClick={onCollapse}
              aria-label="Collapse checklist"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.97 }}
              className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.button>
            <motion.button
              type="button"
              onClick={onDismiss}
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
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="space-y-0.5"
        >
          {CHECKLIST_ITEMS.map((item) => (
            <ChecklistRow
              key={item.id}
              item={item}
              done={completed.has(item.id)}
            />
          ))}
        </motion.div>
      </div>
    </Card>
  );
}

interface FabProgressRingProps {
  progressFraction: number;
}

function FabProgressRing({ progressFraction }: FabProgressRingProps) {
  const offset = RING_CIRCUMFERENCE * (1 - progressFraction);

  return (
    <svg
      className="absolute -inset-1 h-11 w-11 -rotate-90 pointer-events-none"
      viewBox="0 0 44 44"
      aria-hidden="true"
    >
      <circle
        cx="22"
        cy="22"
        r={RING_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-primary/20"
      />
      <motion.circle
        cx="22"
        cy="22"
        r={RING_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
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

function SuccessChecklistInner() {
  const { data: session } = useSession();
  const { data: access } = useAccess();
  const orgId = session?.orgId;
  const canSetUpWorkspace =
    access?.isOrgOwner === true;
  const { data: org } = useOrgSettings({ enabled: canSetUpWorkspace });
  const storedDismissed = useSyncExternalStore(
    subscribeDismissed,
    () => readDismissed(orgId),
    () => false,
  );
  const onboardingCompleted = Boolean(org?.onboardingCompletedAt);
  const shouldTrackProgress =
    canSetUpWorkspace && !storedDismissed && onboardingCompleted;
  const [progressRequested, setProgressRequested] = useState(false);
  const { completed, doneCount, isLoading } =
    useWorkspaceChecklistProgress(shouldTrackProgress && progressRequested);
  const [collapsedChoice, setCollapsedChoice] = useState<boolean | null>(null);
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const collapsed = collapsedChoice ?? true;

  const progress = Math.round((doneCount / TOTAL) * 100);
  const progressFraction = doneCount / TOTAL;
  const allDone = doneCount >= TOTAL;
  const dismissed = storedDismissed || allDone;
  const isActive =
    canSetUpWorkspace &&
    onboardingCompleted &&
    !dismissed &&
    !isLoading &&
    !allDone;

  useEffect(() => {
    if (allDone && orgId && !storedDismissed) persistDismissed(orgId);
  }, [allDone, orgId, storedDismissed]);

  useEffect(() => {
    if (!isActive) {
      setHeaderSlot(null);
      return;
    }
    setHeaderSlot(document.getElementById(MOBILE_HEADER_SLOT_ID));
  }, [isActive]);

  const handleDismiss = useCallback(() => {
    persistDismissed(orgId);
  }, [orgId]);

  const handleToggleCollapse = useCallback(() => {
    setCollapsedChoice((prev) => {
      const next = !(prev ?? true);
      if (!next) setProgressRequested(true);
      return next;
    });
  }, []);

  if (!isActive) return null;

  const panelProps: ChecklistPanelProps = {
    doneCount,
    progress,
    completed,
    onCollapse: handleToggleCollapse,
    onDismiss: handleDismiss,
  };

  const mobileHeaderUi =
    headerSlot &&
    createPortal(
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={handleToggleCollapse}
          aria-label={collapsed ? "Open getting started checklist" : "Collapse checklist"}
          aria-expanded={!collapsed}
          className="relative size-8 rounded-lg flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CheckCircle2 className="h-4 w-4" />
          {progressRequested && !isLoading ? (
            <ProgressBadge doneCount={doneCount} total={TOTAL} />
          ) : null}
        </button>
        <AnimatePresence>
          {!collapsed ? (
            <motion.div
              key="checklist-panel-mobile"
              className="absolute top-full right-0 mt-2 z-50 w-[min(20rem,calc(100vw-1.5rem))] origin-top-right"
              {...panelTransition}
            >
              <ChecklistPanel {...panelProps} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>,
      headerSlot,
    );

  return (
    <>
      {mobileHeaderUi}
      <div className="fixed z-50 bottom-4 right-4 hidden md:block">
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
                className="relative h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <motion.span
                  animate={allDone ? { rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] } : { rotate: 0, scale: 1 }}
                  transition={allDone ? { duration: 0.5, ease: "easeOut" } : { duration: 0.2 }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </motion.span>
                {progressRequested && !isLoading ? (
                  <ProgressBadge doneCount={doneCount} total={TOTAL} compact />
                ) : null}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="checklist-panel"
              className="w-72 origin-bottom-right"
              {...panelTransition}
            >
              <ChecklistPanel {...panelProps} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export function SuccessChecklist() {
  return (
    <ChecklistErrorBoundary>
      <SuccessChecklistInner />
    </ChecklistErrorBoundary>
  );
}
