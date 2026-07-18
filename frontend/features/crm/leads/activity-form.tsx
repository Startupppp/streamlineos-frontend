"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, Mail, MessageSquare, Calendar, MapPin, Clock } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  activityType: z.string().min(1, "Activity type is required"),
  subject: z.string(),
  duration: z
    .string()
    .refine((v) => v === "" || /^\d+$/.test(v), { message: "Must be a whole number" }),
  outcome: z.string(),
  activityNotes: z.string(),
  location: z.string(),
});

type FormValues = z.infer<typeof schema>;

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
    resolver: zodResolver(schema),
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
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div>
        <Label className="text-xs font-medium mb-2 block">Activity Type</Label>
        <Controller
          control={form.control}
          name="activityType"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
          )}
        />
        {form.formState.errors.activityType && (
          <p className="text-xs text-destructive mt-1">
            {form.formState.errors.activityType.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="subject" className="text-xs font-medium mb-2 block">Subject</Label>
        <Input id="subject" placeholder="Brief description" {...form.register("subject")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="duration" className="text-xs font-medium mb-2 block">Duration (min)</Label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="duration"
              placeholder="30"
              className="pl-9"
              {...form.register("duration")}
            />
          </div>
          {form.formState.errors.duration && (
            <p className="text-xs text-destructive mt-1">
              {form.formState.errors.duration.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="outcome" className="text-xs font-medium mb-2 block">Outcome</Label>
          <Input id="outcome" placeholder="Positive / Negative" {...form.register("outcome")} />
        </div>
      </div>

      <div>
        <Label htmlFor="activityNotes" className="text-xs font-medium mb-2 block">Notes</Label>
        <Textarea
          id="activityNotes"
          rows={3}
          placeholder="What happened during this interaction?"
          className="resize-none"
          {...form.register("activityNotes")}
        />
      </div>

      <div>
        <Label htmlFor="location" className="text-xs font-medium mb-2 block">
          Location (for meetings/visits)
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="location"
            placeholder="Office / Client location"
            className="pl-9"
            {...form.register("location")}
          />
        </div>
      </div>

      <LoadingButton
        type="submit"
        className="w-full mt-2"
        isPending={isPending}
        loadingText="Logging..."
      >
        Log Activity
      </LoadingButton>
    </form>
  );
}
