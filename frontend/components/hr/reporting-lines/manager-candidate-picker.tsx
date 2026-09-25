"use client";

import { useState } from "react";
import { MemberPicker } from "@/components/members/member-picker";
import type { MemberOption } from "@/components/members/member-picker-options";
import { useManagerCandidates } from "@/hooks/api/hr/reporting-lines";
import { useMyManagerCandidates } from "@/hooks/api/hr/my-reporting-line";
import type { ManagerRef, ManagerState } from "@/hooks/api/hr/reporting-lines-schema";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

const STATE_LABEL: Record<ManagerState, string> = {
  active: "Active",
  "on-notice": "On notice",
  inactive: "Inactive",
  exited: "Exited",
};

export function describeManager(ref: Pick<ManagerRef, "designation" | "state">): string {
  return [ref.designation, STATE_LABEL[ref.state]].filter(Boolean).join(" · ");
}

function toOption(ref: ManagerRef): MemberOption {
  return {
    id: ref.userId,
    name: ref.name,
    firstName: null,
    lastName: null,
    email: ref.email ?? "",
    image: null,
    description: describeManager(ref),
  };
}

interface ManagerCandidatePickerProps {
  value: string | null;
  onChange: (userId: string | null, manager: ManagerRef | null) => void;
  /**
   * `hr` searches `/hr/reporting-lines/manager-candidates` (HR surfaces);
   * `self` searches the employee's own `/me/…/manager-candidates`, which excludes them.
   */
  source?: "hr" | "self";
  /** The employee the relationship is for — never offered as their own manager. */
  excludeUserId?: string;
  /** Other already-chosen managers (primary vs secondaries) to keep out of the list. */
  excludeUserIds?: string[];
  /** The currently selected manager, so the trigger can name it before any search. */
  selected?: ManagerRef | null;
  placeholder?: string;
  disabled?: boolean;
  allowUnassigned?: boolean;
  className?: string;
  /** Injected by `FormControl`; forwarded so the field label names the trigger. */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

/**
 * Every HRM-15 manager selector (PRD §9): active, accepted, in-tenant, eligible
 * members only, searched on the server, fetched only while the list is open.
 */
export function ManagerCandidatePicker({
  value,
  onChange,
  source = "hr",
  excludeUserId,
  excludeUserIds,
  selected,
  placeholder = "Search for a manager",
  disabled,
  allowUnassigned = false,
  className,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: ManagerCandidatePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 300);
  const hr = useManagerCandidates(debounced, excludeUserId, { enabled: open && source === "hr" });
  const self = useMyManagerCandidates(debounced, { enabled: open && source === "self" });
  const items = (source === "hr" ? hr.data?.items : self.data?.items) ?? [];

  // The manager last picked here, so the trigger keeps naming them after the search moves on.
  const [picked, setPicked] = useState<ManagerRef | null>(null);
  const current = [selected, picked].find((ref) => ref?.userId === value) ?? null;
  const known = current ? [toOption(current)] : [];

  function handleChange(userId: string | null) {
    const ref = items.find((item) => item.userId === userId) ?? null;
    setPicked(ref);
    onChange(userId, ref);
  }

  return (
    <MemberPicker
      value={value ?? ""}
      onChange={handleChange}
      candidates={items.map(toOption)}
      knownMembers={known}
      onSearchChange={setSearch}
      onOpenChange={setOpen}
      searchLabel="Search managers"
      excludeUserId={excludeUserId}
      excludeUserIds={excludeUserIds}
      placeholder={placeholder}
      disabled={disabled}
      allowUnassigned={allowUnassigned}
      className={className}
      id={id}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
    />
  );
}
