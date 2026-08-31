"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSendMail, useReplyMail } from "@/hooks/api/mail";
import { mailComposeSchema, mailReplySchema } from "./mail-compose-schema";
import type { MailComposeValues, MailReplyValues } from "./mail-compose-schema";
import { MailAiComposeToolbar } from "./mail-ai-compose-toolbar";
import { MailComposeHeaderFields } from "./mail-compose-header-fields";
import type { MailAccount } from "@/types/mail";

const TiptapEditor = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => m.TiptapEditor),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full rounded-md" />,
  },
);

export type MailComposeMode =
  | { type: "compose" }
  | {
      type: "reply";
      messageId: string;
      threadId?: string;
      toEmail: string;
      subject: string;
      accountId: number;
      prefillBody?: string;
    };

interface MailComposeSheetProps {
  open: boolean;
  onClose: () => void;
  mode: MailComposeMode;
  accounts: MailAccount[];
}

export function MailComposeSheet({
  open,
  onClose,
  mode,
  accounts,
}: MailComposeSheetProps) {
  const isReply = mode.type === "reply";

  const primaryAccount = accounts.find((a) => a.isPrimary) ?? accounts[0];
  const defaultAccountId =
    isReply ? mode.accountId : (primaryAccount?.id ?? (accounts[0]?.id ?? 0));

  const composeForm = useForm<MailComposeValues>({
    resolver: zodResolver(mailComposeSchema),
    defaultValues: {
      accountId: defaultAccountId,
      to: [],
      cc: [],
      bcc: [],
      subject: "",
      bodyHtml: "",
    },
  });

  const replyForm = useForm<MailReplyValues>({
    resolver: zodResolver(mailReplySchema),
    defaultValues: {
      accountId: isReply ? mode.accountId : defaultAccountId,
      to: isReply ? [mode.toEmail] : [],
      cc: [],
      bodyHtml: isReply && mode.prefillBody ? mode.prefillBody : "",
      messageId: isReply ? mode.messageId : "",
      threadId: isReply && mode.threadId ? mode.threadId : undefined,
    },
  });

  const sendMail = useSendMail();
  const replyMail = useReplyMail();

  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [bodyContentKey, setBodyContentKey] = useState(0);
  const [bodyHtmlForEditor, setBodyHtmlForEditor] = useState(
    isReply && mode.type === "reply" && mode.prefillBody ? mode.prefillBody : "",
  );

  const prevModeRef = useRef(mode);
  useEffect(() => {
    const prev = prevModeRef.current;
    prevModeRef.current = mode;

    if (!open) return;

    if (mode.type === "reply") {
      replyForm.reset({
        accountId: mode.accountId,
        to: [mode.toEmail],
        cc: [],
        bodyHtml: mode.prefillBody ?? "",
        messageId: mode.messageId,
        threadId: mode.threadId,
      });
      const prefill = mode.prefillBody ?? "";
      setBodyHtmlForEditor(prefill);
      setBodyContentKey((k) => k + 1);
    } else if (mode.type === "compose" && (prev.type === "reply" || !open)) {
      composeForm.reset({
        accountId: defaultAccountId,
        to: [],
        cc: [],
        bcc: [],
        subject: "",
        bodyHtml: "",
      });
      setBodyHtmlForEditor("");
      setBodyContentKey((k) => k + 1);
    }
  }, [open, mode, replyForm, composeForm, defaultAccountId]);

  const handleAiInsert = useCallback(
    (subject: string, body: string) => {
      setBodyHtmlForEditor(body);
      setBodyContentKey((k) => k + 1);
      if (isReply) {
        replyForm.setValue("bodyHtml", body, { shouldValidate: true });
      } else {
        const currentSubject = composeForm.getValues("subject");
        if (!currentSubject && subject)
          composeForm.setValue("subject", subject, { shouldValidate: true });
        composeForm.setValue("bodyHtml", body, { shouldValidate: true });
      }
    },
    [isReply, composeForm, replyForm],
  );

  const handleAiSubject = useCallback(
    (subject: string) => {
      if (!isReply && subject)
        composeForm.setValue("subject", subject, { shouldValidate: true });
    },
    [isReply, composeForm],
  );

  const handleBodyChange = useCallback(
    (html: string) => {
      if (isReply)
        replyForm.setValue("bodyHtml", html, { shouldValidate: true });
      else
        composeForm.setValue("bodyHtml", html, { shouldValidate: true });
    },
    [isReply, composeForm, replyForm],
  );

  const handleToggleCc = useCallback(() => setShowCc((v) => !v), []);
  const handleToggleBcc = useCallback(() => setShowBcc((v) => !v), []);

  const handleClose = useCallback(() => {
    onClose();
    composeForm.reset();
    replyForm.reset();
    setShowCc(false);
    setShowBcc(false);
    setBodyHtmlForEditor("");
    setBodyContentKey(0);
  }, [onClose, composeForm, replyForm]);

  const handleOpenChange = useCallback(
    (v: boolean) => { if (!v) handleClose(); },
    [handleClose],
  );

  const onSubmitCompose = composeForm.handleSubmit(async (data) => {
    try {
      await sendMail.mutateAsync({
        accountId: data.accountId,
        to: data.to,
        cc: data.cc?.length ? data.cc : undefined,
        bcc: data.bcc?.length ? data.bcc : undefined,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
      });
      toast.success("Message sent");
      handleClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  });

  const onSubmitReply = replyForm.handleSubmit(async (data) => {
    try {
      await replyMail.mutateAsync({
        accountId: data.accountId,
        messageId: data.messageId,
        threadId: data.threadId,
        bodyHtml: data.bodyHtml,
        cc: data.cc?.length ? data.cc : undefined,
      });
      toast.success("Reply sent");
      handleClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  });

  const activeAccountId = isReply
    ? replyForm.watch("accountId")
    : composeForm.watch("accountId");

  const activeThreadId =
    isReply && mode.type === "reply" ? mode.threadId : undefined;

  const title = isReply ? "Reply" : "New message";

  const activeErrors = isReply ? replyForm.formState.errors : composeForm.formState.errors;
  const isPending = isReply ? replyMail.isPending : sendMail.isPending;

  const activeAccountOptions = useMemo(
    () => accounts.filter((a) => a.status === "active"),
    [accounts],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 sm:max-w-2xl overflow-hidden">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
        </SheetHeader>

        <form
          className="flex-1 min-h-0 flex flex-col gap-0 overflow-y-auto"
          onSubmit={isReply ? onSubmitReply : onSubmitCompose}
        >
          <MailComposeHeaderFields
            isReply={isReply}
            composeForm={composeForm}
            replyForm={replyForm}
            showCc={showCc}
            showBcc={showBcc}
            onToggleCc={handleToggleCc}
            onToggleBcc={handleToggleBcc}
            activeAccountOptions={activeAccountOptions}
          />

          <div className="flex-1 min-h-0 flex flex-col px-0">
            <div className="flex flex-col gap-1.5 px-6 pt-2 pb-2 border-b border-border/20">
              <span className="text-dense text-muted-foreground">Message</span>
              <MailAiComposeToolbar
                accountId={activeAccountId}
                threadId={activeThreadId}
                mode={isReply ? "reply" : "compose"}
                currentSubject={
                  isReply
                    ? mode.type === "reply"
                      ? mode.subject
                      : ""
                    : composeForm.watch("subject")
                }
                currentBodyHtml={
                  isReply
                    ? replyForm.watch("bodyHtml")
                    : composeForm.watch("bodyHtml")
                }
                onInsert={handleAiInsert}
                onSubjectOnly={handleAiSubject}
              />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <TiptapEditor
                output="html"
                content={bodyHtmlForEditor}
                contentKey={bodyContentKey}
                onChangeHtml={handleBodyChange}
                placeholder="Write your message..."
                minHeightClassName="min-h-[240px]"
              />
            </div>
            {activeErrors.bodyHtml && (
              <p className="text-dense text-destructive px-6 pb-1">
                {activeErrors.bodyHtml.message}
              </p>
            )}
          </div>

          <div className="shrink-0 border-t border-border px-6 py-4 flex items-center gap-2">
            <LoadingButton
              type="submit"
              isPending={isPending}
              loadingText="Sending..."
              className="h-9 text-sm"
            >
              {isReply ? "Send reply" : "Send"}
            </LoadingButton>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-sm"
              onClick={handleClose}
              disabled={isPending}
            >
              Discard
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
