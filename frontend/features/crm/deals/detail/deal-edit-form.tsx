"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Deal } from "@/types/crm";
import { DealForm, type DealSubmission } from "../deal-form";


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
