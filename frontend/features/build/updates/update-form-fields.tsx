"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useRegisterBuildDirtyState } from "@/features/build/navigation/build-dirty-state-context";

export interface CreateUpdateInput {
  body: string;
}

interface UpdateFormFieldsProps {
  form: UseFormReturn<CreateUpdateInput>;
  isOpen: boolean;
}

export function UpdateFormFields({ form, isOpen }: UpdateFormFieldsProps) {
  useRegisterBuildDirtyState(isOpen && form.formState.isDirty);

  function renderBodyField({ field }: { field: React.ComponentProps<typeof Textarea> }) {
    return (
      <FormItem>
        <FormLabel>Update</FormLabel>
        <FormControl>
          <Textarea
            placeholder="What's the latest on this project?"
            rows={5}
            {...field}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    );
  }

  return (
    <Form {...form}>
      <FormField control={form.control} name="body" render={renderBodyField} />
    </Form>
  );
}
