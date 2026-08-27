"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useDealCompetitors,
  useAddDealCompetitor,
  useDeleteDealCompetitor,
} from "@/hooks/api/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { NoPermissionState } from "@/components/shared";

interface DealCompetitorsCardProps {
  dealId: number;
}

export function DealCompetitorsCard({ dealId }: DealCompetitorsCardProps) {
  const { data: competitors = [], access } = useDealCompetitors(dealId);
  const addCompetitor = useAddDealCompetitor(dealId);
  const deleteCompetitor = useDeleteDealCompetitor(dealId);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const handleAdd = useCallback(() => {
    if (!draft.trim()) return;
    addCompetitor.mutate(
      { competitorKey: draft.trim() },
      {
        onSuccess: () => {
          toast.success("Competitor tracked");
          setDraft("");
          setAdding(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [draft, addCompetitor]);

  const handleDraftChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value),
    [],
  );

  const handleStartAdding = useCallback(() => setAdding(true), []);

  const handleCancelAdding = useCallback(() => {
    setAdding(false);
    setDraft("");
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      deleteCompetitor.mutate(id, {
        onSuccess: () => toast.success("Competitor removed"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [deleteCompetitor],
  );

  return (
    <Card className="shadow-noir">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Competitors</CardTitle>
        <Button variant="ghost" size="icon" className="w-7" aria-label="Add competitor" onClick={handleStartAdding}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {adding && (
          <div className="flex gap-1.5">
            <Input
              value={draft}
              onChange={handleDraftChange}
              placeholder="Competitor name..."
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") handleCancelAdding();
              }}
            />
            <LoadingButton size="sm" className="px-2" onClick={handleAdd} isPending={addCompetitor.isPending}>
              Add
            </LoadingButton>
          </div>
        )}
        {access.denied ? (
          <NoPermissionState permission={access.permission} compact />
        ) : competitors.length === 0 && !adding ? (
          <p className="text-xs text-muted-foreground">No competitors tracked.</p>
        ) : (
          competitors.map((c) => (
            <div key={c.id} className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">{c.competitorKey}</Badge>
              <button
                onClick={() => handleDelete(c.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Remove competitor"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
