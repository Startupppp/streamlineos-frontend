"use client";

import { useState, useCallback } from "react";
import { Trash2, Plus, AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiError } from "@/lib/api-client";
import {
  useResourceGrants,
  useGrantResource,
  useRevokeGrant,
} from "@/lib/api/hooks/access/resource-grants";
import { KB_PERMISSIONS } from "@/lib/rbac/permissions";

const PERMISSION_OPTIONS = KB_PERMISSIONS.map((p) => ({
  value: p.name,
  label: p.description,
}));

type PrincipalType = "user" | "role";

interface AddGrantDialogProps {
  open: boolean;
  resourceType: string;
  resourceId: string;
  onOpenChange: (open: boolean) => void;
}

function AddGrantDialog({
  open,
  resourceType,
  resourceId,
  onOpenChange,
}: AddGrantDialogProps) {
  const [principalType, setPrincipalType] = useState<PrincipalType>("user");
  const [principalId, setPrincipalId] = useState("");
  const [permissionKey, setPermissionKey] = useState("");

  const grant = useGrantResource();

  const reset = useCallback(() => {
    setPrincipalType("user");
    setPrincipalId("");
    setPermissionKey("");
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    reset();
  }, [onOpenChange, reset]);

  const handlePrincipalTypeChange = useCallback((value: string) => {
    if (value === "user" || value === "role") {
      setPrincipalType(value);
    }
  }, []);

  const handlePrincipalIdChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPrincipalId(event.target.value);
    },
    [],
  );

  const handlePermissionKeyChange = useCallback((value: string) => {
    setPermissionKey(value);
  }, []);

  const handleConfirm = useCallback(() => {
    grant.mutate(
      {
        resourceType,
        resourceId,
        principalType,
        principalId: principalId.trim(),
        permissionKey,
      },
      {
        onSuccess: () => {
          toast.success("Grant added");
          handleClose();
        },
        onError: (error) => toast.error(getApiError(error)),
      },
    );
  }, [grant, resourceType, resourceId, principalType, principalId, permissionKey, handleClose]);

  const isValid = principalId.trim().length > 0 && permissionKey.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add grant</DialogTitle>
          <DialogDescription className="text-xs">
            Grant a user or role a specific permission on this resource.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="principal-type" className="text-xs">
              Principal type
            </Label>
            <Select value={principalType} onValueChange={handlePrincipalTypeChange}>
              <SelectTrigger id="principal-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="role">Role</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="principal-id" className="text-xs">
              {principalType === "user" ? "User ID" : "Role ID"}
            </Label>
            <Input
              id="principal-id"
              value={principalId}
              onChange={handlePrincipalIdChange}
              placeholder={
                principalType === "user" ? "e.g. usr_abc123" : "e.g. 42"
              }
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="permission-key" className="text-xs">
              Permission
            </Label>
            <Select value={permissionKey} onValueChange={handlePermissionKeyChange}>
              <SelectTrigger id="permission-key" className="w-full">
                <SelectValue placeholder="Select a permission" />
              </SelectTrigger>
              <SelectContent>
                {PERMISSION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="block truncate">{option.label}</span>
                    <span className="block text-[10px] text-muted-foreground font-mono">
                      {option.value}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={grant.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isValid || grant.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {grant.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Add grant
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RevokeButtonProps {
  grantId: string;
  resourceType: string;
  resourceId: string;
}

function RevokeButton({ grantId, resourceType, resourceId }: RevokeButtonProps) {
  const revoke = useRevokeGrant();

  const handleRevoke = useCallback(() => {
    revoke.mutate(
      { grantId, resourceType, resourceId },
      {
        onSuccess: () => toast.success("Grant revoked"),
        onError: (error) => toast.error(getApiError(error)),
      },
    );
  }, [revoke, grantId, resourceType, resourceId]);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-destructive"
      onClick={handleRevoke}
      disabled={revoke.isPending}
      aria-label="Revoke grant"
    >
      {revoke.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

interface ResourceGrantManagerProps {
  resourceType: string;
  resourceId: string;
  title?: string;
}

export function ResourceGrantManager({
  resourceType,
  resourceId,
  title = "Resource grants",
}: ResourceGrantManagerProps) {
  const [addOpen, setAddOpen] = useState(false);
  const grantsQuery = useResourceGrants(resourceType, resourceId);

  const handleOpenAdd = useCallback(() => setAddOpen(true), []);
  const handleRetry = useCallback(() => grantsQuery.refetch(), [grantsQuery]);

  const grants = grantsQuery.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
          <h3 className="text-sm font-semibold truncate">{title}</h3>
          {!grantsQuery.isLoading && !grantsQuery.isError && (
            <Badge variant="outline" className="text-[10px] shrink-0">
              {grants.length}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleOpenAdd}
          className="gap-1.5 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Add grant
        </Button>
      </div>

      {grantsQuery.isLoading ? (
        <div className="rounded-md border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Principal</TableHead>
                <TableHead className="text-xs">Permission</TableHead>
                <TableHead className="text-xs">Granted</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : grantsQuery.isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-border/60 px-6 py-10 text-center">
          <AlertTriangle className="h-7 w-7 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Couldn&apos;t load grants</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {getApiError(grantsQuery.error)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      ) : grants.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-border/60 border-dashed px-6 py-10 text-center">
          <ShieldCheck className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">No grants yet</p>
          <p className="text-xs text-muted-foreground">
            Add a grant to give users or roles specific permissions on this resource.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Principal</TableHead>
                <TableHead className="text-xs">Permission</TableHead>
                <TableHead className="text-xs">Granted</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {grants.map((grant) => (
                <TableRow key={grant.id}>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={grant.principalType === "user" ? "secondary" : "outline"}
                        className="text-[10px] font-mono px-1.5 py-0"
                      >
                        {grant.principalType}
                      </Badge>
                      <span className="text-[13px] font-mono truncate max-w-[140px]">
                        {grant.principalId}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono px-1.5 py-0 max-w-[200px] truncate"
                    >
                      {grant.permissionKey}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(grant.createdAt), "d MMM yyyy")}
                    {grant.grantedBy && (
                      <span className="block text-[10px] font-mono truncate max-w-[120px]">
                        {grant.grantedBy}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <RevokeButton
                      grantId={grant.id}
                      resourceType={resourceType}
                      resourceId={resourceId}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddGrantDialog
        open={addOpen}
        resourceType={resourceType}
        resourceId={resourceId}
        onOpenChange={setAddOpen}
      />
    </div>
  );
}
