"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { useContactRoles, useAddContactRole, useRemoveContactRole } from "@/hooks/api/crm";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { getErrorMessage } from "@/lib/get-error-message";
import { CONTACT_ROLE_DEFAULTS } from "@/types/crm";

const addRoleSchema = z.object({
  entityType: z.enum(["deal", "company"]),
  entityId: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().int().positive()),
  roleKey: z.string().min(1),
  isPrimary: z.boolean(),
});

type AddRoleFormInput = {
  entityType: "deal" | "company";
  entityId: string;
  roleKey: string;
  isPrimary: boolean;
};

type AddRoleFormValues = z.output<typeof addRoleSchema>;

interface ContactRolesCardProps {
  contactId: number;
}

function formatRoleKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ContactRolesCard({ contactId }: ContactRolesCardProps) {
  const { data: roles, isLoading } = useContactRoles(contactId);
  const addRole = useAddContactRole();
  const removeRole = useRemoveContactRole();
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const form = useForm<AddRoleFormInput, unknown, AddRoleFormValues>({
    resolver: zodResolver(addRoleSchema),
    defaultValues: { entityType: "deal", entityId: "", roleKey: "", isPrimary: false },
  });

  const handleSubmit = useCallback(
    (values: AddRoleFormValues) => {
      addRole.mutate(
        { contactId, input: values },
        {
          onSuccess: () => {
            toast.success("Role added");
            form.reset();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [addRole, contactId, form],
  );

  const handleRemove = useCallback(
    (roleId: string) => {
      removeRole.mutate(
        { contactId, roleId },
        {
          onSuccess: () => toast.success("Role removed"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [removeRole, contactId],
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="px-4 py-3 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Buying Committee Roles</CardTitle>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" {...hoverHandlers}>
              <PlusIcon ref={iconRef} size={14} />
              Add Role
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="end">
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Entity Type</Label>
                <Select
                  value={form.watch("entityType")}
                  onValueChange={(v) => form.setValue("entityType", v as "deal" | "company")}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deal">Deal</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Entity ID</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  {...form.register("entityId")}
                  placeholder="Enter ID"
                />
                {form.formState.errors.entityId && (
                  <p className="text-[10px] text-destructive">{form.formState.errors.entityId.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <Select
                  value={form.watch("roleKey")}
                  onValueChange={(v) => form.setValue("roleKey", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_ROLE_DEFAULTS.map((r) => (
                      <SelectItem key={r} value={r}>{formatRoleKey(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.roleKey && (
                  <p className="text-[10px] text-destructive">{form.formState.errors.roleKey.message}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isPrimary"
                  checked={form.watch("isPrimary")}
                  onCheckedChange={(c) => form.setValue("isPrimary", Boolean(c))}
                />
                <Label htmlFor="isPrimary" className="text-xs">Primary contact for this entity</Label>
              </div>
              <LoadingButton
                type="submit"
                size="sm"
                className="w-full h-8 text-xs"
                isPending={addRole.isPending}
                loadingText="Adding..."
              >
                Add Role
              </LoadingButton>
            </form>
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent className="px-4 py-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : !roles || roles.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1">No roles assigned yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 bg-blue-50 text-blue-700 border-blue-200">
                  {formatRoleKey(role.roleKey)}
                  {role.isPrimary && <span className="ml-1 text-[9px] text-blue-500">★</span>}
                </Badge>
                <button
                  type="button"
                  onClick={() => handleRemove(role.id)}
                  disabled={removeRole.isPending}
                  className="h-4 w-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Remove role"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
