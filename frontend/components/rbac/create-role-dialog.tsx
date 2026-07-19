"use client";

import { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateRole, useRoles, useRoleTemplates, useRolePermissionGrants } from "@/hooks/api/roles";

const CLONE_NONE = "none";

const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, "Role name is required")
    .max(80, "Name must be 80 characters or fewer"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(60, "Slug must be 60 characters or fewer")
    .regex(
      /^[A-Z0-9_]+$/,
      "Slug must only contain uppercase letters, digits, or underscores",
    ),
  cloneFrom: z.string(),
});

type FormValues = z.infer<typeof createRoleSchema>;

function slugify(value: string): string {
  return value
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}

export function CreateRoleDialog({
  open,
  onOpenChange,
}: CreateRoleDialogProps) {
  const create = useCreateRole();
  const { data: roles } = useRoles();
  const { data: templates } = useRoleTemplates();

  const form = useForm<FormValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { name: "", slug: "", cloneFrom: CLONE_NONE },
  });

  const { setValue, reset, handleSubmit, watch, formState: { isSubmitting } } = form;

  const cloneFrom = watch("cloneFrom");

  const cloneRoleId = useMemo(() => {
    if (!cloneFrom.startsWith("role:")) return 0;
    return Number(cloneFrom.slice("role:".length));
  }, [cloneFrom]);

  const cloneGrantsQuery = useRolePermissionGrants(cloneRoleId);

  const clonedPermissions = useMemo<string[]>(() => {
    if (cloneFrom.startsWith("role:") && cloneGrantsQuery.data) {
      return cloneGrantsQuery.data.map((grant) => grant.permissionKey);
    }
    if (cloneFrom.startsWith("template:")) {
      const templateId = cloneFrom.slice("template:".length);
      const source = templates?.find((template) => template.id === templateId);
      return source ? [...source.permissions] : [];
    }
    return [];
  }, [cloneFrom, cloneGrantsQuery.data, templates]);

  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue("slug", slugify(event.target.value), { shouldValidate: false });
    },
    [setValue],
  );

  const handleSlugChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(
        "slug",
        event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
        { shouldValidate: true },
      );
    },
    [setValue],
  );

  const handleCloneChange = useCallback(
    (value: string) => {
      setValue("cloneFrom", value, { shouldValidate: false });
    },
    [setValue],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) reset();
      onOpenChange(nextOpen);
    },
    [onOpenChange, reset],
  );

  const handleClose = useCallback(
    () => handleOpenChange(false),
    [handleOpenChange],
  );

  const onSubmit = useCallback(
    (values: FormValues) => {
      const existingNames = (roles ?? []).map((role) =>
        role.name.trim().toLowerCase(),
      );
      const existingSlugs = (roles ?? []).map((role) =>
        role.slug.trim().toLowerCase(),
      );

      if (existingNames.includes(values.name.trim().toLowerCase())) {
        toast.error("A role with this name already exists");
        return;
      }
      if (existingSlugs.includes(values.slug.trim().toLowerCase())) {
        toast.error("A role with this slug already exists");
        return;
      }

      create.mutate(
        {
          name: values.name.trim(),
          slug: values.slug.trim(),
          permissions:
            clonedPermissions.length > 0 ? clonedPermissions : undefined,
        },
        {
          onSuccess: () => {
            toast.success("Role created");
            onOpenChange(false);
            reset();
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [create, clonedPermissions, roles, onOpenChange, reset],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new role</DialogTitle>
          <DialogDescription className="text-xs">
            Start from scratch or clone the permissions of an existing role or
            template.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Role name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Finance Manager"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleNameChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Slug (auto-generated) <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="FINANCE_MANAGER"
                      className="font-mono text-xs"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleSlugChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cloneFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Clone from</FormLabel>
                  <Select value={field.value} onValueChange={handleCloneChange}>
                    <FormControl>
                      <SelectTrigger className="w-full" aria-label="Clone permissions from">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={CLONE_NONE}>Start from scratch</SelectItem>
                      {roles && roles.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Existing roles</SelectLabel>
                          {roles.map((role) => (
                            <SelectItem
                              key={`role:${role.id}`}
                              value={`role:${role.id}`}
                            >
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {templates && templates.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Templates</SelectLabel>
                          {templates.map((template) => (
                            <SelectItem
                              key={`template:${template.id}`}
                              value={`template:${template.id}`}
                            >
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                  {cloneFrom.startsWith("role:") && cloneGrantsQuery.isLoading ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading permissions…
                    </p>
                  ) : clonedPermissions.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {clonedPermissions.length} permission
                      {clonedPermissions.length === 1 ? "" : "s"} will be copied. You can adjust permissions and scopes after creating.
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={create.isPending || isSubmitting}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                isPending={create.isPending || isSubmitting}
                loadingText="Creating…"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Create role
              </LoadingButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
