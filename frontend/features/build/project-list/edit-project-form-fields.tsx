"use client";

import type { UseFormReturn } from "react-hook-form";
import { Users } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { MemberPicker } from "@/components/members/member-picker";
import {
  MembersSelector,
} from "@/features/build/settings/project-member-selector";
import type { EditProjectFormValues } from "./edit-project-schema";

interface DatePickerBounds {
  fromDate?: Date;
  fromYear?: number;
  toYear?: number;
}

interface EditProjectFormFieldsProps {
  form: UseFormReturn<EditProjectFormValues>;
  handleStartDateChange: (value: string) => void;
  handleMemberRemoved: (
    memberId: string,
    memberName: string,
    applyChange: () => void,
  ) => void;
  handleMemberIdsChange: (ids: string[]) => void;
  originalMemberIds: string[];
  startPickerBounds: DatePickerBounds;
  endPickerBounds: DatePickerBounds;
}

export function EditProjectFormFields({
  form,
  handleStartDateChange,
  handleMemberRemoved,
  handleMemberIdsChange,
  originalMemberIds,
  startPickerBounds,
  endPickerBounds,
}: EditProjectFormFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Project Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Website Redesign" {...field} />
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
                placeholder="What is this project about?"
                className="resize-none"
                rows={3}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="priority"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Priority</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value ?? ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="No priority" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="managerId"
        render={({ field }) => {
          function handleManagerChange(userId: string | null) {
            field.onChange(userId ?? undefined);
          }

          return (
            <FormItem>
              <FormLabel>Project Lead</FormLabel>
              <FormControl>
                <MemberPicker
                  directory="build"
                  value={field.value}
                  onChange={handleManagerChange}
                  allowUnassigned
                  placeholder="Unassigned"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={handleStartDateChange}
                  placeholder="Start date"
                  dateFormat="dd/MM/yyyy"
                  fromDate={startPickerBounds.fromDate}
                  fromYear={startPickerBounds.fromYear}
                  toYear={startPickerBounds.toYear}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Target date"
                  dateFormat="dd/MM/yyyy"
                  fromDate={endPickerBounds.fromDate}
                  fromYear={endPickerBounds.fromYear}
                  toYear={endPickerBounds.toYear}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-2 pt-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-muted-foreground" />
          Team Members
        </div>
        <MembersSelector
          memberIds={form.watch("memberIds") ?? []}
          onMemberIdsChange={handleMemberIdsChange}
          originalMemberIds={originalMemberIds}
          onMemberRemoved={handleMemberRemoved}
        />
      </div>
    </>
  );
}
