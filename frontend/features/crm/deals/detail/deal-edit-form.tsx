"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Deal } from "@/types/crm";
import { DealForm, type DealSubmission } from "../deal-form";

/**
 * The edit surface, which is now a heading and a description.
 *
 * The fields, their controls and their validation come from `DEAL_LAYOUT`, so a
 * field added to the deal appears here and in the create sheet without this file
 * being touched. `lostReason` and `actualCloseDate` are present because editing
 * is when they exist; the old form guessed at that with a `deal.stage === "LOST"`
 * check against a stage key no tenant is obliged to keep.
 */

interface DealEditFormProps {
  deal: Deal;
  isPending: boolean;
  onSubmit: (submission: DealSubmission) => void;
  onCancel: () => void;
}

export function DealEditForm({ deal, isPending, onSubmit, onCancel }: DealEditFormProps) {
  return (
    <Card className="shadow-noir">
      <CardHeader>
        <CardTitle className="text-base">Edit deal</CardTitle>
      </CardHeader>
      <CardContent>
        <DealForm
          /* Remounted per deal so the side panel cannot keep the last one's values. */
          key={deal.id}
          mode="edit"
          deal={deal}
          isSubmitting={isPending}
          submitLabel="Save changes"
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      </CardContent>
    </Card>
  );
}
