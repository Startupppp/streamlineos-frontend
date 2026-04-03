"use client";

import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "../../../lib/validations/hr";
import { format } from "date-fns";

import { Input } from "../../ui/input";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

interface StepPersonalInfoProps {
  form: UseFormReturn<FormValues>;
}

export function StepPersonalInfo({ form }: StepPersonalInfoProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <FormField
        control={form.control}
        name="firstName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input placeholder="John" {...field} onChange={(e) => {
                const v = e.target.value;
                if (/^[A-Za-z\s]*$/.test(v)) field.onChange(v);
              }} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="lastName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Last Name <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input placeholder="Doe" {...field} onChange={(e) => {
                const v = e.target.value;
                if (/^[A-Za-z\s]*$/.test(v)) field.onChange(v);
              }} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email Address <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input type="email" placeholder="john.doe@company.com" {...field} />
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
            <FormLabel>Phone Number <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="+91 9876543210"
                {...field}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^[\d+\s-]*$/.test(v)) {
                    field.onChange(v);
                  }
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="whatsappSameAsPhone"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center gap-3 space-y-0 pt-2">
            <FormControl>
              <input
                type="checkbox"
                checked={field.value}
                onChange={field.onChange}
                className="h-4 w-4 rounded border-gray-300 accent-[#bd882c]"
              />
            </FormControl>
            <FormLabel className="text-sm font-normal cursor-pointer">WhatsApp same as phone</FormLabel>
          </FormItem>
        )}
      />
      {!form.watch("whatsappSameAsPhone") && (
        <FormField
          control={form.control}
          name="whatsappNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp Number</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="+91 9876543210"
                  {...field}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^[\d+\s-]*$/.test(v)) {
                      field.onChange(v);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        control={form.control}
        name="gender"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Gender <span className="text-red-500">*</span></FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select Gender" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="dateOfBirth"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Date of Birth <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                type="date"
                {...field}
                value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : null;
                  field.onChange(date);
                }}
                max={format(new Date(), "yyyy-MM-dd")}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Initial Password (Optional)</FormLabel>
            <FormControl>
              <Input type="password" placeholder="Set initial password..." {...field} />
            </FormControl>
            <FormDescription className="text-xs">If left blank, user will set via invite.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
