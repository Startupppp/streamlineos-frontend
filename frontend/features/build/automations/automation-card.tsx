"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { ChevronRightIcon, Trash2Icon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import {
  TRIGGER_EVENTS,
  ACTION_TYPES,
  type ProjectAutomation,
} from "@/hooks/api/build/automations";
import { PM_PANEL } from "@/features/build/shared/pm-chrome";

function getTriggerLabel(event: string): string {
  return TRIGGER_EVENTS.find((t) => t.value === event)?.label ?? event;
}

function getActionLabel(type: string): string {
  return ACTION_TYPES.find((a) => a.value === type)?.label ?? type;
}

export interface AutomationCardProps {
  automation: ProjectAutomation;
  onToggle: (id: number, isActive: boolean) => void;
  onDelete: (id: number) => void;
  onEdit: (automation: ProjectAutomation) => void;
}

export function AutomationCard({ automation, onToggle, onDelete, onEdit }: AutomationCardProps) {
  const { iconRef: editIconRef, hoverHandlers: editHoverHandlers } = useAnimatedIcon();

  const handleSwitchChange = useCallback(
    (v: boolean) => onToggle(automation.id, v),
    [automation.id, onToggle],
  );
  const handleEdit = useCallback(() => onEdit(automation), [automation, onEdit]);
  const handleDeleteAutomation = useCallback(
    () => onDelete(automation.id),
    [automation.id, onDelete],
  );

  return (
    <motion.div
      layout
      className={cn(
        PM_PANEL,
        "p-4 transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-md",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "relative h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
            automation.isActive
              ? "bg-primary/10 border border-primary/20"
              : "bg-muted border border-border",
          )}
        >
          <Zap
            className={cn(
              "h-4 w-4",
              automation.isActive ? "text-primary" : "text-muted-foreground",
            )}
          />
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
              automation.isActive ? "bg-status-success-fill" : "bg-muted-foreground/40",
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <TruncatedText
              text={automation.name}
              className="text-sm font-semibold text-foreground"
            />
            <Badge
              variant="secondary"
              className="text-micro bg-muted text-muted-foreground border-border shrink-0"
            >
              {getTriggerLabel(automation.triggerEvent)}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            {automation.conditions.length > 0 && (
              <span>
                {automation.conditions.length} condition
                {automation.conditions.length > 1 ? "s" : ""}
              </span>
            )}
            <span>
              {automation.actions.length} action{automation.actions.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {automation.actions.map((a, i) => (
              <Badge key={i} variant="outline" className="text-micro px-1.5 py-0">
                {getActionLabel(a.type)}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={automation.isActive}
            onCheckedChange={handleSwitchChange}
            aria-label={automation.isActive ? "Deactivate" : "Activate"}
          />
          <Button
            variant="ghost"
            size="icon"
            className="w-7"
            onClick={handleEdit}
            {...editHoverHandlers}
          >
            <ChevronRightIcon ref={editIconRef} size={14} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <AnimatedIconButton
                variant="ghost"
                size="icon"
                className="w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                icon={Trash2Icon}
                iconSize={14}
              />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete automation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This rule will stop running immediately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAutomation}
                  variant="destructive"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.div>
  );
}
