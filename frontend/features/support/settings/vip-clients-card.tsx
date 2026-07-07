"use client";

import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Plus, Trash2, ChevronsUpDown, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useVipClients,
  useAddVipClient,
  useRemoveVipClient,
} from "@/hooks/api/support/macros";
import { useSimpleClientsList } from "@/hooks/api/crm/clients";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";

interface VipClientRowProps {
  clientId: number;
  name: string;
  onRemove: (clientId: number) => void;
}

function VipClientRow({ clientId, name, onRemove }: VipClientRowProps) {
  const handleRemove = useCallback(() => onRemove(clientId), [clientId, onRemove]);
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
      <div className="flex items-center gap-2 text-sm">
        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
        {name}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive"
        onClick={handleRemove}
        aria-label={`Remove ${name} from VIP clients`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function VipClientsCard() {
  const { data: vipClients, isLoading } = useVipClients();
  const { data: allClients } = useSimpleClientsList();
  const addVip = useAddVipClient();
  const removeVip = useRemoveVipClient();
  const [pickerOpen, setPickerOpen] = useState(false);

  const vipIds = useMemo(() => new Set((vipClients ?? []).map((v) => v.clientId)), [vipClients]);
  const clientName = useCallback(
    (clientId: number) => allClients?.find((c) => c.id === clientId)?.name ?? `Client #${clientId}`,
    [allClients],
  );
  const availableClients = useMemo(
    () => (allClients ?? []).filter((c) => !vipIds.has(c.id)),
    [allClients, vipIds],
  );

  const handleRemove = useCallback(
    (clientId: number) => {
      removeVip.mutate(clientId, {
        onError: (error) => toast.error(getApiError(error)),
      });
    },
    [removeVip],
  );

  const handleAdd = useCallback(
    (clientId: number) => {
      addVip.mutate(clientId, {
        onSuccess: () => setPickerOpen(false),
        onError: (error) => toast.error(getApiError(error)),
      });
    },
    [addVip],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">VIP Clients</CardTitle>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="end">
            <Command>
              <CommandInput placeholder="Search clients..." />
              <CommandList>
                <CommandEmpty>No clients found.</CommandEmpty>
                <CommandGroup>
                  {availableClients.map((c) => (
                    <VipClientOption key={c.id} clientId={c.id} name={c.name} onSelect={handleAdd} />
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : vipClients && vipClients.length > 0 ? (
          vipClients.map((v) => (
            <VipClientRow key={v.id} clientId={v.clientId} name={clientName(v.clientId)} onRemove={handleRemove} />
          ))
        ) : (
          <p className="text-xs text-muted-foreground">
            No VIP clients yet. Add one to prioritize their tickets in routing rules.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface VipClientOptionProps {
  clientId: number;
  name: string;
  onSelect: (clientId: number) => void;
}

function VipClientOption({ clientId, name, onSelect }: VipClientOptionProps) {
  const handleSelect = useCallback(() => onSelect(clientId), [clientId, onSelect]);
  return (
    <CommandItem value={name} onSelect={handleSelect}>
      <span className={cn("truncate")}>{name}</span>
    </CommandItem>
  );
}
