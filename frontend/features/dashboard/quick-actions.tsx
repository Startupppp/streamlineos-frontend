"use client";

import { memo, useMemo, useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMotionVariants } from "@/lib/motion-variants";
import {
  UserPlus,
  BarChart3,
  CalendarDays,
  Contact2,
  Clock,
  Briefcase,
  CheckSquare,
  Network,
  Pin,
  PinOff,
} from "lucide-react";
import { useDashboardAccess } from "@/features/dashboard/use-dashboard-access";
import {
  orgScopedStorageKey,
  useOrgStorageScope,
} from "@/lib/org-scoped-storage";

const PINS_STORAGE_NAME = "home-quick-action-pins";
const RECENTS_STORAGE_NAME = "home-quick-action-recents";
const MAX_QUICK_ACTIONS = 5;
const RECENTS_LIMIT = 8;
const RECENCY_BOOST = 20;
const EMPTY_STRINGS: readonly string[] = [];

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  baseScore: number;
}

interface QuickActionItem extends QuickAction {
  isPinned: boolean;
  score: number;
}

function parseStringArray(raw: unknown): readonly string[] {
  if (!Array.isArray(raw)) return EMPTY_STRINGS;
  return raw.filter((s): s is string => typeof s === "string");
}

function readStrings(storageKey: string): readonly string[] {
  if (typeof window === "undefined") return EMPTY_STRINGS;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) return EMPTY_STRINGS;
    return parseStringArray(JSON.parse(raw));
  } catch {
    return EMPTY_STRINGS;
  }
}

function writeStrings(storageKey: string, next: readonly string[]): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    /* ignore storage errors */
  }
}

function useStoredStrings(name: string): {
  value: readonly string[];
  write: (next: readonly string[]) => void;
} {
  const scope = useOrgStorageScope();
  const storageKey = orgScopedStorageKey(name, scope);
  const prevKeyRef = useRef(storageKey);

  const [value, setValue] = useState<readonly string[]>(() =>
    readStrings(storageKey),
  );

  useEffect(() => {
    if (prevKeyRef.current === storageKey) return;
    prevKeyRef.current = storageKey;
    setValue(readStrings(storageKey));
  }, [storageKey]);

  const write = useCallback(
    (next: readonly string[]) => {
      writeStrings(storageKey, next);
      setValue(next);
    },
    [storageKey],
  );

  return { value, write };
}

