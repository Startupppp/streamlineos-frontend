"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LocationType } from "@/types/org-hierarchy";
import { LOCATION_TYPE_ENUM, formSchema, type FormValues } from "./location-form-schema";

export function LocationForm({
  defaultValues,
  onSubmit,
  isPending: _,
}: {
  defaultValues?: FormValues;
  onSubmit: (v: FormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ?? { name: "", type: "OFFICE" as const, address: "" },
  });

  return (
    <Form {...form}>
      <form id="location-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Mumbai Office" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LOCATION_TYPE_ENUM.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0) + t.slice(1).toLowerCase()}
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
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Full address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

export function TypeBadge({ type }: { type: LocationType }) {
  const colors: Record<LocationType, string> = {
    OFFICE: "bg-status-info-surface text-status-info-ink border-status-info-rule",
    WAREHOUSE: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
    STORE: "bg-status-info-surface text-status-info-ink border-status-info-rule",
    FACTORY: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
    REMOTE: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  };
  return (
    <Badge variant="outline" className={cn("h-4 px-1.5 py-0 text-micro", colors[type])}>
      {type.charAt(0) + type.slice(1).toLowerCase()}
    </Badge>
  );
}
