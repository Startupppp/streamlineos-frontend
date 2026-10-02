"use client";

import { LogIn, LogOut, Pause, Play } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PRIMARY_BUTTON_CLASS = "min-h-11 w-full gap-1.5 font-semibold";

export interface TimerCardActionsProps {
  isActive: boolean;
  isOnBreak: boolean;
  isInCooldown: boolean;
  isBlockedDay: boolean;
  blockedReason: string | null;
  cooldownLabel: string;
  isCheckingIn: boolean;
  isCheckingOut: boolean;
  isTogglingBreak: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onBreakToggle: () => void;
}

export function TimerCardActions({
  isActive,
  isOnBreak,
  isInCooldown,
  isBlockedDay,
  blockedReason,
  cooldownLabel,
  isCheckingIn,
  isCheckingOut,
  isTogglingBreak,
  onCheckIn,
  onCheckOut,
  onBreakToggle,
}: TimerCardActionsProps) {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        {!isActive ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <LoadingButton
                onClick={onCheckIn}
                disabled={isInCooldown || isBlockedDay || isCheckingOut}
                isPending={isCheckingIn}
                className={PRIMARY_BUTTON_CLASS}
              >
                <LogIn className="h-4 w-4 text-current" />
                {isInCooldown ? `Wait ${cooldownLabel}` : "Clock in"}
              </LoadingButton>
            </TooltipTrigger>
            {isBlockedDay ? <TooltipContent>{blockedReason}</TooltipContent> : null}
          </Tooltip>
        ) : null}

        {!isActive && isBlockedDay ? (
          <div className="flex flex-col gap-1.5">
            <LoadingButton
              type="button"
              variant="outline"
              onClick={onCheckIn}
              isPending={isCheckingIn}
              className="min-h-11 w-full"
            >
              Clock in anyway
            </LoadingButton>
            <a
              href="/hr/shifts"
              className="text-center text-xs text-primary underline-offset-2 hover:underline"
            >
              Assign a shift for today
            </a>
          </div>
        ) : null}

        {isActive && !isOnBreak ? (
          <>
            <LoadingButton
              onClick={onCheckOut}
              disabled={isBlockedDay || isCheckingIn}
              isPending={isCheckingOut}
              className={`${PRIMARY_BUTTON_CLASS} bg-status-danger-fill text-white hover:bg-status-danger-fill-hover`}
            >
              <LogOut className="h-4 w-4 text-current" />
              Clock out
            </LoadingButton>
            <LoadingButton
              variant="outline"
              onClick={onBreakToggle}
              disabled={isBlockedDay}
              isPending={isTogglingBreak}
              className="min-h-11 w-full gap-1.5 border-status-warning-rule text-status-warning-ink hover:bg-status-warning-surface hover:text-status-warning-ink"
            >
              <Pause className="h-4 w-4 text-current" />
              Take break
            </LoadingButton>
          </>
        ) : null}

        {isOnBreak ? (
          <>
            <LoadingButton
              onClick={onBreakToggle}
              disabled={isBlockedDay}
              isPending={isTogglingBreak}
              className={`${PRIMARY_BUTTON_CLASS} bg-status-warning-fill text-white hover:bg-status-warning-fill-hover`}
            >
              <Play className="h-4 w-4 text-current" />
              Resume work
            </LoadingButton>
            <LoadingButton
              variant="outline"
              onClick={onCheckOut}
              disabled={isBlockedDay || isCheckingIn}
              isPending={isCheckingOut}
              className="min-h-11 w-full gap-1.5"
            >
              <LogOut className="h-4 w-4 text-current" />
              Clock out
            </LoadingButton>
          </>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
