"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { useParties } from "@/hooks/api/party/parties";
import { useLinkParty } from "@/hooks/api/party/subjects";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";

export interface LinkPartyControlProps {
  subjectId: string;
  subjectSingular: string;
}

/**
 * Attaching a party to a subject.
 *
 * The relationship is free text on purpose — an estate agency's OWNER and BUYER
 * and a recruiter's CANDIDATE and EMPLOYER are the same column, and constraining
 * it to a fixed list would be the exact assumption ticket 07 exists to avoid.
 * It is uppercased on the way out because the API requires snake case.
 */
export function LinkPartyControl({ subjectId, subjectSingular }: LinkPartyControlProps) {
  const [open, setOpen] = useState(false);
  const [partyId, setPartyId] = useState("");
  const [relationship, setRelationship] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const parties = useParties({ page: 1, limit: 20, search: debouncedSearch || undefined });
  const linkParty = useLinkParty();

  const options = (parties.data?.data ?? []).map((party) => ({
    value: party.partyId,
    label: party.name,
    ...(party.legalName ? { sublabel: party.legalName } : {}),
  }));

  function handleToggle() {
    setOpen((wasOpen) => !wasOpen);
  }

  function handleSubmit() {
    const trimmed = relationship.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (!partyId || !trimmed) return;

    linkParty.mutate(
      { subjectId, partyId, relationship: trimmed },
      {
        onSuccess: () => {
          toast.success("Party linked");
          setPartyId("");
          setRelationship("");
          setOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  if (!open)
    return (
      <Button variant="outline" size="sm" className="w-fit" onClick={handleToggle}>
        <Plus className="mr-1 h-3 w-3" /> Link a party
      </Button>
    );

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <Combobox
        options={options}
        value={partyId}
        onChange={setPartyId}
        placeholder="Choose a party…"
        searchPlaceholder="Search parties…"
        emptyText="No parties found."
        onSearchChange={setSearch}
      />
      <Input
        placeholder={`How are they involved? e.g. OWNER, BUYER`}
        value={relationship}
        onChange={(event) => setRelationship(event.target.value)}
        aria-label={`Relationship to this ${subjectSingular.toLowerCase()}`}
      />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={handleToggle} disabled={linkParty.isPending}>
          Cancel
        </Button>
        <LoadingButton
          size="sm"
          isPending={linkParty.isPending}
          disabled={!partyId || !relationship.trim()}
          onClick={handleSubmit}
        >
          Link
        </LoadingButton>
      </div>
    </div>
  );
}
