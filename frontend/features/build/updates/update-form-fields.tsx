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
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import type { CreateUpdateInput } from "./updates-schema";


interface UpdateFormFieldsProps {
  form: UseFormReturn<CreateUpdateInput>;
  isOpen: boolean;
}

export function UpdateFormFields({ form, isOpen }: UpdateFormFieldsProps) {
  useRegisterDirtyState(isOpen && form.formState.isDirty);

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

  function renderWinsField({ field }: { field: React.ComponentProps<typeof Textarea> }) {
    return (
      <FormItem>
        <FormLabel>Wins</FormLabel>
        <FormControl>
          <Textarea
            placeholder="What went well this period?"
            rows={2}
            {...field}
            value={field.value ?? ""}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    );
  }

  function renderRisksField({ field }: { field: React.ComponentProps<typeof Textarea> }) {
    return (
      <FormItem>
        <FormLabel>Risks</FormLabel>
        <FormControl>
          <Textarea
            placeholder="Current blockers or risks?"
            rows={2}
            {...field}
            value={field.value ?? ""}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    );
  }

  function renderNextField({ field }: { field: React.ComponentProps<typeof Textarea> }) {
    return (
      <FormItem>
        <FormLabel>Next</FormLabel>
        <FormControl>
          <Textarea
            placeholder="What's planned for the next period?"
            rows={2}
            {...field}
            value={field.value ?? ""}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    );
  }

  function renderCitationsField({ field }: { field: React.ComponentProps<typeof Textarea> }) {
    return (
      <FormItem>
        <FormLabel>Citations</FormLabel>
        <FormControl>
          <Textarea
            placeholder="Links or references supporting this update"
            rows={2}
            {...field}
            value={field.value ?? ""}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    );
  }

  return (
    <Form {...form}>
      <FormField control={form.control} name="body" render={renderBodyField} />
      <FormField control={form.control} name="wins" render={renderWinsField} />
      <FormField control={form.control} name="risks" render={renderRisksField} />
      <FormField control={form.control} name="next" render={renderNextField} />
      <FormField control={form.control} name="citations" render={renderCitationsField} />
    </Form>
  );
}
