"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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

const templateEditSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  layout: z.enum(["CLASSIC", "MODERN", "COMPLIANCE"]),
  accent: z.string().min(1),
  showEmployerContributions: z.boolean(),
  showYtd: z.boolean(),
  isDefault: z.boolean(),
});

type TemplateEditFormValues = z.infer<typeof templateEditSchema>;

function buildDefaultValues(template?: PayslipTemplate): TemplateEditFormValues {
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
  const createMutation = useCreatePayslipTemplate();
  const updateMutation = useUpdatePayslipTemplate();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<TemplateEditFormValues>({
    resolver: zodResolver(templateEditSchema),
    defaultValues: buildDefaultValues(template),
  });

  useEffect(() => {
    if (open) form.reset(buildDefaultValues(template));
  }, [open, template, form]);

  function handleSubmit(values: TemplateEditFormValues) {
    const config: PayslipTemplateConfig = {
      accent: values.accent,
      showEmployerContributions: values.showEmployerContributions,
      showYtd: values.showYtd,
    };

    if (isEdit && template) {
      updateMutation.mutate(
        {
          templateId: template.id,
          name: values.name,
          layout: values.layout,
          config,
          isDefault: values.isDefault,
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
          name: values.name,
          layout: values.layout,
          config,
          isDefault: values.isDefault,
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
      <SheetContent className="p-0 flex flex-col gap-0 overflow-hidden w-full sm:max-w-md">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>{isEdit ? "Edit Template" : "Create Template"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update payslip template settings." : "Add a new payslip template."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <SheetBody className="px-6 py-4 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="template-name"
                        placeholder="e.g. Standard Monthly"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="layout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Layout</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger id="template-layout">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LAYOUT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
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
                name="accent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accent Color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2 flex-wrap">
                        {ACCENT_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            role="radio"
                            aria-checked={field.value === preset}
                            aria-label={`Color ${preset}`}
                            onClick={() => field.onChange(preset)}
                            className={cn(
                              "h-6 w-6 rounded-full border-2 transition-all outline-none focus-visible:ring-1 focus-visible:ring-ring",
                              field.value === preset
                                ? "border-foreground ring-2 ring-foreground ring-offset-2"
                                : "border-transparent hover:border-muted-foreground",
                            )}
                            style={{ backgroundColor: preset }}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="showEmployerContributions"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Show Employer Contributions</FormLabel>
                    <FormControl>
                      <Switch
                        id="show-employer"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="showYtd"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Show YTD</FormLabel>
                    <FormControl>
                      <Switch
                        id="show-ytd"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Set as Default</FormLabel>
                    <FormControl>
                      <Switch
                        id="is-default"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </SheetBody>
            <SheetFooter className="flex justify-end gap-2 px-6 py-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={isPending} loadingText={isEdit ? "Saving…" : "Creating…"}>
                {isEdit ? "Save" : "Create"}
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
