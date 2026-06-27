"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddKbSpaceMember } from "@/lib/api/hooks/kb";
import { useOrgMembers } from "@/lib/api/hooks/organization";
import { getApiError } from "@/lib/api-client";
import { SYSTEM_ROLES } from "@/lib/rbac/permissions/roles";
import type { KbSpaceRole } from "@/types/kb";

const SPACE_ROLES = ["viewer", "commenter", "editor", "publisher", "admin"] as const;

export const SPACE_ROLE_LABELS: Record<KbSpaceRole, string> = {
  viewer: "Viewer",
  commenter: "Commenter",
  editor: "Editor",
  publisher: "Publisher",
  admin: "Admin",
};

const addMemberSchema = z
  .object({
    grantType: z.enum(["user", "role"]),
    userId: z.string(),
    role: z.string(),
    spaceRole: z.enum(SPACE_ROLES),
  })
  .refine((values) => values.grantType !== "user" || values.userId.length > 0, {
    message: "Select a user",
    path: ["userId"],
  })
  .refine((values) => values.grantType !== "role" || values.role.length > 0, {
    message: "Select a role",
    path: ["role"],
  });

type AddMemberFormValues = z.infer<typeof addMemberSchema>;

interface AddMemberDialogProps {
  spaceId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemberDialog({ spaceId, open, onOpenChange }: AddMemberDialogProps) {
  const addMember = useAddKbSpaceMember(spaceId);
  const membersQuery = useOrgMembers(1, 200);

  const memberOptions: ComboboxOption[] = (membersQuery.data?.data ?? []).map((member) => ({
    value: member.userId,
    label: member.name ?? member.email,
    sublabel: member.email,
  }));

  const handleSubmit = (values: AddMemberFormValues) => {
    addMember.mutate(
      values.grantType === "user"
        ? { userId: values.userId, spaceRole: values.spaceRole }
        : { role: values.role, spaceRole: values.spaceRole },
      {
        onSuccess: () => {
          toast.success("Access granted");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getApiError(error)),
      },
    );
  };

  return (
    <EntityFormDialog<AddMemberFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Add access"
      description="Grant a user or role access to this space."
      resolver={zodResolver(addMemberSchema)}
      defaultValues={{ grantType: "user", userId: "", role: "", spaceRole: "viewer" }}
      onSubmit={handleSubmit}
      isSubmitting={addMember.isPending}
      submitLabel="Grant access"
      resetOnOpen
    >
      {(form) => {
        const grantType = form.watch("grantType");
        return (
          <>
            <FormField
              control={form.control}
              name="grantType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grant to</FormLabel>
                  <Tabs value={field.value} onValueChange={field.onChange}>
                    <TabsList className="w-full">
                      <TabsTrigger value="user">User</TabsTrigger>
                      <TabsTrigger value="role">Role</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </FormItem>
              )}
            />

            {grantType === "user" ? (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>User</FormLabel>
                    <Combobox
                      options={memberOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={membersQuery.isLoading ? "Loading users…" : "Select a user"}
                      searchPlaceholder="Search users…"
                      emptyText="No users found."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SYSTEM_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="spaceRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select access level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SPACE_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {SPACE_ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      }}
    </EntityFormDialog>
  );
}
