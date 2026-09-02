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
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { mailComposeSchema, mailReplySchema } from "./mail-compose-schema";
import type {
  MailComposeMode,
  MailComposeValues,
  MailReplyValues,
} from "./mail-compose-schema";
import { MailAiComposeToolbar } from "./mail-ai-compose-toolbar";
import { MailComposeHeaderFields } from "./mail-compose-header-fields";
import {
  clearMailDraft,
  mailDraftKey,
  readMailDraft,
  writeMailDraft,
} from "./mail-draft-storage";
import type { MailAccount } from "@/types/mail";

const TiptapEditor = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => m.TiptapEditor),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full rounded-md" />,
  },
);

export type { MailComposeMode };

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
  const isOnline = useOnlineStatus();
  const draftKey = mailDraftKey(mode);

  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [bodyContentKey, setBodyContentKey] = useState(0);
  const [bodyHtmlForEditor, setBodyHtmlForEditor] = useState(
    isReply && mode.type === "reply" && mode.prefillBody ? mode.prefillBody : "",
  );

  const wasOpenRef = useRef(false);
  const prevDraftKeyRef = useRef(draftKey);
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    const prevDraftKey = prevDraftKeyRef.current;
    wasOpenRef.current = open;
    prevDraftKeyRef.current = draftKey;

    if (!open) return;
    if (wasOpen && prevDraftKey === draftKey) return;

    const saved = readMailDraft(draftKey);

    if (mode.type === "reply") {
      const body = saved?.bodyHtml ?? mode.prefillBody ?? "";
      replyForm.reset({
        accountId: mode.accountId,
        to: [mode.toEmail],
        cc: [],
        bodyHtml: body,
        messageId: mode.messageId,
        threadId: mode.threadId,
      });
      setBodyHtmlForEditor(body);
      setBodyContentKey((k) => k + 1);
      return;
    }

    const body = saved?.bodyHtml ?? "";
    composeForm.reset({
      accountId: defaultAccountId,
      to: [],
      cc: [],
      bcc: [],
      subject: saved?.subject ?? "",
      bodyHtml: body,
    });
    setBodyHtmlForEditor(body);
    setBodyContentKey((k) => k + 1);
  }, [open, draftKey, mode, replyForm, composeForm, defaultAccountId]);

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

  const persistDraft = useCallback(() => {
    const values = isReply ? replyForm.getValues() : composeForm.getValues();
    const subject = isReply ? undefined : composeForm.getValues("subject");
    writeMailDraft(draftKey, {
      bodyHtml: values.bodyHtml ?? "",
      ...(subject ? { subject } : {}),
    });
  }, [draftKey, isReply, composeForm, replyForm]);

  const resetSheet = useCallback(() => {
    onClose();
    composeForm.reset();
    replyForm.reset();
    setShowCc(false);
    setShowBcc(false);
    setBodyHtmlForEditor("");
    setBodyContentKey(0);
  }, [onClose, composeForm, replyForm]);

  const handleClose = useCallback(() => {
    persistDraft();
    resetSheet();
  }, [persistDraft, resetSheet]);

  const handleDiscard = useCallback(() => {
    clearMailDraft(draftKey);
    resetSheet();
  }, [draftKey, resetSheet]);

  const handleOpenChange = useCallback(
    (v: boolean) => { if (!v) handleClose(); },
    [handleClose],
  );

  const onSubmitCompose = composeForm.handleSubmit(async (data) => {
    if (!isOnline) {
      persistDraft();
      toast.error("You're offline — your draft is saved. Try again once you reconnect.");
      return;
    }
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
      handleDiscard();
    } catch (err) {
      persistDraft();
      toast.error(getErrorMessage(err), {
        action: { label: "Retry", onClick: () => void onSubmitCompose() },
      });
    }
  });

  const onSubmitReply = replyForm.handleSubmit(async (data) => {
    if (!isOnline) {
      persistDraft();
      toast.error("You're offline — your draft is saved. Try again once you reconnect.");
      return;
    }
    try {
      await replyMail.mutateAsync({
        accountId: data.accountId,
        messageId: data.messageId,
        threadId: data.threadId,
        bodyHtml: data.bodyHtml,
        cc: data.cc?.length ? data.cc : undefined,
      });
      toast.success("Reply sent");
      handleDiscard();
    } catch (err) {
      persistDraft();
      toast.error(getErrorMessage(err), {
        action: { label: "Retry", onClick: () => void onSubmitReply() },
      });
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
              onClick={handleDiscard}
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
