"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarX2,
  Download,
  Mic,
  Pencil,
  Radar,
  Shield,
  Sparkles,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EventDetailActionsProps {
  showMeeting: boolean;
  showHuddle: boolean;
  huddleHref: string | null;
  canExport: boolean;
  canMutate: boolean;
  mutatePending?: boolean;
  showCancelOccurrence: boolean;
  showProtect: boolean;
  showRadar: boolean;
  onClose: () => void;
  onDelete: () => void;
  onCancelOccurrence: () => void;
  onMeeting: () => void;
  onExport: () => void;
  onEdit: () => void;
  onProtect: () => void;
  onRadar: () => void;
}

const DOCK_EASE = [0.22, 1, 0.36, 1] as const;

const TILE_TONE = {
  default: "bg-muted text-foreground",
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-status-warning-surface text-status-warning-ink",
} as const;

interface ActionTool {
  key: string;
  icon: LucideIcon;
  label: string;
  ariaLabel?: string;
  onClick: () => void;
  tone: keyof typeof TILE_TONE;
  disabled?: boolean;
}

export function EventDetailActions({
  showMeeting,
  showHuddle,
  huddleHref,
  canExport,
  canMutate,
  mutatePending = false,
  showCancelOccurrence,
  showProtect,
  showRadar,
  onClose,
  onDelete,
  onCancelOccurrence,
  onMeeting,
  onExport,
  onEdit,
  onProtect,
  onRadar,
}: EventDetailActionsProps) {
  const reduceMotion = useReducedMotion() === true;
  const hasTools =
    canExport || canMutate || showCancelOccurrence || showProtect || showRadar;
  if (!showMeeting && !showHuddle && !hasTools) return null;

  return (
    <div className="w-full space-y-2">
      {showHuddle && huddleHref ? (
        <Link
          href={huddleHref}
          onClick={onClose}
          className="group flex w-full items-center gap-3 rounded-xl bg-status-warning-fill px-3 py-2.5 text-white transition-transform duration-200 hover:bg-status-warning-fill-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-none"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
            <Mic className="size-4" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium">Join Huddle</span>
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" />
        </Link>
      ) : null}
      {showMeeting ? (
        <MeetingDock onClick={onMeeting} reduceMotion={reduceMotion} />
      ) : null}
      {hasTools ? (
        <ActionGrid
          tools={(
            [
              canMutate
                ? { key: "edit", icon: Pencil, label: "Edit", onClick: onEdit, tone: "default", disabled: mutatePending }
                : null,
              canExport
                ? {
                    key: "export",
                    icon: Download,
                    label: "Export day",
                    ariaLabel: "Export this day's events as CSV",
                    onClick: onExport,
                    tone: "default",
                  }
                : null,
              canMutate
                ? { key: "delete", icon: Trash2, label: "Delete", onClick: onDelete, tone: "danger", disabled: mutatePending }
                : null,
              showCancelOccurrence
                ? {
                    key: "cancel",
                    icon: CalendarX2,
                    label: "Cancel occurrence",
                    onClick: onCancelOccurrence,
                    tone: "warning",
                  }
                : null,
              showProtect
                ? { key: "protect", icon: Shield, label: "Protect time", onClick: onProtect, tone: "warning" }
                : null,
              showRadar
                ? { key: "radar", icon: Radar, label: "Commitment radar", onClick: onRadar, tone: "default" }
                : null,
            ] satisfies Array<ActionTool | null>
          ).flatMap((tool) => tool === null ? [] : [tool])}
        />
      ) : null}
    </div>
  );
}

function ActionGrid({ tools }: { tools: ActionTool[] }) {
  const lastIsWide = tools.length % 2 === 1;

  return (
    <div className="grid grid-cols-2 gap-2">
      {tools.map((tool, index) => {
        const Icon = tool.icon;
        const wide = lastIsWide && index === tools.length - 1;
        return (
          <Button
            key={tool.key}
            type="button"
            variant="ghost"
            aria-label={tool.ariaLabel}
            onClick={tool.onClick}
            disabled={tool.disabled}
            aria-busy={tool.disabled || undefined}
            className={cn(
              "h-auto justify-start gap-2.5 border border-input bg-card px-2.5 py-2 shadow-xs hover:border-primary/50 dark:border-background",
              wide && "col-span-2",
              tool.tone === "danger" &&
                "text-destructive hover:bg-destructive/10 hover:text-destructive",
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                TILE_TONE[tool.tone],
              )}
            >
              <Icon />
            </span>
            <span className="min-w-0 truncate">{tool.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

function MeetingDock({
  onClick,
  reduceMotion,
}: {
  onClick: () => void;
  reduceMotion: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl bg-primary px-3 py-2.5 text-left text-primary-foreground shadow-xs transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-none"
    >
      {reduceMotion ? null : (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-1/3 bg-primary-foreground/20"
          initial={{ x: "-130%" }}
          animate={{ x: "340%" }}
          transition={{ duration: 0.85, ease: DOCK_EASE, delay: 0.12 }}
        />
      )}
      <motion.span
        aria-hidden
        className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15"
        initial={reduceMotion ? false : { scale: 0.7, rotate: -16 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 520, damping: 28 }
        }
      >
        <Sparkles className="size-4" />
      </motion.span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-sm font-medium">Meeting workspace</span>
        <span className="block text-label font-normal text-primary-foreground">
          Prep, notes, and follow-ups
        </span>
      </span>
      <ArrowRight className="relative size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" />
    </button>
  );
}
