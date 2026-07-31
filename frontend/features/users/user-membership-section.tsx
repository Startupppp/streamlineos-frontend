"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserMembership, useUpdateUserMembership } from "@/hooks/api/users";
import { useOrgBranches, useOrgDepartments } from "@/hooks/api/org-hierarchy";
import { useOrgMembers } from "@/hooks/api/organization";
import { toast } from "sonner";
import { getApiError } from "@/lib/api-client";
import { Building2, GitBranch, Network, Pencil } from "lucide-react";
import { CheckIcon, XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { LoadingButton } from "@/components/ui/loading-button";

const NO_BRANCH = "none";
const NO_DEPARTMENT = "none";
const NO_MANAGER = "none";

interface UserMembershipSectionProps {
  userId: string;
}

interface MembershipRow {
  label: string;
  icon: React.ReactNode;
  value: string | null;
}

export function UserMembershipSection({ userId }: UserMembershipSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { data: membership, isLoading } = useUserMembership(userId);
  const { mutate: updateMembership, isPending } = useUpdateUserMembership();
  const { data: branchesData } = useOrgBranches();
  const { data: departmentsData } = useOrgDepartments();
  const { data: membersData } = useOrgMembers();

  const [draft, setDraft] = useState<{
    branchId: string;
    departmentId: string;
    managerUserId: string;
  }>({ branchId: NO_BRANCH, departmentId: NO_DEPARTMENT, managerUserId: NO_MANAGER });

  function handleEdit() {
    setDraft({
      branchId: membership?.branchId ? String(membership.branchId) : NO_BRANCH,
      departmentId: membership?.departmentId ? String(membership.departmentId) : NO_DEPARTMENT,
      managerUserId: membership?.managerUserId ?? NO_MANAGER,
    });
    setIsEditing(true);
  }

  function handleSave() {
    updateMembership(
      {
        userId,
        data: {
          branchId: draft.branchId !== NO_BRANCH ? draft.branchId : null,
          departmentId:
            draft.departmentId !== NO_DEPARTMENT ? draft.departmentId : null,
          managerUserId: draft.managerUserId !== NO_MANAGER ? draft.managerUserId : null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Membership updated");
          setIsEditing(false);
        },
        onError: (e) => toast.error(getApiError(e)),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded" />
        ))}
      </div>
    );
  }

  const branches = branchesData?.data ?? [];
  const departments = departmentsData?.data ?? [];
  const managerOptions = membersData?.data ?? [];

  function handleBranchChange(v: string) {
    setDraft((p) => ({ ...p, branchId: v }));
  }
  function handleDepartmentChange(v: string) {
    setDraft((p) => ({ ...p, departmentId: v }));
  }
  function handleManagerChange(v: string) {
    setDraft((p) => ({ ...p, managerUserId: v }));
  }

  const rows: MembershipRow[] = [
    {
      label: "Branch",
      icon: <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />,
      value: membership?.branchId
        ? (branches.find((b) => String(b.id) === String(membership.branchId))?.name ?? String(membership.branchId))
        : null,
    },
    {
      label: "Department",
      icon: <Building2 className="h-3.5 w-3.5 text-muted-foreground" />,
      value: membership?.departmentId
        ? (departments.find((d) => String(d.id) === String(membership.departmentId))?.name ?? String(membership.departmentId))
        : null,
    },
    {
      label: "Manager",
      icon: <Network className="h-3.5 w-3.5 text-muted-foreground" />,
      value: membership?.managerUserId
        ? (managerOptions.find((m) => m.userId === membership.managerUserId)?.name ?? membership.managerUserId)
        : null,
    },
  ];

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Select value={draft.branchId} onValueChange={handleBranchChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_BRANCH}>None</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Select value={draft.departmentId} onValueChange={handleDepartmentChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_DEPARTMENT}>None</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Network className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Select value={draft.managerUserId} onValueChange={handleManagerChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MANAGER}>None</SelectItem>
                {managerOptions.filter((m) => m.userId !== userId).map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>{m.name ?? m.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LoadingButton size="sm" className="h-7 text-xs" onClick={handleSave} isPending={isPending}>
            Save
          </LoadingButton>
          <AnimatedIconButton icon={XIcon} iconSize={14} iconClassName="mr-1" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsEditing(false)} disabled={isPending}>
            Cancel
          </AnimatedIconButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Organization</p>
        <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={handleEdit}>
          <Pencil className="h-3 w-3 mr-1" />
          Edit
        </Button>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2.5 text-xs">
          {row.icon}
          <span className="text-muted-foreground w-20 shrink-0">{row.label}</span>
          <span className="text-foreground truncate">{row.value ?? <span className="italic text-muted-foreground/60">Not set</span>}</span>
        </div>
      ))}
    </div>
  );
}
