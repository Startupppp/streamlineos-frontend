"use client";

import { useMemo, useState } from "react";
import { Combobox } from "@/components/ui/combobox";
import { FormDescription, FormItem, FormLabel } from "@/components/ui/form";
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

interface DealLinkFieldsProps {
  partyId: string;
  subjectId: string;
  onPartyChange: (partyId: string) => void;
  onSubjectChange: (subjectId: string) => void;
}

export function DealLinkFields({
  partyId,
  subjectId,
  onPartyChange,
  onSubjectChange,
}: DealLinkFieldsProps) {
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

  return (
    <>
      {canViewParties ? (
        <FormItem>
          <FormLabel>Party</FormLabel>
          <Combobox
            options={partyOptions}
            value={partyId}
            onChange={onPartyChange}
            onSearchChange={setPartySearch}
            placeholder="Link a customer, vendor or partner…"
            searchPlaceholder="Search parties…"
            emptyText="No parties match."
          />
          <FormDescription>
            The organisation this deal is with. Its activity and duplicates follow the
            party, not the deal.
          </FormDescription>
        </FormItem>
      ) : null}

      {/* Only where relevant: a tenant that has declared no subject types has
          nothing to link, so the control does not appear at all. */}
      {canViewSubjects && declaredTypes.length > 0 ? (
        <FormItem>
          <FormLabel>Subject</FormLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={subjectTypeId} onValueChange={setSubjectTypeId}>
              <SelectTrigger className="w-full">
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
              value={subjectId}
              onChange={onSubjectChange}
              onSearchChange={setSubjectSearch}
              disabled={!subjectTypeId}
              placeholder={subjectTypeId ? "Link a record…" : "Choose a type first"}
              searchPlaceholder="Search…"
              emptyText="No records match."
            />
          </div>
          <FormDescription>
            What the deal is actually about — a property, a vehicle, a position.
          </FormDescription>
        </FormItem>
      ) : null}
    </>
  );
}
