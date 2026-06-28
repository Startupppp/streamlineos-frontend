"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getApiError } from "@/lib/api-client";
import { useCreateRole, useRoles, useRoleTemplates } from "@/lib/api/hooks/roles";

const CLONE_NONE = "none";

function slugify(value: string): string {
  return value.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
}

function buildSchema(existingNames: string[], existingSlugs: string[]) {
  return z.object({
    name: z
      .string()
      .min(1, "Role name is required")
      .max(80, "Name must be 80 characters or fewer")
      .refine(
        (value) => !existingNames.includes(value.trim().toLowerCase()),
        "A role with this name already exists",
      ),
    slug: z
      .string()
      .min(1, "Slug is required")
      .max(60, "Slug must be 60 characters or fewer")
      .regex(/^[A-Z0-9_]+$/, "Slug must contain only uppercase letters, digits, or underscores")
      .refine(
        (value) => !existingSlugs.includes(value.trim().toLowerCase()),
        "A role with this slug already exists",
      ),
    cloneFrom: z.string().default(CLONE_NONE),
  });
}

type FormValues = {
  name: string;
  slug: string;
  cloneFrom: string;
};

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}

export function CreateRoleDialog({ open, onOpenChange }: CreateRoleDialogProps) {
  const create = useCreateRole();
  const { data: roles } = useRoles();
  const { data: templates } = useRoleTemplates();

  const existingNames = (roles ?? []).map((role) => role.name.toLowerCase());
  const existingSlugs = (roles ?? []).map((role) => role.slug.toLowerCase());
  const schema = buildSchema(existingNames, existingSlugs);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", cloneFrom: CLONE_NONE },
  });

  const nameValue = watch("name");
  const cloneFrom = watch("cloneFrom");

  useEffect(() => {
    setValue("slug", slugify(nameValue), { shouldValidate: false });
  }, [nameValue, setValue]);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const handleSlugChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue("slug", event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""), {
        shouldValidate: true,
      });
    },
    [setValue],
  );

  const handleCloneChange = useCallback(
    (value: string) => {
      setValue("cloneFrom", value, { shouldValidate: false });
    },
    [setValue],
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const getClonedPermissions = useCallback((): string[] => {
    if (cloneFrom.startsWith("role:")) {
      const roleId = Number(cloneFrom.slice("role:".length));
      const source = roles?.find((role) => role.id === roleId);
      return source?.permissions ?? [];
    }
    if (cloneFrom.startsWith("template:")) {
      const templateId = cloneFrom.slice("template:".length);
      const source = templates?.find((template) => template.id === templateId);
      return source ? [...source.permissions] : [];
    }
    return [];
  }, [cloneFrom, roles, templates]);

  const clonedPermissions = getClonedPermissions();

  const onSubmit = useCallback(
    (values: FormValues) => {
      const permissions = getClonedPermissions();
      create.mutate(
        {
          name: values.name.trim(),
          slug: values.slug.trim(),
          permissions: permissions.length > 0 ? permissions : undefined,
        },
        {
          onSuccess: () => {
            toast.success("Role created");
            onOpenChange(false);
            reset();
          },
          onError: (error) => toast.error(getApiError(error)),
        },
      );
    },
    [create, getClonedPermissions, onOpenChange, reset],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new role</DialogTitle>
          <DialogDescription className="text-xs">
            Start from scratch or clone the permissions of an existing role or template.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="role-name" className="text-xs">
              Role name
            </Label>
            <Input
              id="role-name"
              placeholder="e.g. Finance Manager"
              aria-required="true"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "role-name-error" : undefined}
              {...register("name")}
            />
            {errors.name && (
              <p id="role-name-error" className="text-xs text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role-slug" className="text-xs">
              Slug (auto-generated)
            </Label>
            <Input
              id="role-slug"
              placeholder="FINANCE_MANAGER"
              className="font-mono text-xs"
              aria-required="true"
              aria-invalid={Boolean(errors.slug)}
              aria-describedby={errors.slug ? "role-slug-error" : undefined}
              {...register("slug")}
              onChange={handleSlugChange}
            />
            {errors.slug && (
              <p id="role-slug-error" className="text-xs text-destructive">
                {errors.slug.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role-clone" className="text-xs">
              Clone from
            </Label>
            <Select value={cloneFrom} onValueChange={handleCloneChange}>
              <SelectTrigger id="role-clone" className="w-full" aria-label="Clone permissions from">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CLONE_NONE}>Start from scratch</SelectItem>
                {roles && roles.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Existing roles</SelectLabel>
                    {roles.map((role) => (
                      <SelectItem key={`role:${role.id}`} value={`role:${role.id}`}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {templates && templates.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Templates</SelectLabel>
                    {templates.map((template) => (
                      <SelectItem key={`template:${template.id}`} value={`template:${template.id}`}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            {clonedPermissions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {clonedPermissions.length} permission
                {clonedPermissions.length === 1 ? "" : "s"} will be copied. You can adjust
                permissions and scopes after creating.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={create.isPending || isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={create.isPending || isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {(create.isPending || isSubmitting) && (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              )}
              Create role
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
