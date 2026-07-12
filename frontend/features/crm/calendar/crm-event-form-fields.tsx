"use client";

import { Controller, type Control, type UseFormRegister, type FieldErrors } from "react-hook-form";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const NO_ENTITY_TYPE = "none";

const COLOR_OPTIONS = [
  { value: "blue" as const },
  { value: "green" as const },
  { value: "red" as const },
  { value: "yellow" as const },
  { value: "purple" as const },
];

const COLOR_BG_CLASSES: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  red: "bg-red-500",
  yellow: "bg-amber-500",
  purple: "bg-purple-500",
};

const COLOR_RING_CLASSES: Record<string, string> = {
  blue: "ring-blue-500",
  green: "ring-green-500",
  red: "ring-red-500",
  yellow: "ring-yellow-500",
  purple: "ring-purple-500",
};

export type EventColor = "blue" | "green" | "red" | "yellow" | "purple";

export interface CrmEventFieldValues {
  title: string;
  description?: string;
  location?: string;
  allDay: boolean;
  startDate: string;
  startTime?: string;
  endDate: string;
  endTime?: string;
  category: "meeting" | "call" | "demo" | "general" | "other";
  color: EventColor;
  entityType?: "LEAD" | "DEAL" | "CONTACT" | "" | "none";
  entityId?: string;
  attendeeIds: string[];
}

interface CrmEventFormFieldsProps {
  control: Control<CrmEventFieldValues>;
  register: UseFormRegister<CrmEventFieldValues>;
  errors: FieldErrors<CrmEventFieldValues>;
  allDay: boolean;
  watchedColor: EventColor;
  watchedEntityType?: string;
  onColorClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function CrmEventFormFields({
  control,
  register,
  errors,
  allDay,
  watchedColor,
  watchedEntityType,
  onColorClick,
}: CrmEventFormFieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-[13px] font-medium text-foreground">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Meeting title"
          {...register("title")}
          className={cn(
            "h-9",
            errors.title && "border-destructive focus-visible:ring-destructive",
          )}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-[13px] font-medium text-foreground">Category</Label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
        <div>
          <p className="text-[13px] font-medium text-foreground">All Day</p>
          <p className="text-xs text-muted-foreground">Event spans the entire day</p>
        </div>
        <Controller
          control={control}
          name="allDay"
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="startDate" className="text-[13px] font-medium text-foreground">
            Start Date <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                id="startDate"
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Pick a date"
                className={cn("h-8 text-sm", errors.startDate && "border-destructive")}
              />
            )}
          />
          {errors.startDate && (
            <p className="text-xs text-destructive">{errors.startDate.message}</p>
          )}
        </div>
        {!allDay && (
          <div className="space-y-1.5">
            <Label htmlFor="startTime" className="text-[13px] font-medium text-foreground">
              Start Time
            </Label>
            <Input id="startTime" type="time" {...register("startTime")} className="h-9" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="endDate" className="text-[13px] font-medium text-foreground">
            End Date <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                id="endDate"
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Pick a date"
                className={cn("h-8 text-sm", errors.endDate && "border-destructive")}
              />
            )}
          />
          {errors.endDate && (
            <p className="text-xs text-destructive">{errors.endDate.message}</p>
          )}
        </div>
        {!allDay && (
          <div className="space-y-1.5">
            <Label htmlFor="endTime" className="text-[13px] font-medium text-foreground">
              End Time
            </Label>
            <Input id="endTime" type="time" {...register("endTime")} className="h-9" />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location" className="text-[13px] font-medium text-foreground">
          Location
        </Label>
        <Input
          id="location"
          placeholder="Add location or meeting link"
          {...register("location")}
          className="h-9"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-[13px] font-medium text-foreground">
          Description
        </Label>
        <Textarea
          id="description"
          placeholder="Add a description..."
          rows={3}
          {...register("description")}
          className="resize-none text-sm"
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-[13px] font-medium text-foreground">Color</Label>
        <div className="flex gap-2.5">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color.value}
              type="button"
              data-color={color.value}
              onClick={onColorClick}
              className={cn(
                "h-7 w-7 rounded-full transition-all duration-150",
                COLOR_BG_CLASSES[color.value],
                watchedColor === color.value &&
                  `ring-2 ring-offset-1 ${COLOR_RING_CLASSES[color.value]}`,
              )}
              aria-label={`Select ${color.value} color`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/40 px-4 py-4">
        <p className="text-[13px] font-medium text-foreground">CRM Entity</p>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Entity Type</Label>
          <Controller
            control={control}
            name="entityType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-9 bg-card">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ENTITY_TYPE}>None</SelectItem>
                  <SelectItem value="LEAD">Lead</SelectItem>
                  <SelectItem value="DEAL">Deal</SelectItem>
                  <SelectItem value="CONTACT">Contact</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {watchedEntityType && watchedEntityType !== NO_ENTITY_TYPE && (
          <div className="space-y-1.5">
            <Label htmlFor="entityId" className="text-xs text-muted-foreground">
              Entity ID
            </Label>
            <Input
              id="entityId"
              placeholder="Enter entity ID"
              {...register("entityId")}
              className="h-9 bg-card"
            />
          </div>
        )}
      </div>
    </>
  );
}
