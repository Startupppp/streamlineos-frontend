"use client";

import { Undo2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import type { ImportProgress } from "@/types/crm/import";

interface ImportCommittedCardProps {
  committed: ImportProgress;
  revertIsPending: boolean;
  onRevert(): void;
}

export function ImportCommittedCard({ committed, revertIsPending, onRevert }: ImportCommittedCardProps) {
  return (
    <Card className="border-status-success-rule">
      <CardHeader>
        <CardTitle>Imported</CardTitle>
        <CardDescription>
          {committed.created} created, {committed.updated} updated. If it is not what you
          wanted, take the whole thing back — records it created are removed and records it
          changed go back exactly as they were.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoadingButton
          type="button"
          variant="outline"
          isPending={revertIsPending}
          onClick={onRevert}
        >
          <Undo2 className="mr-1.5 size-4" aria-hidden />
          Undo this import
        </LoadingButton>
      </CardContent>
    </Card>
  );
}
