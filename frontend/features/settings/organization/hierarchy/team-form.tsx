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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserCombobox } from "@/components/ui/user-combobox";
import { teamFormSchema, type TeamFormValues } from "./teams-schema";

interface TeamFormProps {
  defaultValues?: Partial<TeamFormValues>;
  departments: { id: string; name: string }[];
  onSubmit: (v: TeamFormValues) => void;
  isPending: boolean;
}

export function TeamForm({
  defaultValues,
  departments,
  onSubmit,
  isPending: _,
}: TeamFormProps) {
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      code: "",
      departmentId: "",
      leadUserId: "",
      description: "",
      capacity: "",
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form
        id="team-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Frontend Team" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 items-start gap-3">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => {
              function handleCodeChange(e: ChangeEvent<HTMLInputElement>) {
                field.onChange(e.target.value.toUpperCase());
              }
              return (
                <FormItem className="min-w-0">
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="FE"
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
            name="capacity"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Capacity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Optional"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
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
          name="leadUserId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Lead</FormLabel>
              <FormControl>
                <UserCombobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Select team lead…"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Optional description…"
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
