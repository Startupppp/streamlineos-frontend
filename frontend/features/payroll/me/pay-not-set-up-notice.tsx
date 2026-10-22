"use client";

import { Wallet } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n/i18n";

export function PayNotSetUpNotice() {
  const t = useT();
  const title = t("pay.notSetUpTitle");
  const body = t("pay.notSetUpBody");

  return (
    <div data-testid="pay-not-set-up" className="flex">
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger
            type="button"
            className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-lg border border-border/80 bg-popover px-2.5 py-1 text-left text-xs font-medium text-popover-foreground shadow-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Wallet className="size-3.5 shrink-0" aria-hidden />
            {title}
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start" className="max-w-64 text-pretty">
            {body}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
