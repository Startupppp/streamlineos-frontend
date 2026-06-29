"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { Settings, Users } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { updateProjectSettingsInputSchema } from "@/lib/validation/projects";

export const formSchema = updateProjectSettingsInputSchema.omit({ projectId: true });
type FormValues = z.infer<typeof formSchema>;

interface MembersSelectorProps {
  form: UseFormReturn<FormValues>;
  originalMemberIds: string[];
  onMemberRemoved: (
    memberId: string,
    memberName: string,
    applyChange: () => void
  ) => void;
}

interface ProjectInfoSectionProps {
  form: UseFormReturn<FormValues>;
  isPending: boolean;
  originalMemberIds: string[];
  onMemberRemoved: (
    memberId: string,
    memberName: string,
    applyChange: () => void
  ) => void;
  onSubmit: (values: FormValues) => void;
  MembersSelector: React.ComponentType<MembersSelectorProps>;
}

export function ProjectInfoSection({
  form,
  isPending,
  originalMemberIds,
  onMemberRemoved,
  onSubmit,
  MembersSelector,
}: ProjectInfoSectionProps) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Settings className="h-4 w-4 text-muted-foreground" />
          General
        </div>
        <Separator />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter project name" />
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
                      {...field}
                      placeholder="Project description"
                      className="min-h-[80px] resize-none"
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-muted-foreground" />
                Team Members
              </div>
              <MembersSelector
                form={form}
                originalMemberIds={originalMemberIds}
                onMemberRemoved={onMemberRemoved}
              />
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
