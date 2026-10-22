"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { useSubprocessorNotices } from "@/hooks/api/privacy/subprocessors";
import { getErrorMessage } from "@/lib/get-error-message";
import { subprocessorNoticeSchema, type SubprocessorNoticeValues } from "./subprocessor-notice-schema";

export function SubprocessorNoticeForm() {
  const notices = useSubprocessorNotices();
  const form = useForm<SubprocessorNoticeValues>({
    resolver: zodResolver(subprocessorNoticeSchema),
    defaultValues: { email: "" },
  });
  const pendingSubscribe = notices.isPending && notices.variables?.subscribe === true;
  const pendingUnsubscribe = notices.isPending && notices.variables?.subscribe === false;

  function send(subscribe: boolean) {
    return (values: SubprocessorNoticeValues) =>
      notices.mutate(
        { email: values.email, subscribe },
        {
          onSuccess: () => {
            toast.success(subscribe ? `We'll email ${values.email} before any subprocessor change` : `Unsubscribed ${values.email}`);
            form.reset();
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
  }

  const handleSubscribe = form.handleSubmit(send(true));
  const handleUnsubscribe = form.handleSubmit(send(false));

  return (
    <Form {...form}>
      <form onSubmit={handleSubscribe} className="not-prose flex flex-col gap-4 rounded-2xl border border-border-subtle bg-card-glass p-5 shadow-float backdrop-blur-card" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Get notified of subprocessor changes</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <LoadingButton type="submit" isPending={pendingSubscribe} disabled={pendingUnsubscribe}>
            Subscribe
          </LoadingButton>
          <LoadingButton type="button" variant="ghost" isPending={pendingUnsubscribe} disabled={pendingSubscribe} onClick={handleUnsubscribe}>
            Unsubscribe
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}
