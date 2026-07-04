"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreatePayslipTemplate,
  useUpdatePayslipTemplate,
} from "@/hooks/api/payroll";
import type { PayslipLayout, PayslipTemplate, PayslipTemplateConfig } from "@/types/payroll";

const ACCENT_PRESETS = [
  "#0b1220",
  "#3b82f6",
  "#0f2b7f",
  "#1e293b",
  "#7c3aed",
  "#065f46",
] as const;

const LAYOUT_OPTIONS: { value: PayslipLayout; label: string }[] = [
  { value: "CLASSIC", label: "Classic" },
  { value: "MODERN", label: "Modern" },
  { value: "COMPLIANCE", label: "Compliance" },
];

interface TemplateFormState {
  name: string;
  layout: PayslipLayout;
  accent: string;
  showEmployerContributions: boolean;
  showYtd: boolean;
  isDefault: boolean;
}

function buildDefaultState(template?: PayslipTemplate): TemplateFormState {
  return {
    name: template?.name ?? "",
    layout: template?.layout ?? "CLASSIC",
    accent: template?.config.accent ?? "#0b1220",
    showEmployerContributions: template?.config.showEmployerContributions ?? true,
    showYtd: template?.config.showYtd ?? true,
    isDefault: template?.isDefault ?? false,
  };
}

interface TemplateEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: PayslipTemplate;
}

export function TemplateEditSheet({ open, onOpenChange, template }: TemplateEditSheetProps) {
  const isEdit = template !== undefined;
  const [form, setForm] = useState<TemplateFormState>(() => buildDefaultState(template));

  useEffect(() => {
    if (open) {
      setForm(buildDefaultState(template));
    }
  }, [open, template]);

  const createMutation = useCreatePayslipTemplate();
  const updateMutation = useUpdatePayslipTemplate();
  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, name: e.target.value }));
  }

  function handleLayoutChange(value: string) {
    setForm((prev) => ({ ...prev, layout: value as PayslipLayout }));
  }

  function handleAccentSelect(preset: string) {
    setForm((prev) => ({ ...prev, accent: preset }));
  }

  function handleEmployerContribChange(checked: boolean) {
    setForm((prev) => ({ ...prev, showEmployerContributions: checked }));
  }

  function handleYtdChange(checked: boolean) {
    setForm((prev) => ({ ...prev, showYtd: checked }));
  }

  function handleIsDefaultChange(checked: boolean) {
    setForm((prev) => ({ ...prev, isDefault: checked }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const config: PayslipTemplateConfig = {
      accent: form.accent,
      showEmployerContributions: form.showEmployerContributions,
      showYtd: form.showYtd,
    };

    if (isEdit && template) {
      updateMutation.mutate(
        {
          templateId: template.id,
          name: form.name,
          layout: form.layout,
          config,
          isDefault: form.isDefault,
        },
        {
          onSuccess: () => {
            toast.success("Template updated");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else {
      createMutation.mutate(
        {
          name: form.name,
          layout: form.layout,
          config,
          isDefault: form.isDefault,
        },
        {
          onSuccess: () => {
            toast.success("Template created");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col w-full sm:max-w-md">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>{isEdit ? "Edit Template" : "Create Template"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update payslip template settings." : "Add a new payslip template."}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="template-name">Name</Label>
              <Input
                id="template-name"
                value={form.name}
                onChange={handleNameChange}
                placeholder="e.g. Standard Monthly"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="template-layout">Layout</Label>
              <Select value={form.layout} onValueChange={handleLayoutChange}>
                <SelectTrigger id="template-layout">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAYOUT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Accent Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {ACCENT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    role="radio"
                    aria-checked={form.accent === preset}
                    aria-label={`Color ${preset}`}
                    onClick={() => handleAccentSelect(preset)}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 transition-all",
                      form.accent === preset
                        ? "border-foreground ring-2 ring-foreground ring-offset-2"
                        : "border-transparent hover:border-muted-foreground",
                    )}
                    style={{ backgroundColor: preset }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-employer">Show Employer Contributions</Label>
              <Switch
                id="show-employer"
                checked={form.showEmployerContributions}
                onCheckedChange={handleEmployerContribChange}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-ytd">Show YTD</Label>
              <Switch
                id="show-ytd"
                checked={form.showYtd}
                onCheckedChange={handleYtdChange}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is-default">Set as Default</Label>
              <Switch
                id="is-default"
                checked={form.isDefault}
                onCheckedChange={handleIsDefaultChange}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !form.name.trim()}>
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
