"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface RoleFields {
  designation?: string;
  joiningDate?: string;
}

export function PersonRoleFields<T extends RoleFields>({
  form,
}: {
  form: UseFormReturn<T>;
}) {
  const control = form.control as UseFormReturn<RoleFields>["control"];
  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField
        control={control}
        name="designation"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Role / designation (optional)</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Software Engineer" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="joiningDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Join date (optional)</FormLabel>
            <FormControl>
              <Input {...field} type="date" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
