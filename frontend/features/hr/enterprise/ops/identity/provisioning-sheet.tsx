"use client";

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
import { UserCombobox } from "@/components/ui/user-combobox";
import { useCreateProvisioning } from "@/hooks/api/hr/enterprise-ops-identity";

const schema = z.object({
  userId: z.string().min(1, "Employee is required"),
  systemName: z.string().min(1, "System name is required"),
  action: z.enum(["grant", "revoke", "review"]),
  triggeredBy: z.enum(["joiner", "mover", "leaver", "manual"]),
});

type FormValues = z.infer<typeof schema>;

interface ProvisioningSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProvisioningSheet({ open, onOpenChange }: ProvisioningSheetProps) {
  const create = useCreateProvisioning();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { userId: "", systemName: "", action: "grant", triggeredBy: "manual" },
  });

  function onSubmit(values: FormValues) {
    create.mutate(values, {
      onSuccess: () => { form.reset(); onOpenChange(false); },
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle>Add Provisioning Record</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <SheetBody className="space-y-4 px-6 py-5">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <FormControl>
                      <UserCombobox
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select employee"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="systemName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Name</FormLabel>
                    <FormControl>
                      <Input className="" placeholder="e.g. GitHub, Jira, AWS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="action"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className=""><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="grant">Grant</SelectItem>
                        <SelectItem value="revoke">Revoke</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <FormControl>
                        <SelectTrigger className=""><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="joiner">Joiner</SelectItem>
                        <SelectItem value="mover">Mover</SelectItem>
                        <SelectItem value="leaver">Leaver</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SheetBody>
            <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
              <LoadingButton type="submit" isPending={create.isPending} loadingText="Creating…" className="w-full">
                Create
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
