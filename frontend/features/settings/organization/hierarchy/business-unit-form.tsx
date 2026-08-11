"use client";

import { type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  businessUnitFormSchema,
  type BusinessUnitFormValues,
} from "./business-units-schema";

interface BuFormProps {
  defaultValues?: BusinessUnitFormValues;
  onSubmit: (v: BusinessUnitFormValues) => void;
  isPending: boolean;
}

export function BuForm({
  defaultValues,
  onSubmit,
  isPending: _,
}: BuFormProps) {
  const form = useForm<BusinessUnitFormValues>({
    resolver: zodResolver(businessUnitFormSchema),
    defaultValues: defaultValues ?? { name: "", code: "", description: "" },
  });

  return (
    <Form {...form}>
      <form
        id="bu-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Technology" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => {
            function handleCodeChange(e: ChangeEvent<HTMLInputElement>) {
              field.onChange(e.target.value.toUpperCase());
            }
            return (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. TECH"
                    {...field}
                    onChange={handleCodeChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional description..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
