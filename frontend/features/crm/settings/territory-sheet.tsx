"use client";

import { useMemo, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  RecordForm,
  type RecordFieldControl,
  type RecordFormValues,
} from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import {
  useCreateTerritory,
  useUpdateTerritory,
  type Territory,
  type TerritoryCriteria,
} from "@/hooks/api/crm-settings";
import { getErrorMessage } from "@/lib/get-error-message";
import { TERRITORY_LAYOUT } from "@/lib/renderer/crm/settings/territory-layout";
import { ChipControl } from "./shared/chip-control";
import {
  flagOr,
  flagOrOmit,
  listValue,
  numberOr,
  numberOrOmit,
  requiredText,
  textOrNull,
  textOrOmit,
} from "./shared/record-payload";

/**
 * Create and edit a territory, rendered from the description.
 *
 * Eight chip editors are supplied through `controls`; nothing else about this
 * form is written here. What the sheet still owns is the one thing a description
 * cannot express — that `criteria` is a single stored object, so an update has
 * to overlay the fields the form rendered onto the ones it did not. Sending a
 * criteria object built only from what was on screen would silently drop the
 * postal codes of anyone who had hidden that field.
 */

const CRITERIA_PLACEHOLDERS: Record<string, string> = {
  countries: "India, Singapore… press Enter",
  states: "Maharashtra, Karnataka…",
  cities: "Mumbai, Bengaluru…",
  postalCodes: "400001, 560001…",
  industries: "Technology, Finance…",
  companySizes: "1-10, 11-50…",
  productKeys: "CRM, ERP…",
  accountTypes: "enterprise, smb…",
};

const CRITERIA_FIELDS = Object.keys(CRITERIA_PLACEHOLDERS);

interface TerritorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  territory: Territory | null;
}

function initialValues(territory: Territory): Record<string, unknown> {
  const criteria = territory.criteria;
  return {
    name: territory.name,
    description: territory.description ?? "",
    priority: territory.priority,
    isActive: territory.isActive,
    countries: criteria.countries ?? [],
    states: criteria.states ?? territory.states,
    cities: criteria.cities ?? territory.cities,
    postalCodes: criteria.postalCodes ?? [],
    industries: criteria.industries ?? [],
    companySizes: criteria.companySizes ?? [],
    productKeys: criteria.productKeys ?? [],
    accountTypes: criteria.accountTypes ?? [],
  };
}

/** Only the criteria the form actually rendered, overlaid on what is stored. */
function criteriaFrom(values: RecordFormValues, stored?: TerritoryCriteria): TerritoryCriteria {
  const next: TerritoryCriteria = { ...stored };
  for (const name of CRITERIA_FIELDS) {
    const entries = listValue(values, name);
    if (entries === undefined) continue;
    Object.assign(next, { [name]: entries.length > 0 ? entries : undefined });
  }
  return next;
}

export function TerritorySheet({ open, onOpenChange, territory }: TerritorySheetProps) {
  const layout = useTenantLayout(TERRITORY_LAYOUT);
  const createTerritory = useCreateTerritory();
  const updateTerritory = useUpdateTerritory();
  const isEditing = territory !== null;
  const isPending = createTerritory.isPending || updateTerritory.isPending;

  const controls = useMemo(() => {
    const map: Record<string, (control: RecordFieldControl) => ReactNode> = {};
    for (const name of CRITERIA_FIELDS)
      map[name] = (control: RecordFieldControl) => (
        <ChipControl
          value={control.value}
          onChange={control.onChange}
          disabled={control.disabled}
          placeholder={CRITERIA_PLACEHOLDERS[name]}
        />
      );
    return map;
  }, []);

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(values: RecordFormValues) {
    const criteria = criteriaFrom(values, territory?.criteria);

    if (territory) {
      updateTerritory.mutate(
        {
          id: territory.id,
          name: textOrOmit(values, "name"),
          description: textOrNull(values, "description"),
          priority: numberOrOmit(values, "priority"),
          isActive: flagOrOmit(values, "isActive"),
          criteria,
        },
        {
          onSuccess: () => {
            toast.success("Territory updated");
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
      return;
    }

    createTerritory.mutate(
      {
        name: requiredText(values, "name"),
        description: textOrOmit(values, "description"),
        priority: numberOr(values, "priority", 0),
        isActive: flagOr(values, "isActive", true),
        criteria,
      },
      {
        onSuccess: () => {
          toast.success("Territory created");
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
          <SheetTitle>{isEditing ? "Edit territory" : "New territory"}</SheetTitle>
          <SheetDescription>
            A territory routes a lead to the reps who cover it. Type a value and press Enter or
            comma to add it.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-6 py-5">
          <RecordForm
            key={territory?.id ?? "new"}
            layout={layout}
            mode={isEditing ? "edit" : "create"}
            initial={territory ? initialValues(territory) : { priority: "0", isActive: "true" }}
            controls={controls}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={isPending}
            submitLabel={isEditing ? "Save changes" : "Create territory"}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
