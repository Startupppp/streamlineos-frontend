"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserCombobox } from "@/components/ui/user-combobox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getErrorMessage } from "@/lib/api-client";
import { useMyDelegations, useCreateDelegation, useDeleteDelegation } from "@/hooks/api/hr/hr-workflows";
import { HR_WORKFLOW_OBJECT_TYPES, HR_WORKFLOW_OBJECT_TYPE_LABELS } from "@/types/hr/workflows";

const schema = z.object({
  delegateUserId: z.string().min(1, "Delegate is required"),
  objectType: z.string().optional(),
  startsAt: z.string().min(1, "Start date is required"),
  endsAt: z.string().min(1, "End date is required"),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function DelegationSettings({ open, onOpenChange }: Props) {
  const { data: delegations, isLoading } = useMyDelegations();
  const create = useCreateDelegation();
  const remove = useDeleteDelegation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { delegateUserId: "", objectType: "", startsAt: "", endsAt: "", reason: "" },
  });

  const onSubmit = useCallback((data: FormValues) => {
    create.mutate(
      {
        delegateUserId: data.delegateUserId,
        objectType: data.objectType || undefined,
        startsAt: new Date(data.startsAt).toISOString(),
        endsAt: new Date(data.endsAt).toISOString(),
        reason: data.reason,
      },
      {
        onSuccess: () => {
          toast.success("Delegation created");
          form.reset();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [create, form]);

  function handleRemove(id: number) {
    remove.mutate(id, {
      onSuccess: () => toast.success("Delegation removed"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">My Delegations</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-64 pr-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!isLoading && !delegations?.length && (
            <p className="text-sm text-muted-foreground">No active delegations</p>
          )}
          <div className="space-y-2">
            {delegations?.map((d) => (
              <div key={d.id} className="flex items-center gap-2 rounded-lg border p-2.5 text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{d.delegateUserId}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {d.objectType ? (
                      <Badge variant="secondary" className="text-[10px]">{HR_WORKFLOW_OBJECT_TYPE_LABELS[d.objectType]}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">All types</Badge>
                    )}
                    <span className="text-muted-foreground">
                      {new Date(d.startsAt).toLocaleDateString()} – {new Date(d.endsAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive shrink-0"
                  onClick={() => handleRemove(d.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Form {...form}>
          <div className="space-y-3 pt-2 border-t">
            <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Add Delegation</p>

            <FormField
              control={form.control}
              name="delegateUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Delegate</FormLabel>
                  <FormControl>
                    <UserCombobox
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Search for delegate…"
                      className="text-xs"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="objectType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Process Type (leave blank for all)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="All types" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      {HR_WORKFLOW_OBJECT_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">{HR_WORKFLOW_OBJECT_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="startsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Starts At</FormLabel>
                    <FormControl><Input type="date" className="text-xs" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Ends At</FormLabel>
                    <FormControl><Input type="date" className="text-xs" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Form>

        <DialogFooter>
          <LoadingButton
            size="sm"
            isPending={create.isPending}
            onClick={form.handleSubmit(onSubmit)}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Delegation
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