export function useQuickActions(): {
  actions: QuickActionItem[];
  togglePin: (label: string) => void;
  recordRecent: (label: string) => void;
} {
  const access = useDashboardAccess();
  const { value: pinnedLabels, write: writePins } =
    useStoredStrings(PINS_STORAGE_NAME);
  const { value: recentLabels, write: writeRecents } =
    useStoredStrings(RECENTS_STORAGE_NAME);

  const isAdmin = access.canCreateEmployees;

  const rawActions = useMemo((): QuickAction[] => {
    const items: QuickAction[] = [];
    if (access.projectsEnabled && access.canViewTickets) {
      items.push({
        label: "Projects",
        icon: Briefcase,
        href: "/build",
        baseScore: 5,
      });
    }
    if (access.hrEnabled && access.canCreateEmployees) {
      items.push({
        label: "Add Employee",
        icon: UserPlus,
        href: "/hr/onboarding",
        baseScore: isAdmin ? 10 : 2,
      });
    }
    if (access.crmEnabled && access.canViewCrmLeads) {
      items.push({
        label: "My Leads",
        icon: Contact2,
        href: "/crm/leads",
        baseScore: isAdmin ? 3 : 8,
      });
    }
    if (access.crmEnabled && access.canViewCrmReports) {
      items.push({
        label: "CRM Reports",
        icon: BarChart3,
        href: "/crm/reports",
        baseScore: isAdmin ? 9 : 1,
      });
    }
    if (access.hrEnabled && access.canViewAttendance) {
      items.push({
        label: "Team Schedule",
        icon: CalendarDays,
        href: "/hr/attendance",
        baseScore: isAdmin ? 7 : 4,
      });
    }
    if (access.hrEnabled && access.canViewEmployees) {
      items.push({
        label: "Org Chart",
        icon: Network,
        href: "/hr/org-chart",
        baseScore: isAdmin ? 8 : 3,
      });
    }
    if (access.projectsEnabled) {
      items.push({
        label: "My Tasks",
        icon: CheckSquare,
        href: "/build/my-work",
        baseScore: isAdmin ? 4 : 7,
      });
    }
    if (access.hrEnabled && !access.canViewAttendance) {
      items.push({
        label: "Check In",
        icon: Clock,
        href: "/me/attendance",
        baseScore: isAdmin ? 2 : 6,
      });
    }
    return items;
  }, [access, isAdmin]);

  const recentSet = useMemo(() => new Set(recentLabels), [recentLabels]);
  const pinnedSet = useMemo(() => new Set(pinnedLabels), [pinnedLabels]);

  const actions = useMemo((): QuickActionItem[] => {
    const withScores: QuickActionItem[] = rawActions.map((action) => ({
      ...action,
      isPinned: pinnedSet.has(action.label),
      score:
        action.baseScore + (recentSet.has(action.label) ? RECENCY_BOOST : 0),
    }));

    const pinned = withScores.filter((a) => a.isPinned);
    const unpinned = withScores
      .filter((a) => !a.isPinned)
      .sort((a, b) => b.score - a.score);

    const remainingSlots = Math.max(0, MAX_QUICK_ACTIONS - pinned.length);
    return [...pinned, ...unpinned.slice(0, remainingSlots)];
  }, [rawActions, pinnedSet, recentSet]);

  const togglePin = useCallback(
    (label: string) => {
      if (pinnedLabels.includes(label)) {
        writePins(pinnedLabels.filter((l) => l !== label));
      } else {
        writePins([...pinnedLabels, label]);
      }
    },
    [pinnedLabels, writePins],
  );

  const recordRecent = useCallback(
    (label: string) => {
      const filtered = recentLabels.filter((l) => l !== label);
      writeRecents([label, ...filtered].slice(0, RECENTS_LIMIT));
    },
    [recentLabels, writeRecents],
  );

  return { actions, togglePin, recordRecent };
}

interface QuickActionCardProps {
  action: QuickActionItem;
  onTogglePin: (label: string) => void;
  onNavigate: (label: string) => void;
}

function QuickActionCard({
  action,
  onTogglePin,
  onNavigate,
}: QuickActionCardProps) {
  const { fadeUp } = useMotionVariants();
  const ActionIcon = action.icon;

  function handleTogglePin() {
    onTogglePin(action.label);
  }

  function handleNavigate() {
    onNavigate(action.label);
  }

  return (
    <motion.div
      variants={fadeUp}
      className="group relative min-w-[min(100%,11rem)] shrink-0 snap-start sm:min-w-0 sm:shrink"
    >
      <Link
        href={action.href}
        aria-label={action.label}
        onClick={handleNavigate}
      >
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-noir transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:bg-primary/5 cursor-pointer">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
            <ActionIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {action.label}
          </span>
        </div>
      </Link>
      <button
        type="button"
        aria-label={
          action.isPinned ? `Unpin ${action.label}` : `Pin ${action.label}`
        }
        onClick={handleTogglePin}
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 focus:opacity-100"
      >
        {action.isPinned ? (
          <PinOff className="h-3 w-3" aria-hidden="true" />
        ) : (
          <Pin className="h-3 w-3" aria-hidden="true" />
        )}
      </button>
    </motion.div>
  );
}

export const QuickActions = memo(function QuickActions() {
  const { actions, togglePin, recordRecent } = useQuickActions();

  if (actions.length === 0) return null;

  return (
    <div
      className={`flex min-w-0 gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory pb-1 scrollbar-hide sm:grid sm:overflow-visible sm:pb-0 ${actions.length >= 5 ? "sm:grid-cols-5" : actions.length >= 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
    >
      {actions.map((action) => (
        <QuickActionCard
          key={action.label}
          action={action}
          onTogglePin={togglePin}
          onNavigate={recordRecent}
        />
      ))}
    </div>
  );
});
