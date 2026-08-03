"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { useCreateProvisioningTemplate } from "@/hooks/api/hr/enterprise-ops-identity";
import { getErrorMessage } from "@/lib/get-error-message";

const ALPHANUMERIC_RE = /[a-zA-Z0-9]/;

const schema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(200, "Template name must be 200 characters or fewer")
    .refine((v) => v.trim().length > 0, "Template name cannot be only whitespace")
    .refine((v) => ALPHANUMERIC_RE.test(v), "Template name must contain at least one letter or digit")
    .transform((v) => v.trim()),
  triggeredBy: z.enum(["joiner", "mover", "leaver"]),
});

type FormValues = z.infer<typeof schema>;

type SystemEntry = {
  systemName: string;
  action: "grant" | "revoke" | "review";
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateSheet({ open, onOpenChange }: Props) {
  const create = useCreateProvisioningTemplate();
  const [systems, setSystems] = useState<SystemEntry[]>([]);
  const [newSystem, setNewSystem] = useState("");
  const [newAction, setNewAction] = useState<"grant" | "revoke" | "review">("grant");
  const [systemsError, setSystemsError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", triggeredBy: "joiner" },
  });

  function addSystem() {
    const trimmed = newSystem.trim();
    if (!trimmed) return;
    if (trimmed.length > 200) {
      setSystemsError("System name must be 200 characters or fewer");
      return;
    }
    setSystems((s) => [...s, { systemName: trimmed, action: newAction }]);
    setNewSystem("");
    setSystemsError(null);
  }

  function removeSystem(i: number) {
    setSystems((s) => s.filter((_, idx) => idx !== i));
    setSystemsError(null);
  }

  function onSubmit(values: FormValues) {
    if (systems.length === 0) {
      setSystemsError("Add at least one system to the template");
      return;
    }
    setSystemsError(null);
    create.mutate(
      { ...values, systemsConfig: systems },
      {
        onSuccess: () => {
          form.reset();
          setSystems([]);
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle>New Provisioning Template</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <SheetBody className="space-y-4 px-6 py-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Standard Joiner" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="triggeredBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Triggered By</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="joiner">Joiner</SelectItem>
                      <SelectItem value="mover">Mover</SelectItem>
                      <SelectItem value="leaver">Leaver</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <p className="text-sm font-medium">Systems</p>
              <div className="flex gap-2">
                <Input
                  placeholder="System name (e.g. GitHub, Jira)"
                  value={newSystem}
                  onChange={(e) => { setNewSystem(e.target.value); setSystemsError(null); }}
                  className="flex-1"
                  maxLength={200}
                />
                <Select value={newAction} onValueChange={(v) => setNewAction(v as typeof newAction)}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grant">Grant</SelectItem>
                    <SelectItem value="revoke">Revoke</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                  </SelectContent>
                </Select>
                <AnimatedIconButton type="button" size="icon" variant="outline" icon={PlusIcon} iconSize={16} onClick={addSystem} aria-label="Add system" />
              </div>
              {systemsError && (
                <p className="text-sm font-medium text-destructive">{systemsError}</p>
              )}
              {systems.map((s, i) => (
                <div key={`${s.systemName}-${i}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-sm text-foreground">{s.systemName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground capitalize">{s.action}</span>
                    <AnimatedIconButton type="button" size="icon" variant="ghost" className="h-6 w-6 text-red-500" icon={Trash2Icon} iconSize={12} onClick={() => removeSystem(i)} aria-label={`Remove ${s.systemName}`} />
                  </div>
                </div>
              ))}
            </div>
            </SheetBody>
            <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
              <LoadingButton type="submit" isPending={create.isPending} loadingText="Creating…">
                Create Template
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
