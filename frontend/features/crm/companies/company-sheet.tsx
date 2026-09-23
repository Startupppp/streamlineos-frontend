"use client";

import { toast } from "sonner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RecordForm, asRecordValue, type RecordFormValues } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { COMPANY_LAYOUT } from "@/lib/renderer/crm/company-layout";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateCrmOrganization, useUpdateCrmOrganization } from "@/hooks/api/crm";
import type {
  CreateCrmOrganizationInput,
  CrmAccountTier,
  CrmOrganization,
  OrgSize,
  UpdateCrmOrganizationInput,
} from "@/types/crm";

/**
 * Add and edit a company, rendered from the description.
 *
 * Editing used to be a link to `/crm/companies/:id/edit`, a route that has never
 * existed — the button was a 404. The form the layout already describes is the
 * same one create needs, so the sheet serves both and the dead link is gone.
 */

interface CompanySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: CrmOrganization;
}

const ORG_SIZES: readonly OrgSize[] = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
const ACCOUNT_TIERS: readonly CrmAccountTier[] = ["free", "pro", "enterprise"];

function asOrgSize(value: string | undefined): OrgSize | undefined {
  return ORG_SIZES.find((candidate) => candidate === value?.trim());
}

function asAccountTier(value: string | undefined): CrmAccountTier | undefined {
  return ACCOUNT_TIERS.find((candidate) => candidate === value?.trim());
}

/** Omitted keys never reach the wire, and create rejects anything it did not ask for. */
function orUndefined(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

/** Empty means "clear it" on update, which `undefined` cannot say. */
function orNull(value: string | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

/**
 * `organizationCreateSchema` validates both links as absolute URLs, and a `url`
 * field accepts a bare host — someone typing "example.com" got a 400 rather than
 * a company.
 */
function absolute(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function forCreate(values: RecordFormValues): CreateCrmOrganizationInput {
  return {
    name: values.name?.trim() ?? "",
    industry: orUndefined(values.industry),
    size: asOrgSize(values.size),
    domain: orUndefined(values.domain),
    website: absolute(orUndefined(values.website)),
    linkedinUrl: absolute(orUndefined(values.linkedinUrl)),
    description: orUndefined(values.description),
    tier: asAccountTier(values.tier),
  };
}

function forUpdate(values: RecordFormValues): UpdateCrmOrganizationInput {
  return {
    name: values.name?.trim(),
    industry: orNull(values.industry),
    size: asOrgSize(values.size) ?? null,
    domain: orNull(values.domain),
    website: absolute(orNull(values.website)) ?? null,
    linkedinUrl: absolute(orNull(values.linkedinUrl)) ?? null,
    description: orNull(values.description),
    tier: asAccountTier(values.tier) ?? null,
  };
}

export function CompanySheet({ open, onOpenChange, company }: CompanySheetProps) {
  const layout = useTenantLayout(COMPANY_LAYOUT);
  const createCompany = useCreateCrmOrganization();
  const updateCompany = useUpdateCrmOrganization();

  const isEditing = !!company;
  const isPending = createCompany.isPending || updateCompany.isPending;

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(values: RecordFormValues) {
    if (company) {
      updateCompany.mutate(
        { ...forUpdate(values), id: company.id },
        {
          onSuccess: () => {
            toast.success("Company updated");
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
      return;
    }

    createCompany.mutate(forCreate(values), {
      onSuccess: () => {
        toast.success("Company created");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{isEditing ? "Edit company" : "New company"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update this company's details."
              : "A company groups the contacts, leads and deals belonging to one account."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-6 py-5">
          <RecordForm
            key={`${company?.id ?? "new"}:${String(open)}`}
            layout={layout}
            mode={isEditing ? "edit" : "create"}
            initial={company ? asRecordValue(company) : undefined}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={isPending}
            submitLabel={isEditing ? "Save changes" : "Create company"}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
