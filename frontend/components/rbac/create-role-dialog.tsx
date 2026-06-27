"use client";

import { useState, useCallback } from "react";
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

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}

export function CreateRoleDialog({ open, onOpenChange }: CreateRoleDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [cloneFrom, setCloneFrom] = useState<string>(CLONE_NONE);
  const [clonedPermissions, setClonedPermissions] = useState<string[]>([]);

  const create = useCreateRole();
  const { data: roles } = useRoles();
  const { data: templates } = useRoleTemplates();

  const reset = useCallback(() => {
    setName("");
    setSlug("");
    setCloneFrom(CLONE_NONE);
    setClonedPermissions([]);
  }, []);

  const handleNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setName(value);
    setSlug(slugify(value));
  }, []);

  const handleSlugChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""));
  }, []);

  const handleCloneChange = useCallback(
    (value: string) => {
      setCloneFrom(value);
      if (value.startsWith("role:")) {
        const roleId = Number(value.slice("role:".length));
        const source = roles?.find((role) => role.id === roleId);
        setClonedPermissions(source?.permissions ?? []);
      } else if (value.startsWith("template:")) {
        const templateId = value.slice("template:".length);
        const source = templates?.find((template) => template.id === templateId);
        setClonedPermissions(source ? [...source.permissions] : []);
      } else {
        setClonedPermissions([]);
      }
    },
    [roles, templates],
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
    reset();
  }, [onOpenChange, reset]);

  const handleCreate = useCallback(() => {
    create.mutate(
      {
        name: name.trim(),
        slug: slug.trim(),
        permissions: clonedPermissions.length > 0 ? clonedPermissions : undefined,
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
  }, [create, name, slug, clonedPermissions, onOpenChange, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new role</DialogTitle>
          <DialogDescription className="text-xs">
            Start from scratch or clone the permissions of an existing role or template.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="role-name" className="text-xs">
              Role name
            </Label>
            <Input
              id="role-name"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Finance Manager"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role-slug" className="text-xs">
              Slug (auto-generated)
            </Label>
            <Input
              id="role-slug"
              value={slug}
              onChange={handleSlugChange}
              placeholder="FINANCE_MANAGER"
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role-clone" className="text-xs">
              Clone from
            </Label>
            <Select value={cloneFrom} onValueChange={handleCloneChange}>
              <SelectTrigger id="role-clone" className="w-full">
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
            <Button variant="outline" onClick={handleClose} disabled={create.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !slug.trim() || create.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create role
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
