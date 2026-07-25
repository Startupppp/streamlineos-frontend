"use client";

import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Pencil, RotateCcw } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { Holiday } from "@/hooks/api/hr/holidays";

interface HolidayItemProps {
  holiday: Holiday;
  canManage: boolean;
  onEdit: (h: Holiday) => void;
  onDelete: (id: string) => void;
}

export function HolidayItem({ holiday, canManage, onEdit, onDelete }: HolidayItemProps) {
  function handleEditClick() {
    onEdit(holiday);
  }
  function handleDeleteClick() {
    onDelete(holiday.id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 shadow-sm"
    >
      <div className="bg-muted rounded-md px-2.5 py-1.5 text-center min-w-[48px]">
        <p className="text-xs font-medium text-muted-foreground">{format(parseISO(holiday.date), "MMM")}</p>
        <p className="text-lg font-bold text-foreground leading-none">{format(parseISO(holiday.date), "d")}</p>
      </div>
      <div className="flex-1 min-w-0">
        <TruncatedText text={holiday.name} className="font-medium text-foreground" />
        <p className="text-xs text-muted-foreground">{format(parseISO(holiday.date), "EEEE, MMMM d")}</p>
      </div>
      {holiday.recurring && (
        <Badge variant="secondary" className="shrink-0 text-xs">
          <RotateCcw className="h-3 w-3 mr-1" /> Recurring
        </Badge>
      )}
      {canManage && (
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="w-7" aria-label={`Edit ${holiday.name}`} onClick={handleEditClick}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AnimatedIconButton
            icon={Trash2Icon}
            variant="ghost"
            size="icon"
            className="w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
            iconSize={14}
            aria-label={`Delete ${holiday.name}`}
            onClick={handleDeleteClick}
          />
        </div>
      )}
    </motion.div>
  );
}
