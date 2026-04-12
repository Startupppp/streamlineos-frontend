"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useRoleTemplates,
  useCloneRoleTemplate,
  type RoleTemplate,
} from "@/lib/api/hooks/roles";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import {
  Plus,
  Loader2,
  Trash2,
  Shield,
  ChevronDown,
  ChevronRight,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import type { Permission } from "@/lib/rbac/permissions";
import type { Role } from "@/types/organization";

const RESOURCE_GROUPS: Record<string, string> = {
  "hr:employees": "HR - Employees",
  "hr:attendance": "HR - Attendance",
  "hr:leaves": "HR - Leaves",
  "hr:payroll": "HR - Payroll",
  "hr:salary": "HR - Salary",
  "hr:expenses": "HR - Expenses",
  "hr:assets": "HR - Assets",
  "hr:documents": "HR - Documents",
  "hr:performance": "HR - Performance",
  "hr:goals": "HR - Goals",
  "projects": "Projects",
  "projects:tickets": "Project Tickets",
  "projects:sprints": "Project Sprints",
  "projects:timesheets": "Timesheets",
  "reports": "Reports",
  "settings": "Settings",
  "settings:rbac": "RBAC Management",
  "crm:leads": "CRM - Leads",
  "crm:targets": "CRM - Targets",
  "crm:reports": "CRM - Reports",
  "dashboard:sales": "Dashboard - Sales",
  "dashboard:customer-executive": "Dashboard - Customer Executive",
  "dashboard:support": "Dashboard - Support",
  "self": "Self-Service",
};

function groupPermissions(permissions: Permission[]) {
  const groups: Record<string, Permission[]> = {};
  for (const perm of permissions) {
    const group = RESOURCE_GROUPS[perm.resource] || perm.resource;
    if (!groups[group]) groups[group] = [];
    groups[group].push(perm);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export default function RolesPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <RolesContent />
    </DashboardGate>
  );
}

function RolesContent() {
  const { data: roles, isLoading } = useRoles();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const deleteRole = useDeleteRole();

  const handleDeleteRole = () => {
    if (!deleteTarget) return;
    deleteRole.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        if (selectedRole?.id === deleteTarget.id) setSelectedRole(null);
        toast.success("Role deleted");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const permissionGroups = useMemo(() => groupPermissions(PERMISSIONS), []);

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleUpdateRole = useCallback((updated: Role) => setSelectedRole(updated), []);
  const handleDeleteDialogClose = useCallback(() => setDeleteTarget(null), []);

  return (
    <PageWrapper
      title="Roles & Permissions"
      subtitle="Configure access controls for each role"
      noInternalScroll
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTemplateOpen(true)} className="gap-2">
            <Copy className="h-4 w-4" /> Use Template
          </Button>
          <Button onClick={handleOpenCreate} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4" /> New Role
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:h-full lg:min-h-0">
        <Card className="flex flex-col lg:min-h-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" /> Roles ({roles?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 lg:flex-1 lg:min-h-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="max-h-[45vh] lg:max-h-none lg:h-full" type="auto">
                <div className="divide-y divide-border/30">
                  {(roles ?? []).map((role) => (
                    <RoleListItem
                      key={role.id}
                      role={role}
                      isSelected={selectedRole?.id === role.id}
                      onSelect={setSelectedRole}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {selectedRole ? (
          <PermissionMatrix
            role={selectedRole}
            permissionGroups={permissionGroups}
            onUpdate={handleUpdateRole}
          />
        ) : (
          <Card className="flex items-center justify-center min-h-[260px] lg:min-h-0 lg:h-full">
            <div className="text-center px-6">
              <EmptyApprovalIllustration className="mx-auto mb-3 w-40 h-40" />
              <p className="text-sm font-medium text-foreground">Select a role</p>
              <p className="text-xs text-muted-foreground mt-1">Choose a role from the list to view and edit permissions</p>
            </div>
          </Card>
        )}
      </div>

      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RoleTemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} />

      <Dialog open={!!deleteTarget} onOpenChange={handleDeleteDialogClose}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deleteTarget?.name}</span>? Users with this role will lose their assigned permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleDeleteDialogClose}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRole}
              disabled={deleteRole.isPending}
            >
              {deleteRole.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}

function PermissionMatrix({
  role,
  permissionGroups,
  onUpdate,
}: {
  role: Role;
  permissionGroups: [string, Permission[]][];
  onUpdate: (updated: Role) => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const updateRole = useUpdateRole();

  const rolePermissions = new Set(role.permissions ?? []);

  const togglePermission = (permName: string) => {
    const current = new Set(role.permissions ?? []);
    if (current.has(permName)) {
      current.delete(permName);
    } else {
      current.add(permName);
    }
    const newPermissions = Array.from(current);
    updateRole.mutate(
      { id: role.id, permissions: newPermissions },
      {
        onSuccess: () => {
          onUpdate({ ...role, permissions: newPermissions });
          toast.success("Permissions updated");
        },
      }
    );
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  const toggleAllInGroup = (perms: Permission[], enable: boolean) => {
    const current = new Set(role.permissions ?? []);
    for (const p of perms) {
      if (enable) current.add(p.name);
      else current.delete(p.name);
    }
    const newPermissions = Array.from(current);
    updateRole.mutate(
      { id: role.id, permissions: newPermissions },
      {
        onSuccess: () => {
          onUpdate({ ...role, permissions: newPermissions });
          toast.success("Permissions updated");
        },
      }
    );
  };

  const isCEO = role.slug === "CEO";

  return (
    <Card className="flex flex-col lg:min-h-0 lg:h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {role.name}
              {role.isSystem && <Badge variant="outline" className="text-[10px]">System Role</Badge>}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rolePermissions.size} of {PERMISSIONS.length} permissions enabled
            </p>
          </div>
          {updateRole.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <Separator />
      <ScrollArea className="max-h-[65vh] lg:max-h-none lg:flex-1 lg:min-h-0" type="auto">
        <div className="divide-y divide-border/30">
          {permissionGroups.map(([groupName, perms]) => (
            <PermissionGroupRow
              key={groupName}
              groupName={groupName}
              perms={perms}
              isExpanded={expandedGroups.has(groupName)}
              enabledCount={perms.filter((p) => rolePermissions.has(p.name)).length}
              isCEO={isCEO}
              rolePermissions={rolePermissions}
              onToggleGroup={toggleGroup}
              onToggleAll={toggleAllInGroup}
              onTogglePermission={togglePermission}
            />
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

// ─── Role Templates ───────────────────────────────────────────────────────────

const ROLE_TEMPLATES: Array<{ label: string; name: string; slug: string; permissions: string[] }> = [
  {
    label: "Sales Rep",
    name: "Sales Rep",
    slug: "SALES_REP",
    permissions: [
      "crm:leads:view", "crm:leads:create", "crm:leads:update",
      "crm:targets:view", "dashboard:sales:view", "self:view",
    ],
  },
  {
    label: "HR Admin",
    name: "HR Admin",
    slug: "HR_ADMIN",
    permissions: [
      "hr:employees:view", "hr:employees:create", "hr:employees:update",
      "hr:leaves:view", "hr:leaves:manage", "hr:attendance:view", "hr:attendance:manage",
      "hr:payroll:view", "hr:payroll:manage", "settings:rbac:view",
    ],
  },
  {
    label: "Recruiter",
    name: "Recruiter",
    slug: "RECRUITER",
    permissions: [
      "hr:employees:view",
      "hr:documents:view", "hr:documents:create",
    ],
  },
  {
    label: "Project Manager",
    name: "Project Manager",
    slug: "PROJECT_MANAGER",
    permissions: [
      "projects:view", "projects:create", "projects:update",
      "projects:tickets:view", "projects:tickets:create", "projects:tickets:update",
      "projects:sprints:view", "projects:sprints:create",
      "projects:timesheets:view", "projects:timesheets:manage",
    ],
  },
  {
    label: "Finance Manager",
    name: "Finance Manager",
    slug: "FINANCE_MANAGER",
    permissions: [
      "hr:payroll:view", "hr:payroll:manage",
      "hr:expenses:view", "hr:expenses:manage",
      "hr:salary:view", "reports:view",
    ],
  },
];

function CreateRoleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const create = useCreateRole();

  const handleNameChange = useCallback((value: string) => {
    setName(value);
    setSlug(value.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z_]/g, ""));
  }, []);

  const handleNameInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value), [handleNameChange]);
  const handleSlugInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSlug(e.target.value.toUpperCase().replace(/[^A-Z_]/g, "")), []);
  const handleCancelDialog = useCallback(() => { onOpenChange(false); setName(""); setSlug(""); setSelectedPermissions([]); }, [onOpenChange]);

  const handleTemplateSelect = useCallback((tmpl: typeof ROLE_TEMPLATES[number]) => {
    setName(tmpl.name);
    setSlug(tmpl.slug);
    setSelectedPermissions(tmpl.permissions);
  }, []);

  const handleCreate = useCallback(() => {
    create.mutate(
      { name, slug, permissions: selectedPermissions },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName("");
          setSlug("");
          setSelectedPermissions([]);
          toast.success("Role created");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [create, name, slug, selectedPermissions, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription className="text-xs">Start from a template or create a custom role.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Templates */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Start from a template</Label>
            <div className="flex flex-wrap gap-2">
              {ROLE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.slug}
                  type="button"
                  onClick={() => handleTemplateSelect(tmpl)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-colors",
                    slug === tmpl.slug
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary hover:text-primary"
                  )}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Role Name</Label>
            <Input
              value={name}
              onChange={handleNameInputChange}
              placeholder="e.g. Finance Manager"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Slug (auto-generated)</Label>
            <Input
              value={slug}
              onChange={handleSlugInputChange}
              placeholder="FINANCE_MANAGER"
              className="mt-1 font-mono text-xs"
            />
          </div>
          {selectedPermissions.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedPermissions.length} permissions pre-selected from template. You can edit them after creation.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleCancelDialog}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !slug.trim() || create.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create Role
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RoleListItemProps {
  role: Role;
  isSelected: boolean;
  onSelect: (role: Role) => void;
  onDelete: (role: Role) => void;
}

function RoleListItem({ role, isSelected, onSelect, onDelete }: RoleListItemProps) {
  const handleSelect = useCallback(() => onSelect(role), [role, onSelect]);
  const handleDelete = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onDelete(role); }, [role, onDelete]);

  return (
    <button
      onClick={handleSelect}
      className={cn(
        "w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors flex items-center justify-between",
        isSelected && "bg-muted/50 border-l-2 border-primary"
      )}
    >
      <div>
        <p className="text-sm font-medium">{role.name}</p>
        <p className="text-[11px] text-muted-foreground">{role.permissions?.length ?? 0} permissions</p>
      </div>
      <div className="flex items-center gap-2">
        {role.isSystem && <Badge variant="outline" className="text-[9px] px-1.5">System</Badge>}
        {!role.isSystem && (
          <button onClick={handleDelete} className="p-1 hover:bg-red-50 rounded text-muted-foreground hover:text-red-500 transition-colors" aria-label="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </button>
  );
}

interface PermissionGroupRowProps {
  groupName: string;
  perms: Permission[];
  isExpanded: boolean;
  enabledCount: number;
  isCEO: boolean;
  rolePermissions: Set<string>;
  onToggleGroup: (name: string) => void;
  onToggleAll: (perms: Permission[], enable: boolean) => void;
  onTogglePermission: (name: string) => void;
}

function PermissionGroupRow({ groupName, perms, isExpanded, enabledCount, isCEO, rolePermissions, onToggleGroup, onToggleAll, onTogglePermission }: PermissionGroupRowProps) {
  const allEnabled = enabledCount === perms.length;
  const handleToggleGroup = useCallback(() => onToggleGroup(groupName), [groupName, onToggleGroup]);
  const handleToggleAll = useCallback((v: boolean) => onToggleAll(perms, v), [perms, onToggleAll]);
  const handleStopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <div>
      <button onClick={handleToggleGroup} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-sm font-medium">{groupName}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{enabledCount}/{perms.length}</Badge>
        </div>
        {!isCEO && (
          <Switch checked={allEnabled} onCheckedChange={handleToggleAll} onClick={handleStopPropagation} className="h-4 w-7" />
        )}
      </button>
      {isExpanded && (
        <div className="bg-muted/10 border-t border-border/20">
          {perms.map((perm) => (
            <PermissionRow
              key={perm.name}
              perm={perm}
              enabled={isCEO || rolePermissions.has(perm.name)}
              isCEO={isCEO}
              onToggle={onTogglePermission}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PermissionRowProps {
  perm: Permission;
  enabled: boolean;
  isCEO: boolean;
  onToggle: (name: string) => void;
}

function PermissionRow({ perm, enabled, isCEO, onToggle }: PermissionRowProps) {
  const handleToggle = useCallback(() => onToggle(perm.name), [perm.name, onToggle]);

  return (
    <div className="flex items-center justify-between px-4 pl-10 py-2 hover:bg-muted/20 transition-colors">
      <div>
        <p className="text-[13px]">{perm.description}</p>
        <p className="text-[10px] text-muted-foreground font-mono">{perm.name}</p>
      </div>
      <Switch checked={enabled} onCheckedChange={handleToggle} disabled={isCEO} className="h-4 w-7" />
    </div>
  );
}

// ─── Role Template Dialog ─────────────────────────────────────────────────────

function RoleTemplateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: templates, isLoading } = useRoleTemplates();
  const clone = useCloneRoleTemplate();

  function handleClone(template: RoleTemplate) {
    clone.mutate(
      { templateId: template.id },
      {
        onSuccess: () => {
          toast.success(`"${template.name}" role cloned`);
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message ?? "Failed to clone template"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Role Templates</DialogTitle>
          <DialogDescription>
            Clone a pre-built role to get started quickly. You can customize permissions after.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">Loading templates…</div>
          ) : (
            templates?.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{t.slug}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.permissions.length} permission{t.permissions.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={clone.isPending}
                  onClick={() => handleClone(t)}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" /> Clone
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
