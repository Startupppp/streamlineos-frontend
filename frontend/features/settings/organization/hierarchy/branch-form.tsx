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
import { PhoneInput } from "@/components/ui/phone-input";
import { UserCombobox } from "@/components/ui/user-combobox";
import {
  branchFormSchema,
  NO_BUSINESS_UNIT,
  type BranchFormValues,
} from "./branches-schema";

const EMPTY: BranchFormValues = {
  name: "",
  code: "",
  businessUnitId: NO_BUSINESS_UNIT,
  managerUserId: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  address: "",
  phone: "",
  email: "",
};

interface BranchFormProps {
  defaultValues?: BranchFormValues;
  businessUnits: { id: string; name: string }[];
  onSubmit: (v: BranchFormValues) => void;
  isPending: boolean;
}

export function BranchForm({
  defaultValues,
  businessUnits,
  onSubmit,
  isPending: _,
}: BranchFormProps) {
  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: defaultValues ?? EMPTY,
  });

  return (
    <Form {...form}>
      <form
        id="branch-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Mumbai HQ" {...field} />
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
                      placeholder="e.g. MUM"
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
            name="businessUnitId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Unit</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_BUSINESS_UNIT}>None</SelectItem>
                    {businessUnits.map((bu) => (
                      <SelectItem key={bu.id} value={bu.id}>
                        {bu.name}
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
            name="managerUserId"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Manager</FormLabel>
                <FormControl>
                  <UserCombobox
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Select manager…"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="City" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input placeholder="State" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input placeholder="Country" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postal Code</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 400001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <PhoneInput {...field} defaultCountry="IN" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="branch@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="Full address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}
