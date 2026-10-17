"use client";

import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectMemberSelect } from "@/components/members/project-member-select";
import { EmojiIconPicker } from "@/components/ui/emoji-icon-picker";
import {
  MODULE_STATUSES,
  DESC_MAX,
  type CreateModuleForm,
} from "./create-module-schema";
import type { EditModuleForm } from "./update-module-schema";

interface DatePickerBounds {
  fromDate?: Date;
  fromYear?: number;
  toYear?: number;
}

interface SharedFormFieldProps {
  descValue: string;
  startDateValue: string;
  endDateValue: string;
  startBounds: DatePickerBounds;
  endBounds: DatePickerBounds;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  handleLeadChange: (userId: string | null) => void;
  projectId: number;
  activeLeadId: string | undefined;
}

interface ModuleEditFormFieldsProps extends SharedFormFieldProps {
  form: UseFormReturn<EditModuleForm>;
}

export function ModuleEditFormFields({
  form,
  descValue,
  startDateValue,
  endDateValue,
  startBounds,
  endBounds,
  setStartDate,
  setEndDate,
  handleLeadChange,
  projectId,
  activeLeadId,
}: ModuleEditFormFieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="mod-edit-name">Name</Label>
        <Input id="mod-edit-name" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive mt-1">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="mod-edit-desc">Description</Label>
          <span
            className={`text-xs ${descValue.length > DESC_MAX ? "text-destructive" : "text-muted-foreground"}`}
          >
            {descValue.length}/{DESC_MAX}
          </span>
        </div>
        <Textarea
          id="mod-edit-desc"
          rows={3}
          {...form.register("description")}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODULE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="mod-edit-start">Start Date</Label>
          <DatePicker
            id="mod-edit-start"
            value={startDateValue}
            onChange={setStartDate}
            placeholder="Start date"
            fromDate={startBounds.fromDate}
            fromYear={startBounds.fromYear}
            toYear={startBounds.toYear}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mod-edit-end">End Date</Label>
          <DatePicker
            id="mod-edit-end"
            value={endDateValue}
            onChange={setEndDate}
            placeholder="End date"
            fromDate={endBounds.fromDate}
            fromYear={endBounds.fromYear}
            toYear={endBounds.toYear}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Lead</Label>
        <Controller
          control={form.control}
          name="leadId"
          render={() => (
            <ProjectMemberSelect
              projectId={projectId}
              mode="single"
              value={activeLeadId}
              onChange={handleLeadChange}
              allowUnassigned
              placeholder="No lead"
              className="h-9 text-sm"
            />
          )}
        />
      </div>
    </>
  );
}

interface ModuleCreateFormFieldsProps extends SharedFormFieldProps {
  form: UseFormReturn<CreateModuleForm>;
  handleIconChange: (icon: string | null) => void;
}

export function ModuleCreateFormFields({
  form,
  descValue,
  startDateValue,
  endDateValue,
  startBounds,
  endBounds,
  setStartDate,
  setEndDate,
  handleLeadChange,
  handleIconChange,
  projectId,
  activeLeadId,
}: ModuleCreateFormFieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="mod-create-name">Name</Label>
        <div className="flex gap-2">
          <Controller
            control={form.control}
            name="icon"
            render={({ field }) => (
              <EmojiIconPicker
                id="mod-icon"
                icon={field.value}
                onIconChange={handleIconChange}
              />
            )}
          />
          <Input
            id="mod-create-name"
            className="flex-1"
            {...form.register("name")}
          />
        </div>
        {form.formState.errors.name && (
          <p className="text-xs text-destructive mt-1">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="mod-create-desc">Description</Label>
          <span
            className={`text-xs ${descValue.length > DESC_MAX ? "text-destructive" : "text-muted-foreground"}`}
          >
            {descValue.length}/{DESC_MAX}
          </span>
        </div>
        <Textarea
          id="mod-create-desc"
          rows={3}
          {...form.register("description")}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODULE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="mod-create-start">Start Date</Label>
          <DatePicker
            id="mod-create-start"
            value={startDateValue}
            onChange={setStartDate}
            placeholder="Start date"
            fromDate={startBounds.fromDate}
            fromYear={startBounds.fromYear}
            toYear={startBounds.toYear}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mod-create-end">End Date</Label>
          <DatePicker
            id="mod-create-end"
            value={endDateValue}
            onChange={setEndDate}
            placeholder="End date"
            fromDate={endBounds.fromDate}
            fromYear={endBounds.fromYear}
            toYear={endBounds.toYear}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Lead</Label>
        <Controller
          control={form.control}
          name="leadId"
          render={() => (
            <ProjectMemberSelect
              projectId={projectId}
              mode="single"
              value={activeLeadId}
              onChange={handleLeadChange}
              allowUnassigned
              placeholder="No lead"
              className="h-9 text-sm"
            />
          )}
        />
      </div>
    </>
  );
}
