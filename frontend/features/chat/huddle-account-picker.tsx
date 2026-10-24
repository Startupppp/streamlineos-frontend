"use client";

import { MicIcon } from "@animateicons/react/lucide";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHuddleAccounts } from "@/hooks/api/chat-huddles";
import { providerDisplayName } from "@/features/chat/huddle-provider";

interface HuddleAccountPickerProps {
  onStart: (connectionId?: number) => void;
  disabled?: boolean;
  className?: string;
  iconSize?: number;
  iconClassName?: string;
  label?: string;
}

export function HuddleAccountPicker({
  onStart,
  disabled,
  className,
  iconSize = 16,
  iconClassName = "mr-0",
  label,
}: HuddleAccountPickerProps) {
  const { data } = useHuddleAccounts();
  const accounts = data?.accounts ?? [];
  const hasMultiple = accounts.length > 1;
  const ariaLabel = "Start huddle";

  if (!hasMultiple) {
    return (
      <AnimatedIconButton
        type="button"
        icon={MicIcon}
        iconSize={iconSize}
        iconClassName={cn(iconClassName, label ? undefined : "mr-0")}
        variant="ghost"
        size={label ? "sm" : "icon"}
        className={className}
        onClick={() => onStart(accounts[0]?.connectionId)}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        {label ? <span>{label}</span> : null}
      </AnimatedIconButton>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={label ? "sm" : "icon"}
          className={cn(className, "gap-0.5")}
          disabled={disabled}
          aria-label={`${ariaLabel} — choose account`}
        >
          <MicIcon size={iconSize} />
          {label ? <span>{label}</span> : null}
          <ChevronDownIcon size={10} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {accounts.map((account) => (
          <DropdownMenuItem
            key={account.connectionId}
            onClick={() => onStart(account.connectionId)}
          >
            Start with {providerDisplayName(account.provider)} · {account.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
