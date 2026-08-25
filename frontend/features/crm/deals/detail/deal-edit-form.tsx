"use client";

import { useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dealEditSchema, type EditFormValues } from "./deal-edit-form-schema";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { useCrmStages } from "@/hooks/api/crm/metadata";
import { DealLinkFields } from "../deal-link-fields";

export type { EditFormValues };

export interface DealForEditForm {
  name: string;
  value?: string | null;
  stage: string;
  probability?: number | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  expectedCloseDate?: string | null;
  notes?: string | null;
  lostReason?: string | null;
  partyId?: string | null;
  subjectId?: string | null;
}

interface DealEditFormProps {
  deal: DealForEditForm;
  isPending: boolean;
  onSubmit: (data: EditFormValues) => void;
  onCancel: () => void;
  hideActions?: boolean;
}

export function DealEditForm({ deal, isPending, onSubmit, onCancel }: DealEditFormProps) {
  const { data: dealStages = [] } = useCrmStages("deal");
  const form = useForm<EditFormValues>({
    resolver: zodResolver(dealEditSchema),
    values: {
      name: deal.name,
      value: deal.value ??"0",
      stage: deal.stage,
      probability: deal.probability != null ? String(deal.probability) : "",
      contactPerson: deal.contactPerson ??"",
      contactEmail: deal.contactEmail ??"",
      contactPhone: deal.contactPhone ??"",
      expectedCloseDate: deal.expectedCloseDate ??"",
      notes: deal.notes ??"",
      lostReason: deal.lostReason ??"",
      partyId: deal.partyId ??"",
      subjectId: deal.subjectId ??"",
    },
  });

  const linkedPartyId = useWatch({ control: form.control, name: "partyId" });
  const linkedSubjectId = useWatch({ control: form.control, name: "subjectId" });

  const handlePartyChange = useCallback(
    (partyId: string) => form.setValue("partyId", partyId, { shouldDirty: true }),
    [form],
  );
  const handleSubjectChange = useCallback(
    (subjectId: string) => form.setValue("subjectId", subjectId, { shouldDirty: true }),
    [form],
  );

  const handleSubmit = useCallback(
    (data: EditFormValues) => onSubmit(data),
    [onSubmit],
  );

  return (
    <Card className="shadow-noir">
      <CardHeader>
        <CardTitle className="text-base">Edit Deal</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem>
                  <FormLabel>Value (INR)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="stage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dealStages.map(s => (
                        <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="probability" render={({ field }) => (
                <FormItem>
                  <FormLabel>Probability (%)</FormLabel>
                  <FormControl><Input type="number" min={0} max={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="expectedCloseDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Close</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value ??""} onChange={field.onChange} placeholder="Expected close date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="contactPerson" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="contactEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="contactPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {deal.stage ==="LOST" && (
                <FormField control={form.control} name="lostReason" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lost Reason</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <div className="col-span-2">
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea {...field} rows={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
            <DealLinkFields
              partyId={linkedPartyId ?? ""}
              subjectId={linkedSubjectId ?? ""}
              onPartyChange={handlePartyChange}
              onSubjectChange={handleSubjectChange}
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
              <LoadingButton type="submit" isPending={isPending} loadingText="Saving...">
                Save Changes
              </LoadingButton>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
