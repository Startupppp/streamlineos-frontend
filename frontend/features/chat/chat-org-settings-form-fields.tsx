"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChatOrgSettingsFormValues } from "./chat-org-settings-schema";

const NOTIFICATION_OPTIONS = [
  { value: "ALL", label: "All messages" },
  { value: "MENTIONS", label: "Mentions only" },
  { value: "NOTHING", label: "Nothing" },
] as const;

interface ChatOrgSettingsFormFieldsProps {
  form: UseFormReturn<ChatOrgSettingsFormValues>;
}

export function ChatOrgSettingsFormFields({ form }: ChatOrgSettingsFormFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="defaultNotificationPreference"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Default notifications</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {NOTIFICATION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>Applies to members who have not chosen their own setting for a channel.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="maxAttachmentSizeMb"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Maximum attachment size (MB)</FormLabel>
            <FormControl>
              <Input {...field} inputMode="numeric" className="w-full sm:w-40" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="maxHuddleParticipants"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Maximum huddle participants</FormLabel>
            <FormControl>
              <Input {...field} inputMode="numeric" className="w-full sm:w-40" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
