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

/**
 * Create and edit a campaign, rendered from the description.
 *
 * There is no form here and no schema beside it. The controls, their types and
 * their validation come from `CAMPAIGN_LAYOUT`, which is the same description
 * the list renders — so the two cannot disagree about what a campaign is, and a
 * field added to one appears in the other without this file being touched.
 *
 * `status`, `spend`, `leads` and `roi` never appear, and not because this file
 * omits them: the description marks them read-only because neither create nor
 * update accepts them. A control whose value the API silently drops is a form
 * that appears to work and does not.
 */

interface CampaignSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: CrmCampaign;
}

/** Empty means "not supplied" on create and "clear it" on edit. */
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
      /*
        Built from the layout rather than from a list of keys written out here.
        A field the tenant hid is not rendered, so `values` has no entry for it;
        naming the keys would read undefined, send null, and clear a column
        nobody touched. Absent means "leave alone" — which is what hiding meant.
      */
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

    // Nothing exists yet, so a blank field has nothing to clear and the create
    // DTO wants every key.
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
