"use client";

import { memo, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { INLINE_POPOVER_MIN_CLASS } from "@/components/ui/field-control";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { useCan } from "@/hooks/api/access";
import { EXCEPTION_REVIEW_KEY } from "@/hooks/api/inventory/picking";
import {
  useAssignPickException,
  type PickExceptionSummary,
} from "@/hooks/api/inventory/pick-exceptions";
import { useWarehouseRoster } from "@/features/inventory/hooks/use-warehouse-roster";

interface ExceptionOwnerCellProps {
  exception: PickExceptionSummary;
}

export const ExceptionOwnerCell = memo(function ExceptionOwnerCell({
  exception,
}: ExceptionOwnerCellProps) {
  const [open, setOpen] = useState(false);
  const canReview = useCan(EXCEPTION_REVIEW_KEY);
  const assign = useAssignPickException();
  const editable = canReview && exception.status === "OPEN" && exception.warehouseId !== null;
  const roster = useWarehouseRoster(exception.warehouseId, { enabled: editable });

  const ownerLabel = exception.ownerName ?? "Unassigned";

  function makeAssignHandler(ownerUserId: string) {
    return function assignOwner(): void {
      setOpen(false);
      if (ownerUserId === exception.ownerUserId) return;
      const picked = roster.members.find((member) => member.id === ownerUserId);
      assign.mutate(
        {
          pickLineId: exception.pickLineId,
          pickListId: exception.pickListId,
          ownerUserId,
        },
        {
          onSuccess: () =>
            toast.success(
              picked
                ? `${exception.sku} is now ${getUserDisplayName(picked)}'s`
                : "Exception handed over",
            ),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    };
  }

  function handleRetry(): void {
    roster.refetch();
  }

  if (!editable || !roster.canRead) {
    return <span className="text-sm text-muted-foreground">{ownerLabel}</span>;
  }

  return (
    <ResponsivePopover open={open} onOpenChange={setOpen}>
      <ResponsivePopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-7 max-w-full justify-start px-2 font-normal"
          aria-label={`Owner: ${ownerLabel}. Hand this exception to someone else`}
          disabled={assign.isPending}
        >
          <span className="truncate text-sm text-muted-foreground">{ownerLabel}</span>
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        title="Hand this exception to"
        className={cn("p-0", INLINE_POPOVER_MIN_CLASS, "min-w-52")}
        align="end"
      >
        {roster.isError ? (
          <div className="space-y-2 p-3">
            <p className="text-xs text-muted-foreground">{getErrorMessage(roster.error)}</p>
            <Button variant="outline" size="sm" className="w-full" onClick={handleRetry}>
              Retry
            </Button>
          </div>
        ) : roster.isLoading ? (
          <p className="p-3 text-center text-xs text-muted-foreground">
            Loading who has scope here…
          </p>
        ) : (
          <Command>
            <CommandInput placeholder="Search people…" className="text-xs" />
            <CommandList className="max-h-48">
              <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                Nobody holds scope on this warehouse.
              </CommandEmpty>
              <CommandGroup>
                {roster.members.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={getUserDisplayName(member)}
                    onSelect={makeAssignHandler(member.id)}
                  >
                    <Avatar className="mr-2 h-5 w-5 shrink-0">
                      <AvatarImage src={resolveImageUrl(member.image)} />
                      <AvatarFallback className="text-micro">
                        {getUserInitials(member)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-left text-xs">
                      {getUserDisplayName(member)}
                    </span>
                    {member.id === exception.ownerUserId ? (
                      <Check className="ml-auto h-3 w-3 shrink-0" />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
});
