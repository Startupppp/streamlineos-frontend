"use client";

import { useState, useCallback } from "react";
import { Star, Trash2, Plus, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useStakeholders, useCreateStakeholder, useDeleteStakeholder } from "@/hooks/api/crm/deals";

const SELECT_NONE = "__none__";

interface StakeholderRowProps {
  id: string;
  name: string;
  title: string | null;
  roleKey: string | null;
  influence: string | null;
  isPrimary: boolean;
  onDelete: (id: string) => void;
}

function StakeholderRow({ id, name, title, roleKey, influence, isPrimary, onDelete }: StakeholderRowProps) {
  const handleDeleteClick = useCallback(() => onDelete(id), [id, onDelete]);

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {isPrimary && <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />}
          <p className="text-sm font-medium truncate">{name}</p>
        </div>
        {title && <p className="text-xs text-muted-foreground truncate">{title}</p>}
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
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface DealStakeholdersCardProps {
  dealId: number;
}

export function DealStakeholdersCard({ dealId }: DealStakeholdersCardProps) {
  const { data: stakeholders = [] } = useStakeholders(dealId);
  const createStakeholder = useCreateStakeholder(dealId);
  const deleteStakeholder = useDeleteStakeholder(dealId);
  const [adding, setAdding] = useState(false);
  const [contactId, setContactId] = useState("");
  const [roleKey, setRoleKey] = useState(SELECT_NONE);
  const [influence, setInfluence] = useState(SELECT_NONE);
  const [isPrimary, setIsPrimary] = useState(false);

  const handleStartAdding = useCallback(() => setAdding(true), []);

  const handleCancel = useCallback(() => {
    setAdding(false);
    setContactId("");
    setRoleKey(SELECT_NONE);
    setInfluence(SELECT_NONE);
    setIsPrimary(false);
  }, []);

  const handleAdd = useCallback(() => {
    const id = Number(contactId);
    if (!id) {
      toast.error("Enter a valid contact ID");
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
  }, [contactId, roleKey, influence, isPrimary, createStakeholder, handleCancel]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteStakeholder.mutate(id, {
        onSuccess: () => toast.success("Stakeholder removed"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [deleteStakeholder],
  );

  const handleContactIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setContactId(e.target.value), []);
  const handleRoleKeyChange = useCallback((v: string) => setRoleKey(v), []);
  const handleInfluenceChange = useCallback((v: string) => setInfluence(v), []);

  return (
    <Card className="shadow-noir">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Stakeholders
        </CardTitle>
        <Button variant="ghost" size="icon" className="w-7" onClick={handleStartAdding}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <div className="space-y-2 rounded-md border p-3 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Contact ID</Label>
              <Input
                value={contactId}
                onChange={handleContactIdChange}
                placeholder="Contact ID..."
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Select value={roleKey} onValueChange={handleRoleKeyChange}>
                <SelectTrigger className="mt-1 h-8 text-sm">
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
                <SelectTrigger className="mt-1 h-8 text-sm">
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
              <Button size="sm" className="" onClick={handleAdd} disabled={createStakeholder.isPending}>
                Add
              </Button>
              <Button size="sm" variant="ghost" className="" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {stakeholders.length === 0 && !adding ? (
          <p className="text-xs text-muted-foreground">No stakeholders added.</p>
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
