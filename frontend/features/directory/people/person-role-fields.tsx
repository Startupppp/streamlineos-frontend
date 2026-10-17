"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function PersonRoleFields<T extends FieldValues>({
  control,
}: {
  control: Control<T>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField
        control={control}
        name={"designation" as FieldPath<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Role / designation (optional)</FormLabel>
            <FormControl>
              <Input
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={typeof field.value === "string" ? field.value : ""}
                onChange={field.onChange}
                placeholder="Software Engineer"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={"joiningDate" as FieldPath<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Join date (optional)</FormLabel>
            <FormControl>
              <Input
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                type="date"
                value={typeof field.value === "string" ? field.value : ""}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
