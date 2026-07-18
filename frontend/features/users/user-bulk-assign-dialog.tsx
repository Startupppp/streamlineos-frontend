"use client";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrgBranches, useOrgDepartments } from "@/hooks/api/org-hierarchy";
import { useState, useCallback } from "react";
import { useBulkUpdateUsers } from "@/hooks/api/users";
import type { BulkUpdatePayload } from "@/hooks/api/users";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";

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
  const [assignRole, setAssignRole] = useState("all");
  const [assignBranchId, setAssignBranchId] = useState("all");
  const [assignDeptId, setAssignDeptId] = useState("all");

  const { data: branchesData } = useOrgBranches();
  const { data: departmentsData } = useOrgDepartments();
  const { mutate: bulkUpdate, isPending } = useBulkUpdateUsers();

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setAssignRole("all");
    setAssignBranchId("all");
    setAssignDeptId("all");
  }, [onOpenChange]);

  function handleApply() {
    const payload: BulkUpdatePayload = {
      userIds: Array.from(selectedIds),
      ...(assignRole !== "all" ? { role: assignRole } : {}),
      ...(assignBranchId !== "all" ? { branchId: Number(assignBranchId) } : {}),
      ...(assignDeptId !== "all" ? { departmentId: Number(assignDeptId) } : {}),
    };
    bulkUpdate(payload, {
      onSuccess: () => {
        toast.success(`${selectedIds.size} user(s) updated`);
        onSuccess();
        handleClose();
      },
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  const nothingSelected =
    assignRole === "all" && assignBranchId === "all" && assignDeptId === "all";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Bulk Assign — {selectedIds.size} user(s)
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Role</p>
            <Select value={assignRole} onValueChange={setAssignRole}>
              <SelectTrigger>
                <SelectValue placeholder="Keep unchanged" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Keep unchanged</SelectItem>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Branch</p>
            <Select value={assignBranchId} onValueChange={setAssignBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Keep unchanged" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Keep unchanged</SelectItem>
                {(branchesData?.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Department</p>
            <Select value={assignDeptId} onValueChange={setAssignDeptId}>
              <SelectTrigger>
                <SelectValue placeholder="Keep unchanged" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Keep unchanged</SelectItem>
                {(departmentsData?.data ?? []).map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply} disabled={isPending || nothingSelected}>
            {isPending ? "Applying..." : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
