"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { useSubmitCheckin, useMyCheckins } from "@/hooks/api/hr/safety";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

const schema = z.object({
  score: z.number().int().min(1).max(10),
});

type FormValues = z.infer<typeof schema>;

const today = new Date().toISOString().slice(0, 10);

const SCORE_COLORS = [
  "", "bg-red-500", "bg-red-400", "bg-orange-400",
  "bg-orange-300", "bg-yellow-400", "bg-yellow-300",
  "bg-lime-400", "bg-green-400", "bg-green-500", "bg-emerald-500",
];

export function WellnessWidget() {
  const submit = useSubmitCheckin();
  const { data: checkins } = useMyCheckins();
  const todayCheckin = checkins?.find((c) => c.date === today);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { score: todayCheckin?.score ?? 7 },
  });

  function handleSubmit(values: FormValues) {
    submit.mutate({ date: today, score: values.score }, {
      onSuccess: () => setSubmitted(true),
    });
  }

  if (submitted || todayCheckin) {
    const score = todayCheckin?.score ?? form.getValues("score");
    return (
      <Card className="p-4 bg-card border border-border rounded-xl flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-medium">Today's check-in recorded</p>
          <p className="text-xs text-muted-foreground">Wellness score: {score}/10</p>
        </div>
      </Card>
    );
  }

  const score = form.watch("score");

  return (
    <Card className="p-4 bg-card border border-border rounded-xl space-y-3">
      <p className="text-sm font-semibold text-foreground">How are you feeling today?</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="score"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Wellness Score</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[field.value]}
                      onValueChange={([v]) => field.onChange(v)}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>1 (Very Poor)</span>
                      <span
                        className={cn(
                          "font-bold text-base tabular-nums rounded px-1.5 text-white",
                          SCORE_COLORS[score] ?? "bg-slate-400",
                        )}
                      >
                        {score}
                      </span>
                      <span>10 (Excellent)</span>
                    </div>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
          <LoadingButton type="submit" size="sm" isPending={submit.isPending} className="w-full">
            Submit Check-in
          </LoadingButton>
        </form>
      </Form>
    </Card>
  );
}
