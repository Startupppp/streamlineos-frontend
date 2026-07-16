"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  ChevronsUpDown,
  User,
  AlertTriangle,
  Trash2,
  UserX,
} from "lucide-react";
import { useHrEmployees, unwrapEmployees } from "@/hooks/api/hr";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { updateProjectSettingsInputSchema } from "@/lib/validation/projects";

export const formSchema = updateProjectSettingsInputSchema.omit({ projectId: true });
type FormValues = z.infer<typeof formSchema>;

interface MemberItemProps {
  emp: { id: string; name?: string | null; email?: string | null };
  isSelected: boolean;
  isOriginalMember: boolean;
  currentIds: string[];
  onChange: (ids: string[]) => void;
  onMemberRemoved: (id: string, name: string, apply: () => void) => void;
}

const MemberItem = memo(function MemberItem({
  emp,
  isSelected,
  isOriginalMember,
  currentIds,
  onChange,
  onMemberRemoved,
}: MemberItemProps) {
  function handleClick() {
    if (isSelected) {
      const applyRemoval = () => onChange(currentIds.filter((id) => id !== emp.id));
      if (isOriginalMember) {
        onMemberRemoved(emp.id, emp.name ?? emp.email ?? emp.id, applyRemoval);
      } else {
        applyRemoval();
      }
    } else {
      onChange([...currentIds, emp.id]);
    }
  }

  return (
    <button
      type="button"
      className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent text-left"
      onClick={handleClick}
    >
      <Checkbox
        checked={isSelected}
        tabIndex={-1}
        className="pointer-events-none"
        aria-hidden
      />
      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium shrink-0">
        {emp.name?.charAt(0) || <User className="h-3 w-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{emp.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{emp.email}</p>
      </div>
      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
    </button>
  );
});

interface MembersSelectorProps {
  form: UseFormReturn<FormValues>;
  originalMemberIds: string[];
  onMemberRemoved: (
    memberId: string,
    memberName: string,
    applyChange: () => void
  ) => void;
}

export function MembersSelector({
  form,
  originalMemberIds,
  onMemberRemoved,
}: MembersSelectorProps) {
  const { data: employeesData } = useHrEmployees();
  const employees = useMemo(
    () => (Array.isArray(employeesData) ? employeesData : (employeesData?.data ?? [])),
    [employeesData]
  );
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmployees = useMemo(
    () =>
      employees?.filter(
        (emp) =>
          emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [employees, searchQuery]
  );

  const handleSearchChange = useCallback(
    (value: string) => setSearchQuery(value),
    []
  );

  return (
    <FormField
      control={form.control}
      name="memberIds"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                  role="combobox"
                >
                  {field.value?.length && field.value.length > 0
                    ? `${field.value.length} member${field.value.length > 1 ? "s" : ""} selected`
                    : "Select members"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-2"
                align="start"
              >
                <SearchInput
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onValueChange={handleSearchChange}
                   className="mb-2"
                  aria-label="Search team members"
                 />
                <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                  {filteredEmployees?.map((emp) => (
                    <MemberItem
                      key={emp.id}
                      emp={emp}
                      isSelected={field.value?.includes(emp.id) ?? false}
                      isOriginalMember={originalMemberIds.includes(emp.id)}
                      currentIds={field.value || []}
                      onChange={field.onChange}
                      onMemberRemoved={onMemberRemoved}
                    />
                  ))}
                  {!filteredEmployees?.length && (
                    <p className="text-sm text-center py-4 text-muted-foreground">
                      No employees found
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface ReassignDialogProps {
  open: boolean;
  memberName: string;
  removedMemberId: string;
  currentMemberIds: string[];
  reassignTo: string;
  onReassignToChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ReassignDialog({
  open,
  memberName,
  removedMemberId,
  currentMemberIds,
  reassignTo,
  onReassignToChange,
  onConfirm,
  onCancel,
}: ReassignDialogProps) {
  const { data: employeesData } = useHrEmployees();
  const employees = useMemo(
    () => (Array.isArray(employeesData) ? employeesData : (employeesData?.data ?? [])),
    [employeesData],
  );

  const remainingMembers = useMemo(
    () => employees.filter((emp) => currentMemberIds.includes(emp.id) && emp.id !== removedMemberId),
    [employees, currentMemberIds, removedMemberId],
  );

  const handleOpenChange = useCallback(
    (o: boolean) => {
      if (!o) onCancel();
    },
    [onCancel]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-amber-500" />
            Reassign open tickets
          </DialogTitle>
          <DialogDescription>
            <strong>{memberName}</strong> has open tickets in this project.
            Choose a team member to reassign them to, or leave them unassigned.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Reassign to
          </p>
          <Select value={reassignTo} onValueChange={onReassignToChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a member…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unassign__">
                <span className="text-muted-foreground">Leave unassigned</span>
              </SelectItem>
              {remainingMembers.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name || emp.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel removal
          </Button>
          <Button size="sm" onClick={onConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DangerZoneSectionProps {
  projectName: string;
  isPending: boolean;
  deleteDialogOpen: boolean;
  onDeleteClick: () => void;
  onDeleteDialogChange: (open: boolean) => void;
  onDeleteConfirm: () => void;
}

export const DangerZoneSection = memo(function DangerZoneSection({
  projectName,
  isPending,
  deleteDialogOpen,
  onDeleteClick,
  onDeleteDialogChange,
  onDeleteConfirm,
}: DangerZoneSectionProps) {
  return (
    <Card className="border-destructive/30">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Danger Zone
        </div>
        <Separator />
        <p className="text-sm text-muted-foreground">
          Deleting a project is irreversible. It will remove all tickets,
          sprints, and associated data.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDeleteClick}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete Project
        </Button>
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={onDeleteDialogChange}
          title="Are you absolutely sure?"
          description={`This action cannot be undone. This will permanently delete "${projectName}" and remove all associated data.`}
          confirmLabel={isPending ? "Deleting..." : "Delete Project"}
          destructive
          onConfirm={onDeleteConfirm}
        />
      </CardContent>
    </Card>
  );
});
