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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHuddleAccounts, useSetHuddleDefault } from "@/hooks/api/chat-huddles";
import type { HuddleAccount } from "@/hooks/api/chat-schema";
import { providerDisplayName } from "@/features/chat/huddle-provider";

interface HuddleAccountPickerProps {
  onStart: (connectionId?: number) => void;
  disabled?: boolean;
  className?: string;
  iconSize?: number;
  iconClassName?: string;
  label?: string;
}

function accountName(account: HuddleAccount): string {
  return `${providerDisplayName(account.provider)} · ${account.label}`;
}

function StartWithAccountItem({
  account,
  onStart,
}: {
  account: HuddleAccount;
  onStart: (connectionId?: number) => void;
}) {
  function handleSelect() {
    onStart(account.connectionId);
  }
  return (
    <DropdownMenuItem onSelect={handleSelect} disabled={account.status !== "active"}>
      Start with {accountName(account)}
      {account.isDefault ? <span className="ml-1 text-muted-foreground">(chat default)</span> : null}
    </DropdownMenuItem>
  );
}

function MakeDefaultItem({
  account,
  onMakeDefault,
  pending,
}: {
  account: HuddleAccount;
  onMakeDefault: (connectionId: number) => void;
  pending: boolean;
}) {
  function handleSelect() {
    onMakeDefault(account.connectionId);
  }
  return (
    <DropdownMenuItem onSelect={handleSelect} disabled={pending || account.status !== "active"}>
      Use {accountName(account)}
    </DropdownMenuItem>
  );
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
  const setDefault = useSetHuddleDefault();
  const accounts = data?.accounts ?? [];
  const hasMultiple = accounts.length > 1;
  const ariaLabel = "Start huddle";
  const nonDefault = accounts.filter((account) => !account.isDefault);

  function handleStartSingle() {
    onStart(accounts[0]?.connectionId);
  }

  function handleMakeDefault(connectionId: number) {
    setDefault.mutate({ connectionId });
  }

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
        onClick={handleStartSingle}
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
          <StartWithAccountItem key={account.connectionId} account={account} onStart={onStart} />
        ))}
        {nonDefault.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Chat default account</DropdownMenuLabel>
            {nonDefault.map((account) => (
              <MakeDefaultItem
                key={account.connectionId}
                account={account}
                onMakeDefault={handleMakeDefault}
                pending={setDefault.isPending}
              />
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
