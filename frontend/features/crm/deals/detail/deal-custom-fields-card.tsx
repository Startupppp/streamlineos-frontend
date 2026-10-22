"use client";

import { toast } from "sonner";
import { CustomFieldsSection } from "@/features/crm/shared/custom-fields-section";
import { useCan } from "@/hooks/api/access";
import { useUpdateDealCustomData } from "@/hooks/api/crm/deals";
import { getErrorMessage } from "@/lib/get-error-message";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";

interface DealCustomFieldsCardProps {
  dealId: number;
  customData: Record<string, unknown> | null | undefined;
}

export function DealCustomFieldsCard({ dealId, customData }: DealCustomFieldsCardProps) {
  const canUpdate = useCan("crm:deals:update");
  const update = useUpdateDealCustomData(dealId);

  function handleSave(next: Record<string, unknown>, onDone: () => void) {
    update.mutate(next, {
      onSuccess: () => {
        toast.success("Custom fields saved");
        onDone();
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <CustomFieldsSection
      entityType="deal"
      values={customData ?? {}}
      className={cn(CONTENT_PANEL_SOLID, "p-4")}
      edit={{ canEdit: canUpdate, isPending: update.isPending, onSave: handleSave }}
    />
  );
}
