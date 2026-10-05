"use client";

import type { Control } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectMemberSelect } from "@/components/members/project-member-select";
import { CR_STATUSES, CR_STATUS_LABELS, type ChangeRequestFormValues } from "./change-request-schema";
import { ChangeRequestAffectedTickets } from "./change-request-affected-tickets";

interface ChangeRequestEditFieldsProps {
  control: Control<ChangeRequestFormValues>;
  projectId: number;
  changeRequestId: number;
}

export function ChangeRequestEditFields({ control, projectId, changeRequestId }: ChangeRequestEditFieldsProps) {
  return (
    <>
      <FormField
        control={control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-dense">Status</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {CR_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{CR_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage className="text-micro" />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-3 gap-3">
        <FormField
          control={control}
          name="estimateHours"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-dense">Estimate (hrs)</FormLabel>
              <FormControl>
                <Input {...field} type="number" step="0.5" className="text-dense" placeholder="0" />
              </FormControl>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="budgetRs"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-dense">Budget (₹)</FormLabel>
              <FormControl>
                <Input {...field} type="number" step="1" className="text-dense" placeholder="0" />
              </FormControl>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="timelineDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-dense">Timeline (days)</FormLabel>
              <FormControl>
                <Input {...field} type="number" className="text-dense" placeholder="0" />
              </FormControl>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={control}
        name="approvalOwnerId"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-dense">Approval Owner</FormLabel>
            <ProjectMemberSelect
              projectId={projectId}
              mode="single"
              value={field.value === "none" ? "" : field.value}
              onChange={(v) => field.onChange(v ?? "none")}
              allowUnassigned
              placeholder="Unassigned"
              className="text-dense"
            />
            <FormMessage className="text-micro" />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="decisionComment"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-dense">Decision Comment</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                className="text-dense min-h-[56px] resize-none"
                placeholder="Approve/reject reasoning..."
              />
            </FormControl>
            <FormMessage className="text-micro" />
          </FormItem>
        )}
      />
      <ChangeRequestAffectedTickets projectId={projectId} changeRequestId={changeRequestId} />
    </>
  );
}
