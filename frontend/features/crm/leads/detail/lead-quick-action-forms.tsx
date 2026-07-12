"use client";

import { type UseFormReturn } from "react-hook-form";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { NoteForm, TaskForm, EmailForm, CallForm } from "./lead-types";

interface NotePanelProps {
  form: UseFormReturn<NoteForm>;
  onSubmit: (data: NoteForm) => void;
  isPending: boolean;
  onCancel: () => void;
}

export function NotePanel({ form, onSubmit, isPending, onCancel }: NotePanelProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/30">
        <FormField control={form.control} name="body" render={({ field }) => (
          <FormItem>
            <FormLabel>Note</FormLabel>
            <FormControl><Textarea {...field} placeholder="Write a note..." rows={3} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <LoadingButton type="submit" size="sm" isPending={isPending} loadingText="Saving...">Save Note</LoadingButton>
        </div>
      </form>
    </Form>
  );
}

interface TaskPanelProps {
  form: UseFormReturn<TaskForm>;
  onSubmit: (data: TaskForm) => void;
  isPending: boolean;
  onCancel: () => void;
}

export function TaskPanel({ form, onSubmit, isPending, onCancel }: TaskPanelProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/30">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Task Title</FormLabel>
            <FormControl><Input {...field} placeholder="Follow up with..." /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="dueDate" render={({ field }) => (
          <FormItem>
            <FormLabel>Due Date</FormLabel>
            <FormControl>
              <Input type="date" {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <LoadingButton type="submit" size="sm" isPending={isPending} loadingText="Creating...">Create Task</LoadingButton>
        </div>
      </form>
    </Form>
  );
}

interface EmailPanelProps {
  form: UseFormReturn<EmailForm>;
  onSubmit: (data: EmailForm) => void;
  isPending: boolean;
  onCancel: () => void;
  emailTemplates?: { id: number; name: string; subject: string; body: string }[];
  onApplyTemplate: (templateId: string) => void;
}

export function EmailPanel({ form, onSubmit, isPending, onCancel, emailTemplates, onApplyTemplate }: EmailPanelProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/30">
        {emailTemplates && emailTemplates.length > 0 && (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select onValueChange={onApplyTemplate}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Use a template…" />
              </SelectTrigger>
              <SelectContent>
                {emailTemplates.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <FormField control={form.control} name="to" render={({ field }) => (
          <FormItem>
            <FormLabel>To</FormLabel>
            <FormControl><Input {...field} placeholder="email@example.com" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="subject" render={({ field }) => (
          <FormItem>
            <FormLabel>Subject</FormLabel>
            <FormControl><Input {...field} placeholder="Subject" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="body" render={({ field }) => (
          <FormItem>
            <FormLabel>Body</FormLabel>
            <FormControl><Textarea {...field} placeholder="Email body..." rows={4} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <LoadingButton type="submit" size="sm" isPending={isPending} loadingText="Sending...">Send Email</LoadingButton>
        </div>
      </form>
    </Form>
  );
}

interface CallPanelProps {
  form: UseFormReturn<CallForm>;
  onSubmit: (data: CallForm) => void;
  isPending: boolean;
  onCancel: () => void;
}

export function CallPanel({ form, onSubmit, isPending, onCancel }: CallPanelProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/30">
        <FormField control={form.control} name="subject" render={({ field }) => (
          <FormItem>
            <FormLabel>Subject</FormLabel>
            <FormControl><Input {...field} placeholder="Brief description" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="duration" render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (min)</FormLabel>
              <FormControl><Input type="number" {...field} placeholder="30" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="outcome" render={({ field }) => (
            <FormItem>
              <FormLabel>Outcome</FormLabel>
              <FormControl><Input {...field} placeholder="Positive / Follow up" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl><Textarea {...field} rows={2} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <LoadingButton type="submit" size="sm" isPending={isPending} loadingText="Logging...">Log Call</LoadingButton>
        </div>
      </form>
    </Form>
  );
}
