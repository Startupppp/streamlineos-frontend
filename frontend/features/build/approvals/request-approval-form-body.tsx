"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ControllerRenderProps, UseFormReturn } from "react-hook-form";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorReference } from "@/components/shared/error-reference";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";
import { UserCombobox } from "@/components/ui/user-combobox";
import { DB_ENUMS } from "@/contracts/db-enums.generated";
import { entityTypeLabel, entityTypeSearchLabel } from "./approvals-constants";
import type { RequestApprovalValues } from "./approvals-schema";
import type { EntityItem, SelectionState } from "./use-entity-items";

const ENTITY_TYPES = DB_ENUMS.approval_entity_type.map((v) => ({
  value: v,
  label: entityTypeLabel(v),
  searchLabel: entityTypeSearchLabel(v),
}));

interface RequestApprovalFormBodyProps {
  form: UseFormReturn<RequestApprovalValues>;
  entityType: RequestApprovalValues["entityType"];
  entityItems: EntityItem[];
  entityFetching: boolean;
  selection: SelectionState;
  setSelection: Dispatch<SetStateAction<SelectionState>>;
  context: string;
  currentUserId?: string;
  projectId: number;
}

export function RequestApprovalFormBody({
  form,
  entityType,
  entityItems,
  entityFetching,
  selection,
  setSelection,
  context,
  currentUserId,
  projectId,
}: RequestApprovalFormBodyProps) {
  const showEntityPicker = entityType !== "budget";
  const isBudgetType = entityType === "budget";
  const activeEntityType = ENTITY_TYPES.find((t) => t.value === entityType);

  function renderEntityField({
    field,
  }: {
    field: ControllerRenderProps<RequestApprovalValues, "entityId">;
  }) {
    function handleEntityChange(value: string) {
      field.onChange(value);
      setSelection({
        context,
        task:
          entityType === "task" && value
            ? {
                id: value,
                version: entityItems.find((item) => item.value === value)
                  ?.version,
              }
            : null,
        error: null,
        blocked: false,
      });
    }
    return (
      <FormItem>
        <FormLabel>{activeEntityType?.label ?? "Item"}</FormLabel>
        <FormControl>
          <Combobox
            options={entityItems}
            value={field.value}
            onChange={handleEntityChange}
            placeholder={
              entityFetching
                ? "Loading…"
                : `Search ${activeEntityType?.searchLabel ?? "items"}…`
            }
            searchPlaceholder="Search by name…"
            emptyText={entityFetching ? "Loading…" : "No items found."}
            disabled={entityFetching}
          />
        </FormControl>
        <FormMessage />
        {entityType === "task" && selection.task && (
          <FormDescription>
            Ticket version{" "}
            {selection.task.version ?? "unavailable"} selected for this
            request.
          </FormDescription>
        )}
      </FormItem>
    );
  }

  return (
    <>
      {Boolean(selection.error) && (
        <div role="alert" className="text-sm text-destructive">
          {getErrorMessage(selection.error)}
          <ErrorReference error={selection.error} />
          {selection.blocked && (
            <p>
              Select the ticket again to review its current version. Your
              request fields are retained.
            </p>
          )}
        </div>
      )}
      <FormField
        control={form.control}
        name="entityType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Entity Type</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {ENTITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      {showEntityPicker && (
        <FormField
          control={form.control}
          name="entityId"
          render={renderEntityField}
        />
      )}
      {isBudgetType && (
        <FormField
          control={form.control}
          name="entityId"
          render={(_) => (
            <FormItem>
              <FormLabel>Budget</FormLabel>
              <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                {entityFetching
                  ? "Loading budget…"
                  : "Project Budget (auto-selected)"}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Describe what needs approval" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="approverId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Approver</FormLabel>
            <FormControl>
              <UserCombobox
                value={field.value}
                onChange={field.onChange}
                placeholder="Search for approver…"
                excludeUserId={currentUserId}
                projectId={projectId}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="reason"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Reason / Notes (optional)</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder="Provide context: risk, deadline, decision needed…"
                className="resize-none h-20 text-sm"
                maxLength={2000}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="dueAt"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Due Date (optional)</FormLabel>
            <FormControl>
              <DatePicker
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Pick a date"
                className="text-sm"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="level"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Approval Level</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="1">
                  Level 1 — Standard (team lead or peer review)
                </SelectItem>
                <SelectItem value="2">
                  Level 2 — Escalated (department manager)
                </SelectItem>
                <SelectItem value="3">
                  Level 3 — Executive (director or above)
                </SelectItem>
              </SelectContent>
            </Select>
            <FormDescription className="text-xs">
              Higher levels route the approval to more senior stakeholders.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
