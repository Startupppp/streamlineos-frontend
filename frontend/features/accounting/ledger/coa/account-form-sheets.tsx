"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormSheet } from "@/components/shared";
import type { ComboboxOption } from "@/components/ui/combobox";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateAccount, useUpdateAccount } from "@/hooks/api/accounting/ledger";
import type { AccountNode } from "@/types/accounting-kernel";
import {
  createAccountFormSchema,
  editAccountFormSchema,
  type CreateAccountFormValues,
  type EditAccountFormValues,
} from "./account-form-schema";
import { CreateAccountFormFields } from "./account-form-fields";
import { EditAccountFormFields } from "./edit-account-form-fields";

interface CreateAccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentOptions: ComboboxOption[];
  currencyOptions: ComboboxOption[];
}

export function CreateAccountSheet({
  open,
  onOpenChange,
  parentOptions,
  currencyOptions,
}: CreateAccountSheetProps) {
  const createAccount = useCreateAccount();

  function handleSubmit(values: CreateAccountFormValues) {
    createAccount.mutate(
      {
        code: values.code,
        name: values.name,
        accountType: values.accountType,
        parentAccountId: values.parentAccountId === "" ? null : values.parentAccountId,
        isHeader: values.isHeader,
        isCash: values.isCash,
        currencyRestriction:
          values.currencyRestriction === "" ? null : values.currencyRestriction,
        description: values.description === "" ? null : values.description,
      },
      {
        onSuccess: () => {
          toast.success("Account created");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <EntityFormSheet<CreateAccountFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="New account"
      description="Accounts are how every figure on every report is grouped."
      resolver={zodResolver(createAccountFormSchema)}
      defaultValues={{
        code: "",
        name: "",
        accountType: "EXPENSE",
        parentAccountId: "",
        isHeader: false,
        isCash: false,
        currencyRestriction: "",
        description: "",
      }}
      onSubmit={handleSubmit}
      isSubmitting={createAccount.isPending}
      submitLabel="Create account"
      resetOnOpen
    >
      {(form) => (
        <CreateAccountFormFields
          form={form}
          parentOptions={parentOptions}
          currencyOptions={currencyOptions}
        />
      )}
    </EntityFormSheet>
  );
}

interface EditAccountSheetProps {
  account: AccountNode | null;
  onOpenChange: (open: boolean) => void;
  parentOptions: ComboboxOption[];
  currencyOptions: ComboboxOption[];
}

export function EditAccountSheet({
  account,
  onOpenChange,
  parentOptions,
  currencyOptions,
}: EditAccountSheetProps) {
  const updateAccount = useUpdateAccount();

  function handleSubmit(values: EditAccountFormValues) {
    if (!account) return;
    updateAccount.mutate(
      {
        accountId: account.id,
        input: {
          name: values.name,
          parentAccountId: values.parentAccountId === "" ? null : values.parentAccountId,
          isActive: values.isActive,
          isCash: values.isCash,
          currencyRestriction:
            values.currencyRestriction === "" ? null : values.currencyRestriction,
          description: values.description === "" ? null : values.description,
        },
      },
      {
        onSuccess: () => {
          toast.success("Account updated");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  if (!account) return null;

  return (
    <EntityFormSheet<EditAccountFormValues>
      open
      onOpenChange={onOpenChange}
      title={`${account.code} · ${account.name}`}
      description="The code and the kind of account cannot change once it exists."
      resolver={zodResolver(editAccountFormSchema)}
      defaultValues={{
        name: account.name,
        parentAccountId: account.parentAccountId ?? "",
        isCash: account.isCash,
        isActive: account.isActive,
        currencyRestriction: account.currencyRestriction ?? "",
        description: account.description ?? "",
      }}
      onSubmit={handleSubmit}
      isSubmitting={updateAccount.isPending}
      submitLabel="Save changes"
      resetOnOpen
    >
      {(form) => (
        <EditAccountFormFields
          form={form}
          parentOptions={parentOptions.filter((option) => option.value !== account.id)}
          currencyOptions={currencyOptions}
        />
      )}
    </EntityFormSheet>
  );
}
