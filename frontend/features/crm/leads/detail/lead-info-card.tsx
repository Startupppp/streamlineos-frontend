"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomFieldsSection } from "@/features/crm/shared/custom-fields-section";
import { MessagingPanel } from "@/features/crm/shared/messaging-panel";
import { RecordDetail, RecordForm, type RecordFormValues } from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { useUpdateLead } from "@/hooks/api/leads";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { getErrorMessage } from "@/lib/get-error-message";
import { LEAD_LAYOUT } from "@/lib/renderer/crm/lead-layout";
import type { Lead, LeadPriority, LeadSource, UpdateLeadInput } from "@/types/leads";
import { toLeadRecord } from "../lead-record";

/**
 * One lead, read and written from the same description.
 *
 * This used to be a hand-written edit form over nine fields sitting above a
 * hand-written label/value list over six others, and the two disagreed: the form
 * could not reach `source`, `whatsappNumber` or `designation`, all of which the
 * update endpoint accepts, and the read view showed a source the form could
 * never correct. Both are now `LEAD_LAYOUT`, so they cannot drift again.
 *
 * The custom fields stay hand-mounted. Tenant-defined fields are a separate
 * mechanism with their own storage and their own editor; the layout describes
 * the record the API declares, and inventing entries for fields it does not know
 * about would be the description claiming more than it can render.
 */

const SOURCES: readonly LeadSource[] = [
  "referral",
  "campaign",
  "cold_call",
  "website",
  "social_media",
  "walk_in",
  "other",
];

const PRIORITIES: readonly LeadPriority[] = ["HOT", "WARM", "COLD"];

function toSource(value: string | undefined): LeadSource | undefined {
  return SOURCES.find((candidate) => candidate === value);
}

function toPriority(value: string | undefined): LeadPriority | undefined {
  return PRIORITIES.find((candidate) => candidate === value);
}

/** Empty means "clear it": the update endpoint stores what it is sent. */
function text(value: string | undefined): string {
  return value?.trim() ?? "";
}

interface LeadInfoCardProps {
  lead: Lead;
  entityId: number;
  isEditing: boolean;
  onEditingDone: () => void;
}

export function LeadInfoCard({ lead, entityId, isEditing, onEditingDone }: LeadInfoCardProps) {
  const layout = useTenantLayout(LEAD_LAYOUT);
  const money = useOrgDisplay();
  const updateLead = useUpdateLead();
  const record = useMemo(() => toLeadRecord(lead), [lead]);

  function handleSubmit(values: RecordFormValues) {
    const input: UpdateLeadInput = {
      id: entityId,
      name: text(values.name),
      email: text(values.email),
      phone: text(values.phone),
      whatsappNumber: text(values.whatsappNumber),
      company: text(values.company),
      designation: text(values.designation),
      city: text(values.city),
      source: toSource(values.source),
      priority: toPriority(values.priority),
      potentialValue: text(values.potentialValue),
      investmentInterest: text(values.investmentInterest),
      notes: text(values.notes),
      lostReason: text(values.lostReason),
    };

    updateLead.mutate(input, {
      onSuccess: () => {
        toast.success("Lead updated");
        onEditingDone();
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  if (isEditing)
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Edit lead</CardTitle>
        </CardHeader>
        <CardContent>
          <RecordForm
            layout={layout}
            mode="edit"
            initial={record}
            onSubmit={handleSubmit}
            onCancel={onEditingDone}
            isSubmitting={updateLead.isPending}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>
    );

  const messagingNumber = lead.phone ?? lead.whatsappNumber;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <RecordDetail layout={layout} record={record} money={money} showTitle={false} />

      {messagingNumber ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-label font-medium text-muted-foreground">Quick actions</h2>
          <MessagingPanel phone={messagingNumber} entityType="LEAD" entityId={entityId} />
        </section>
      ) : null}

      <CustomFieldsSection entityType="lead" values={lead.customFields ?? {}} />
    </div>
  );
}
