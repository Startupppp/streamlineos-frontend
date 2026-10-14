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
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventDetailActionsProps {
  showMeeting: boolean;
  showHuddle: boolean;
  huddleHref: string | null;
  canExport: boolean;
  canMutate: boolean;
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

export function EventDetailActions({
  showMeeting,
  showHuddle,
  huddleHref,
  canExport,
  canMutate,
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
    <div className="mt-auto shrink-0 space-y-2 border-t border-border/60 bg-muted px-3 py-3">
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
        <div className="grid grid-cols-2 gap-2">
          {canMutate ? (
            <Button variant="outline" className="bg-card dark:border-background" onClick={onEdit}>
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : null}
          {canExport ? (
            <Button
              variant="outline"
              className="bg-card dark:border-background"
              onClick={onExport}
              aria-label="Export this day's events as CSV"
            >
              <Download className="size-4" />
              Export day
            </Button>
          ) : null}
          {canMutate ? (
            <Button
              variant="outline"
              className="bg-card text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-background"
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          ) : null}
          {showCancelOccurrence ? (
            <Button
              variant="outline"
              className="col-span-2 bg-card dark:border-background"
              onClick={onCancelOccurrence}
            >
              <CalendarX2 className="size-4" />
              Cancel occurrence
            </Button>
          ) : null}
          {showProtect ? (
            <Button variant="outline" className="col-span-2 bg-card dark:border-background" onClick={onProtect}>
              <Shield className="size-4" />
              Protect time
            </Button>
          ) : null}
          {showRadar ? (
            <Button variant="outline" className="col-span-2 bg-card dark:border-background" onClick={onRadar}>
              <Radar className="size-4" />
              Commitment radar
            </Button>
          ) : null}
        </div>
      ) : null}
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
