"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrgBranches, useOrgDepartments } from "@/hooks/api/org-hierarchy";
import { useBulkUpdateUsers } from "@/hooks/api/users";
import type { BulkUpdatePayload } from "@/hooks/api/users";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { USER_INVITE_ROLES } from "@/features/users/user-invite-roles";

const KEEP = "all";

const bulkAssignSchema = z.object({
  role: z.string(),
  branchId: z.string(),
  departmentId: z.string(),
});

type BulkAssignValues = z.infer<typeof bulkAssignSchema>;

interface UserBulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  onSuccess: () => void;
}

export function UserBulkAssignDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: UserBulkAssignDialogProps) {
  const { data: branchesData } = useOrgBranches();
  const { data: departmentsData } = useOrgDepartments();
  const { mutate: bulkUpdate, isPending } = useBulkUpdateUsers();

  const form = useForm<BulkAssignValues>({
    resolver: zodResolver(bulkAssignSchema),
    defaultValues: { role: KEEP, branchId: KEEP, departmentId: KEEP },
  });

  const handleClose = useCallback(() => {
    form.reset();
    onOpenChange(false);
  }, [form, onOpenChange]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) form.reset();
    onOpenChange(open);
  }, [form, onOpenChange]);

  function handleSubmit(values: BulkAssignValues) {
    const payload: BulkUpdatePayload = {
      userIds: Array.from(selectedIds),
      ...(values.role !== KEEP ? { role: values.role } : {}),
      ...(values.branchId !== KEEP ? { branchId: Number(values.branchId) } : {}),
      ...(values.departmentId !== KEEP ? { departmentId: Number(values.departmentId) } : {}),
    };
    bulkUpdate(payload, {
      onSuccess: () => {
        toast.success(`${selectedIds.size} user(s) updated`);
        onSuccess();
        handleClose();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  const values = form.watch();
  const nothingSelected =
    values.role === KEEP && values.branchId === KEEP && values.departmentId === KEEP;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Assign role — {selectedIds.size} user(s)
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Keep unchanged" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={KEEP}>Keep unchanged</SelectItem>
                      {USER_INVITE_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Branch</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Keep unchanged" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={KEEP}>Keep unchanged</SelectItem>
                      {(branchesData?.data ?? []).map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Department</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Keep unchanged" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={KEEP}>Keep unchanged</SelectItem>
                      {(departmentsData?.data ?? []).map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button variant="ghost" size="sm" type="button" onClick={handleClose}>
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                size="sm"
                isPending={isPending}
                loadingText="Applying…"
                disabled={nothingSelected}
              >
                Apply
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
