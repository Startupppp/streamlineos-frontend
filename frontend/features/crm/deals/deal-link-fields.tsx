"use client";

import { useMemo, useState } from "react";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { useCan } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useParties } from "@/hooks/api/party/parties";
import { useSubjects, useSubjectTypes } from "@/hooks/api/party/subjects";

/**
 * Everything a deal points at, and the reason it is not in the description.
 *
 * An owner, a party and a subject are references to other records, searched
 * against live endpoints and rendered as names. `FieldKind` has no reference
 * member and no way to name a source, so a generated form cannot produce one of
 * these — they sit beside `RecordForm` rather than inside it.
 *
 * Deliberately built on the plain `Label` rather than the `Form*` primitives:
 * those read react-hook-form context through `useFormField`, and this block now
 * renders outside the generated form's provider.
 */

export interface DealLinks {
  readonly assignedToId: string;
  readonly partyId: string;
  readonly subjectId: string;
}

interface DealLinkFieldsProps {
  value: DealLinks;
  onChange: (next: DealLinks) => void;
  /** Omitted where the surface has no people list to offer. */
  employees?: Array<{ id: string; name: string | null }>;
}

export function DealLinkFields({ value, onChange, employees }: DealLinkFieldsProps) {
  const canViewParties = useCan("party:parties:view");
  const canViewSubjects = useCan("party:subjects:view");

  const [partySearch, setPartySearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectTypeId, setSubjectTypeId] = useState("");

  const debouncedParty = useDebouncedValue(partySearch, 300);
  const debouncedSubject = useDebouncedValue(subjectSearch, 300);

  const { data: parties } = useParties({ limit: 50, search: debouncedParty || undefined });
  const { data: types } = useSubjectTypes({ enabled: canViewSubjects });
  const { data: subjects } = useSubjects({
    subjectTypeId: subjectTypeId || undefined,
    search: debouncedSubject || undefined,
    limit: 50,
  });

  const partyOptions = useMemo(
    () =>
      (parties?.data ?? []).map((party) => ({
        value: party.partyId,
        label: party.displayName ?? party.name,
      })),
    [parties],
  );

  const subjectOptions = useMemo(
    () =>
      (subjects?.data ?? []).map((subject) => ({
        value: subject.subjectId,
        label: subject.title,
      })),
    [subjects],
  );

  const declaredTypes = types?.data ?? [];
  const showSubjects = canViewSubjects && declaredTypes.length > 0;

  function handleAssigneeChange(assignedToId: string) {
    onChange({ ...value, assignedToId });
  }

  function handlePartyChange(partyId: string) {
    onChange({ ...value, partyId });
  }

  function handleSubjectChange(subjectId: string) {
    onChange({ ...value, subjectId });
  }

  if (!employees && !canViewParties && !showSubjects) return null;

  return (
    <div className="flex flex-col gap-gap-toolbar">
      <h3 className="text-label font-medium text-muted-foreground">Links</h3>

      {employees ? (
        <div className="grid gap-2">
          <Label>Owner</Label>
          <Select value={value.assignedToId} onValueChange={handleAssigneeChange}>
            <SelectTrigger className="w-full" aria-label="Owner">
              <SelectValue placeholder="Nobody yet" />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name ?? "Unnamed"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {canViewParties ? (
        <div className="grid gap-2">
          <Label>Party</Label>
          <Combobox
            options={partyOptions}
            value={value.partyId}
            onChange={handlePartyChange}
            onSearchChange={setPartySearch}
            placeholder="Link a customer, vendor or partner…"
            searchPlaceholder="Search parties…"
            emptyText="No parties match."
          />
          <p className="text-muted-foreground text-sm">
            The organisation this deal is with. Its activity and duplicates follow the
            party, not the deal.
          </p>
        </div>
      ) : null}

      {showSubjects ? (
        <div className="grid gap-2">
          <Label>Subject</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={subjectTypeId} onValueChange={setSubjectTypeId}>
              <SelectTrigger className="w-full" aria-label="Subject type">
                <SelectValue placeholder="Type…" />
              </SelectTrigger>
              <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                {declaredTypes.map((type) => (
                  <SelectItem key={type.subjectTypeId} value={type.subjectTypeId}>
                    {type.singular}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Combobox
              options={subjectOptions}
              value={value.subjectId}
              onChange={handleSubjectChange}
              onSearchChange={setSubjectSearch}
              disabled={!subjectTypeId}
              placeholder={subjectTypeId ? "Link a record…" : "Choose a type first"}
              searchPlaceholder="Search…"
              emptyText="No records match."
            />
          </div>
          <p className="text-muted-foreground text-sm">
            What the deal is actually about — a property, a vehicle, a position.
          </p>
        </div>
      ) : null}
    </div>
  );
}
