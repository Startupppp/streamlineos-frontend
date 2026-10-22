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
  source?: "hr" | "self";
  excludeUserId?: string;
  excludeUserIds?: string[];
  selected?: ManagerRef | null;
  placeholder?: string;
  disabled?: boolean;
  allowUnassigned?: boolean;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

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
  const data = source === "hr" ? hr.data : self.data;
  const items = data?.items ?? [];
  const ineligibleCount = data?.ineligibleCount ?? 0;

  const [picked, setPicked] = useState<ManagerRef | null>(null);
  const current = [selected, picked].find((ref) => ref?.userId === value) ?? null;
  const known = current ? [toOption(current)] : [];

  function handleChange(userId: string | null) {
    const ref = items.find((item) => item.userId === userId) ?? null;
    setPicked(ref);
    onChange(userId, ref);
  }

  return (
    <>
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
      {ineligibleCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {ineligibleCount === 1
            ? "1 person cannot be selected — complete their job details first."
            : `${ineligibleCount} people cannot be selected — complete their job details first.`}
        </p>
      )}
    </>
  );
}
