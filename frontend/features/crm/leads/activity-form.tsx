"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Phone, Mail, MessageSquare, Calendar, MapPin, Clock } from "lucide-react";
import { activityFormSchema, type ActivityFormInternalValues } from "./activity-form-schema";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

type FormValues = ActivityFormInternalValues;

export interface ActivityFormValues {
  activityType: string;
  subject?: string;
  duration?: number;
  outcome?: string;
  activityNotes?: string;
  location?: string;
}

interface ActivityFormProps {
  onSubmit: (values: ActivityFormValues) => void;
  isPending: boolean;
}

export function ActivityForm({ onSubmit, isPending }: ActivityFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      activityType: "call",
      subject: "",
      duration: "",
      outcome: "",
      activityNotes: "",
      location: "",
    },
  });

  function handleSubmit(values: FormValues) {
    onSubmit({
      activityType: values.activityType,
      subject: values.subject || undefined,
      duration: values.duration ? Number(values.duration) : undefined,
      outcome: values.outcome || undefined,
      activityNotes: values.activityNotes || undefined,
      location: values.location || undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="activityType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Activity Type <span className="text-destructive">*</span>
              </FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="call">
                    <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Phone Call</span>
                  </SelectItem>
                  <SelectItem value="email">
                    <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email</span>
                  </SelectItem>
                  <SelectItem value="whatsapp">
                    <span className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5" /> WhatsApp</span>
                  </SelectItem>
                  <SelectItem value="meeting">
                    <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Meeting</span>
                  </SelectItem>
                  <SelectItem value="site_visit">
                    <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Site Visit</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input placeholder="Brief description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (min)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="30" className="pl-9" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="outcome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Outcome</FormLabel>
                <FormControl>
                  <Input placeholder="Positive / Negative" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="activityNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="What happened during this interaction?"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location (for meetings/visits)</FormLabel>
              <FormControl>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Office / Client location" className="pl-9" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <LoadingButton
          type="submit"
          className="w-full mt-2"
          isPending={isPending}
          loadingText="Logging..."
        >
          Log Activity
        </LoadingButton>
      </form>
    </Form>
  );
}
