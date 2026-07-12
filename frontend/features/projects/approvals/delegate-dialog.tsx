"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import type { OrgMember } from "@/types/organization";

const schema = z.object({
  approverId: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

interface DelegateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (approverId: string) => void;
  isPending?: boolean;
  members: OrgMember[];
  currentApproverId?: string | null;
}

export function DelegateDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  members,
  currentApproverId,
}: DelegateDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { approverId: "" },
  });

  const candidates = members.filter((m) => m.userId !== currentApproverId);

  function handleSubmit(values: FormValues) {
    onConfirm(values.approverId);
  }

  function handleOpenChange(open: boolean) {
    if (!open) form.reset();
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delegate Approval</DialogTitle>
          <DialogDescription>Reassign this approval to another team member.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="approverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Approver</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {candidates.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.name ?? m.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <LoadingButton type="submit" size="sm" isPending={isPending} loadingText="Delegating…">
                Delegate
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
