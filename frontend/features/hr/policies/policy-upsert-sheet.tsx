"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { HrSheet } from "@/features/hr/hr-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateHrPolicy, useUpdateHrPolicy } from "@/hooks/api/hr/policies";
import {
  HR_POLICY_TYPES,
  POLICY_TYPE_LABELS,
} from "@/types/hr/policies";
import type { HrPolicy, HrPolicyType } from "@/types/hr/policies";
import { PolicyScopesEditor } from "./policy-scopes-editor";
import { PolicyRulesFields } from "./policy-rules-fields";
import { policyFormSchema, type PolicyFormValues } from "./policy-form-types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  policy?: HrPolicy;
}

const LABEL_CLASS = "text-xs font-semibold text-foreground/80 uppercase tracking-wider";

export function PolicyUpsertSheet({ open, onOpenChange, policy }: Props) {
  const isEdit = !!policy;
  const create = useCreateHrPolicy();
  const update = useUpdateHrPolicy();
  const isPending = create.isPending || update.isPending;

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: {
      policyType: "leave",
      name: "",
      description: "",
      effectiveFrom: new Date().toISOString().split("T")[0],
      effectiveTo: "",
      priority: 0,
      rules: {},
      scopes: [{ scopeType: "organization", scopeValue: "" }],
    },
  });

  useEffect(() => {
    if (!open) return;
    if (policy) {
      form.reset({
        policyType: policy.policyType,
        name: policy.name,
        description: policy.description ?? "",
        effectiveFrom: policy.effectiveFrom,
        effectiveTo: policy.effectiveTo ?? "",
        priority: policy.priority,
        rules: policy.rules,
        scopes: policy.scopes.map((s) => ({
          scopeType: s.scopeType,
          scopeValue: s.scopeValue,
        })),
      });
    } else {
      form.reset({
        policyType: "leave",
        name: "",
        description: "",
        effectiveFrom: new Date().toISOString().split("T")[0],
        effectiveTo: "",
        priority: 0,
        rules: {},
        scopes: [{ scopeType: "organization", scopeValue: "" }],
      });
    }
  }, [open, policy, form]);

  const onSubmit = useCallback(
    (data: PolicyFormValues) => {
      const payload = {
        policyType: data.policyType as HrPolicyType,
        name: data.name,
        description: data.description || undefined,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo || undefined,
        priority: data.priority,
        rules: data.rules,
        scopes: data.scopes,
      };

      if (isEdit && policy) {
        update.mutate(
          { id: policy.id, ...payload },
          {
            onSuccess: () => {
              toast.success("Policy updated");
              onOpenChange(false);
            },
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );
      } else {
        create.mutate(payload, {
          onSuccess: () => {
            toast.success("Policy created");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        });
      }
    },
    [isEdit, policy, create, update, onOpenChange],
  );

  const policyType = form.watch("policyType") as HrPolicyType;
  const isActive = policy?.status === "active";

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Policy" : "Create Policy"}
      description={
        isActive
          ? "Active policies are read-only. Create a new version to change rules."
          : "Define a new HR policy and its scope."
      }
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isEdit ? "Save Changes" : "Create Policy"}
      isPending={isPending}
      submitDisabled={isActive}
    >
      <Form {...form}>
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Basics
            </p>
            <FormField
              control={form.control}
              name="policyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLASS}>Policy Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isEdit || isActive}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {HR_POLICY_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-sm">
                          {POLICY_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLASS}>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Standard Leave Policy"
                      className="h-9 text-sm"
                      {...field}
                      disabled={isActive}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLASS}>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description"
                      className="text-sm resize-none min-h-[60px]"
                      {...field}
                      disabled={isActive}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Effective Window
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="effectiveFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_CLASS}>Effective From</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-9 text-sm" {...field} disabled={isActive} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="effectiveTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_CLASS}>Effective To</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-9 text-sm" {...field} disabled={isActive} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLASS}>Priority (higher wins on conflict)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={9999}
                      className="h-9 text-sm"
                      {...field}
                      disabled={isActive}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Rules
            </p>
            <PolicyRulesFields
              policyType={policyType}
              form={form}
              disabled={isActive}
            />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Scope
            </p>
            <FormField
              control={form.control}
              name="scopes"
              render={({ field }) => (
                <FormItem>
                  <PolicyScopesEditor
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isActive}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </Form>
    </HrSheet>
  );
}
