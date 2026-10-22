"use client";

import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import { RecordForm, asRecordValue, type RecordFormValues } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { getErrorMessage } from "@/lib/get-error-message";
import { CAMPAIGN_LAYOUT } from "@/lib/renderer/crm/campaign-layout";
import { patchForUpdate } from "@/lib/renderer/layout-schema";
import { useCreateCampaign, useUpdateCampaign } from "@/hooks/api/crm/campaigns";
import type { CrmCampaign } from "@/types/crm/campaigns";

interface CampaignSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: CrmCampaign;
}

function orNull(value: string | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

export function CampaignSheet({ open, onOpenChange, campaign }: CampaignSheetProps) {
  const layout = useTenantLayout(CAMPAIGN_LAYOUT);
  const isEditing = !!campaign;
  const createMutation = useCreateCampaign();
  const updateMutation = useUpdateCampaign();
  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(values: RecordFormValues) {
    if (isEditing && campaign) {
      const patch = patchForUpdate(layout, values);
      updateMutation.mutate(
        { id: campaign.id, ...patch } as Parameters<typeof updateMutation.mutate>[0],
        {
          onSuccess: () => {
            toast.success("Campaign updated");
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
      return;
    }

    createMutation.mutate(
      {
        name: values.name?.trim() ?? "",
        channel: orNull(values.channel),
        utmCampaignKey: orNull(values.utmCampaignKey),
        budgetAllocated: orNull(values.budgetAllocated),
        startDate: orNull(values.startDate),
        endDate: orNull(values.endDate),
        description: orNull(values.description),
        targetAudience: orNull(values.targetAudience),
        ownerId: null,
      },
      {
        onSuccess: () => {
          toast.success("Campaign created");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{isEditing ? "Edit campaign" : "New campaign"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the campaign's details."
              : "A campaign groups the leads that came from one push, so you can see what it returned."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-6 py-5">
          <RecordForm
            layout={layout}
            mode={isEditing ? "edit" : "create"}
            initial={campaign ? asRecordValue(campaign) : undefined}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={isPending}
            submitLabel={isEditing ? "Save changes" : "Create campaign"}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
