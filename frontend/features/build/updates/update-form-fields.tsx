"use client";

import type { ControllerRenderProps, UseFormReturn } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  function renderWinsField({
    field,
  }: {
    field: ControllerRenderProps<CreateUpdateInput, "wins">;
  }) {
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

  function renderRisksField({
    field,
  }: {
    field: ControllerRenderProps<CreateUpdateInput, "risks">;
  }) {
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

  function renderNextField({
    field,
  }: {
    field: ControllerRenderProps<CreateUpdateInput, "next">;
  }) {
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

  function renderCitationsField({
    field,
  }: {
    field: ControllerRenderProps<CreateUpdateInput, "citations">;
  }) {
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
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Visibility</FormLabel>
              <Select value={field.value ?? "published"} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="audience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Audience</FormLabel>
              <Select value={field.value ?? "internal"} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField control={form.control} name="wins" render={renderWinsField} />
      <FormField control={form.control} name="risks" render={renderRisksField} />
      <FormField control={form.control} name="next" render={renderNextField} />
      <FormField control={form.control} name="citations" render={renderCitationsField} />
    </Form>
  );
}
