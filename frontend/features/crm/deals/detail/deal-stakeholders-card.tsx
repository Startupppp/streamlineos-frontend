"use client";

import { useState, useCallback, useMemo } from "react";
import { Star, Users } from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  useStakeholders,
  useCreateStakeholder,
  useDeleteStakeholder,
} from "@/hooks/api/crm/deals";
import { useContacts } from "@/hooks/api/crm/contacts";

const SELECT_NONE = "__none__";
import { NoPermissionState } from "@/components/shared";

interface StakeholderRowProps {
  id: string;
  name: string;
  title: string | null;
  roleKey: string | null;
  influence: string | null;
  isPrimary: boolean;
  onDelete: (id: string) => void;
}

function StakeholderRow({
  id,
  name,
  title,
  roleKey,
  influence,
  isPrimary,
  onDelete,
}: StakeholderRowProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleDeleteClick = useCallback(() => onDelete(id), [id, onDelete]);

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {isPrimary && (
            <Star className="h-3 w-3 fill-amber-400 text-status-warning-ink shrink-0" />
          )}
          <TruncatedText text={name} className="text-sm font-medium" />
        </div>
        {title && (
          <TruncatedText text={title} className="text-xs text-muted-foreground" />
        )}
        <div className="flex gap-1 mt-1 flex-wrap">
          {roleKey && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {roleKey.replace(/_/g, " ")}
            </Badge>
          )}
          {influence && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {influence}
            </Badge>
          )}
        </div>
      </div>
      <button
        onClick={handleDeleteClick}
        className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5"
        aria-label="Remove stakeholder"
        {...hoverHandlers}
      >
        <Trash2Icon ref={iconRef} size={14} />
      </button>
    </div>
  );
}

interface DealStakeholdersCardProps {
  dealId: number;
}

export function DealStakeholdersCard({ dealId }: DealStakeholdersCardProps) {
  const { data: stakeholders = [], isLoading: stakeholdersLoading, access } =
    useStakeholders(dealId);
  const createStakeholder = useCreateStakeholder(dealId);
  const deleteStakeholder = useDeleteStakeholder(dealId);
  const [adding, setAdding] = useState(false);
  const [contactId, setContactId] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [roleKey, setRoleKey] = useState(SELECT_NONE);
  const [influence, setInfluence] = useState(SELECT_NONE);
  const [isPrimary, setIsPrimary] = useState(false);
  const { iconRef: addIconRef, hoverHandlers: addHoverHandlers } =
    useAnimatedIcon();

  const debouncedContactSearch = useDebouncedValue(contactSearch, 300);
  const { data: contactsData } = useContacts({
    search: debouncedContactSearch || undefined,
    limit: 20,
  });
  const contactOptions = useMemo(
    () =>
      (contactsData?.items ?? []).map((c) => ({
        value: String(c.id),
        label: c.name,
        sublabel: c.email ?? c.company ?? undefined,
      })),
    [contactsData],
  );

  const handleStartAdding = useCallback(() => setAdding(true), []);

  const handleCancel = useCallback(() => {
    setAdding(false);
    setContactId("");
    setContactSearch("");
    setRoleKey(SELECT_NONE);
    setInfluence(SELECT_NONE);
    setIsPrimary(false);
  }, []);

  const handleAdd = useCallback(() => {
    const id = Number(contactId);
    if (!id) {
      toast.error("Select a contact");
      return;
    }
    createStakeholder.mutate(
      {
        contactId: id,
        roleKey: roleKey !== SELECT_NONE ? roleKey : null,
        influence: influence !== SELECT_NONE ? influence : null,
        isPrimary,
      },
      {
        onSuccess: () => {
          toast.success("Stakeholder added");
          handleCancel();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [
    contactId,
    roleKey,
    influence,
    isPrimary,
    createStakeholder,
    handleCancel,
  ]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteStakeholder.mutate(id, {
        onSuccess: () => toast.success("Stakeholder removed"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [deleteStakeholder],
  );

  const handleContactChange = useCallback((v: string) => setContactId(v), []);
  const handleRoleKeyChange = useCallback((v: string) => setRoleKey(v), []);
  const handleInfluenceChange = useCallback((v: string) => setInfluence(v), []);

  return (
    <Card className="shadow-noir">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Stakeholders
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          onClick={handleStartAdding}
          aria-label="Add stakeholder"
          {...addHoverHandlers}
        >
          <PlusIcon ref={addIconRef} size={14} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <div className="space-y-2 rounded-md border p-3 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Contact</Label>
              <Combobox
                options={contactOptions}
                value={contactId}
                onChange={handleContactChange}
                placeholder="Select contact…"
                searchPlaceholder="Search contacts…"
                emptyText="No contacts found."
                className="mt-1"
                onSearchChange={setContactSearch}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Select value={roleKey} onValueChange={handleRoleKeyChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>None</SelectItem>
                  <SelectItem value="decision_maker">Decision Maker</SelectItem>
                  <SelectItem value="influencer">Influencer</SelectItem>
                  <SelectItem value="champion">Champion</SelectItem>
                  <SelectItem value="blocker">Blocker</SelectItem>
                  <SelectItem value="evaluator">Evaluator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Influence</Label>
              <Select value={influence} onValueChange={handleInfluenceChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select influence..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>None</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <LoadingButton
                size="sm"
                onClick={handleAdd}
                isPending={createStakeholder.isPending}
              >
                Add
              </LoadingButton>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {access.denied ? (
          <NoPermissionState permission={access.permission} compact />
        ) : stakeholdersLoading ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : stakeholders.length === 0 && !adding ? (
          <p className="text-xs text-muted-foreground">
            No stakeholders yet. Add the people who decide, approve or block
            this deal.
          </p>
        ) : (
          stakeholders.map((s) => (
            <StakeholderRow
              key={s.id}
              id={s.id}
              name={s.contact.name}
              title={s.contact.title}
              roleKey={s.roleKey}
              influence={s.influence}
              isPrimary={s.isPrimary}
              onDelete={handleDelete}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
