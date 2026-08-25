"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNumberSequences, useUpdateNumberSequence } from "@/hooks/api/inventory/admin";
import type { NumberSequence } from "@/hooks/api/inventory/admin";

interface SequenceRowState {
  prefix: string;
  padding: number;
  nextNumber: number;
  nextNumberError: string;
}

function SequenceRow({
  seq,
  onSave,
  isSaving,
}: {
  seq: NumberSequence;
  onSave: (data: { prefix: string; padding: number; nextNumber: number }) => void;
  isSaving: boolean;
}) {
  const [state, setState] = React.useState<SequenceRowState>({
    prefix: seq.prefix,
    padding: seq.padding,
    nextNumber: seq.nextNumber,
    nextNumberError: "",
  });

  function handlePrefixChange(e: React.ChangeEvent<HTMLInputElement>) {
    setState((prev) => ({ ...prev, prefix: e.target.value }));
  }

  function handlePaddingChange(e: React.ChangeEvent<HTMLInputElement>) {
    setState((prev) => ({ ...prev, padding: parseInt(e.target.value) || 0 }));
  }

  function handleNextNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value) || 0;
    const error = val < seq.nextNumber ? `Cannot decrease below ${seq.nextNumber}` : "";
    setState((prev) => ({ ...prev, nextNumber: val, nextNumberError: error }));
  }

  function handleSave() {
    if (state.nextNumberError) return;
    onSave({ prefix: state.prefix, padding: state.padding, nextNumber: state.nextNumber });
  }

  const isDirty =
    state.prefix !== seq.prefix ||
    state.padding !== seq.padding ||
    state.nextNumber !== seq.nextNumber;

  return (
    <TableRow>
      <TableCell className="text-xs font-mono text-muted-foreground">{seq.sequenceType}</TableCell>
      <TableCell className="text-xs">{seq.label}</TableCell>
      <TableCell>
        <Input
          value={state.prefix}
          onChange={handlePrefixChange}
          className="w-24 text-xs"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={state.padding}
          onChange={handlePaddingChange}
          className="w-16 text-xs text-right"
          min={1}
        />
      </TableCell>
      <TableCell>
        <div>
          <Input
            type="number"
            value={state.nextNumber}
            onChange={handleNextNumberChange}
            className={`w-24 text-right ${state.nextNumberError ? "border-destructive" : ""}`}
            min={seq.nextNumber}
          />
          {state.nextNumberError && (
            <p className="text-micro text-destructive mt-0.5">{state.nextNumberError}</p>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={handleSave}
          disabled={!isDirty || isSaving || !!state.nextNumberError}
        >
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function NumberSequencesCard() {
  const { data: sequences, isLoading } = useNumberSequences();
  const updateMutation = useUpdateNumberSequence();
  const [savingId, setSavingId] = React.useState<number | null>(null);

  async function handleSave(
    sequenceId: number,
    data: { prefix: string; padding: number; nextNumber: number },
  ) {
    setSavingId(sequenceId);
    try {
      await updateMutation.mutateAsync({ sequenceId, data });
      toast.success("Sequence updated.");
    } catch {
      toast.error("Failed to update sequence.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Number Sequences</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map(function renderSkeleton(_, i) {
              return <Skeleton key={i} className="h-4 w-full" />;
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Padding</TableHead>
                  <TableHead>Next #</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sequences ?? []).map(function renderSeq(seq) {
                  return (
                    <SequenceRow
                      key={seq.id}
                      seq={seq}
                      onSave={(data) => handleSave(seq.id, data)}
                      isSaving={savingId === seq.id}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
