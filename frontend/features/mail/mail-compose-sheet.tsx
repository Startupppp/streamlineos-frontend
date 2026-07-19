"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { SparklesIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSendMail, useReplyMail, useMailAiDraft } from "@/hooks/api/mail";
import { mailComposeSchema, mailReplySchema } from "./mail-compose-schema";
import type { MailComposeValues, MailReplyValues } from "./mail-compose-schema";
import { EmailChipsInput } from "./email-chips-input";
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

interface AiDraftPopoverProps {
  accountId?: number;
  threadId?: string;
  mode: "compose" | "reply";
  onInsert: (subject: string, body: string, composeMode: "compose" | "reply") => void;
}

function AiDraftPopover({ accountId, threadId, mode, onInsert }: AiDraftPopoverProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const aiDraft = useMailAiDraft();

  const handleInstructionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setInstruction(e.target.value),
    [],
  );

  const handleGenerate = useCallback(async () => {
    if (!instruction.trim()) return;
    try {
      const data = await aiDraft.mutateAsync({
        mode,
        instruction: instruction.trim(),
        accountId,
        threadId,
      });
      onInsert(data.subject, data.bodyHtml, mode);
      setOpen(false);
      setInstruction("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [instruction, aiDraft, mode, accountId, threadId, onInsert]);

  const handleGenerateClick = useCallback(() => {
    void handleGenerate();
  }, [handleGenerate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void handleGenerate();
      }
    },
    [handleGenerate],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          {...hoverHandlers}
        >
          <SparklesIcon ref={iconRef} size={13} />
          Write with AI
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="flex flex-col gap-2">
          <p className="text-[12px] font-medium text-foreground">Describe what to write</p>
          <Textarea
            value={instruction}
            onChange={handleInstructionChange}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Follow up on yesterday's meeting..."
            className="h-20 text-[13px] resize-none"
            autoFocus
          />
          <LoadingButton
            size="sm"
            isPending={aiDraft.isPending}
            loadingText="Generating..."
            onClick={handleGenerateClick}
            className="h-8 text-xs w-full"
          >
            Generate
          </LoadingButton>
        </div>
      </PopoverContent>
    </Popover>
  );
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

  const toFieldId = useId();
  const ccFieldId = useId();
  const bccFieldId = useId();
  const subjectFieldId = useId();

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
    } else if (
      mode.type === "compose" &&
      (prev.type === "reply" || !open)
    ) {
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
    (subject: string, body: string, insertMode: "compose" | "reply") => {
      setBodyHtmlForEditor(body);
      setBodyContentKey((k) => k + 1);
      if (insertMode === "compose") {
        const currentSubject = composeForm.getValues("subject");
        if (!currentSubject) {
          composeForm.setValue("subject", subject, { shouldValidate: true });
        }
        composeForm.setValue("bodyHtml", body, { shouldValidate: true });
      } else {
        replyForm.setValue("bodyHtml", body, { shouldValidate: true });
      }
    },
    [composeForm, replyForm],
  );

  const handleBodyChange = useCallback(
    (html: string) => {
      if (isReply) {
        replyForm.setValue("bodyHtml", html, { shouldValidate: true });
      } else {
        composeForm.setValue("bodyHtml", html, { shouldValidate: true });
      }
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
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <SheetContent className="p-0 flex flex-col gap-0 sm:max-w-2xl overflow-hidden">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
        </SheetHeader>

        <form
          className="flex-1 min-h-0 flex flex-col gap-0 overflow-y-auto"
          onSubmit={isReply ? onSubmitReply : onSubmitCompose}
        >
          <div className="flex flex-col gap-3 px-6 py-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <Label
                htmlFor={`account-${isReply ? "reply" : "compose"}`}
                className="text-[13px] font-medium w-12 shrink-0"
              >
                From
              </Label>
              {isReply ? (
                <Controller
                  control={replyForm.control}
                  name="accountId"
                  render={({ field }) => (
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger
                        id={`account-reply`}
                        className="h-8 text-xs border-input bg-card flex-1"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                        {activeAccountOptions.map((acc) => (
                          <SelectItem key={acc.id} value={String(acc.id)} className="text-xs">
                            {acc.accountEmail ?? acc.accountLabel ?? `Account ${acc.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              ) : (
                <Controller
                  control={composeForm.control}
                  name="accountId"
                  render={({ field }) => (
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger
                        id={`account-compose`}
                        className="h-8 text-xs border-input bg-card flex-1"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                        {activeAccountOptions.map((acc) => (
                          <SelectItem key={acc.id} value={String(acc.id)} className="text-xs">
                            {acc.accountEmail ?? acc.accountLabel ?? `Account ${acc.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </div>

            <div className="flex items-start gap-3">
              <Label
                htmlFor={toFieldId}
                className="text-[13px] font-medium w-12 shrink-0 pt-1.5"
              >
                To
              </Label>
              <div className="flex-1 min-w-0">
                {isReply ? (
                  <Controller
                    control={replyForm.control}
                    name="to"
                    render={({ field }) => (
                      <EmailChipsInput
                        id={toFieldId}
                        value={field.value}
                        onChange={field.onChange}
                        hasError={!!replyForm.formState.errors.to}
                        placeholder="Recipients..."
                      />
                    )}
                  />
                ) : (
                  <Controller
                    control={composeForm.control}
                    name="to"
                    render={({ field }) => (
                      <EmailChipsInput
                        id={toFieldId}
                        value={field.value}
                        onChange={field.onChange}
                        hasError={!!composeForm.formState.errors.to}
                        placeholder="Recipients..."
                      />
                    )}
                  />
                )}
                {activeErrors.to && (
                  <p className="text-[11px] text-destructive mt-1">
                    {activeErrors.to.message ?? (Array.isArray(activeErrors.to) ? activeErrors.to[0]?.message : undefined)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] px-2 text-muted-foreground"
                  onClick={handleToggleCc}
                >
                  Cc
                </Button>
                {!isReply && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] px-2 text-muted-foreground"
                    onClick={handleToggleBcc}
                  >
                    Bcc
                  </Button>
                )}
              </div>
            </div>

            {showCc && (
              <div className="flex items-start gap-3">
                <Label
                  htmlFor={ccFieldId}
                  className="text-[13px] font-medium w-12 shrink-0 pt-1.5"
                >
                  Cc
                </Label>
                <div className="flex-1 min-w-0">
                  {isReply ? (
                    <Controller
                      control={replyForm.control}
                      name="cc"
                      render={({ field }) => (
                        <EmailChipsInput
                          id={ccFieldId}
                          value={field.value ?? []}
                          onChange={field.onChange}
                          placeholder="Cc recipients..."
                        />
                      )}
                    />
                  ) : (
                    <Controller
                      control={composeForm.control}
                      name="cc"
                      render={({ field }) => (
                        <EmailChipsInput
                          id={ccFieldId}
                          value={field.value ?? []}
                          onChange={field.onChange}
                          placeholder="Cc recipients..."
                        />
                      )}
                    />
                  )}
                </div>
              </div>
            )}

            {showBcc && !isReply && (
              <div className="flex items-start gap-3">
                <Label
                  htmlFor={bccFieldId}
                  className="text-[13px] font-medium w-12 shrink-0 pt-1.5"
                >
                  Bcc
                </Label>
                <div className="flex-1 min-w-0">
                  <Controller
                    control={composeForm.control}
                    name="bcc"
                    render={({ field }) => (
                      <EmailChipsInput
                        id={bccFieldId}
                        value={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="Bcc recipients..."
                      />
                    )}
                  />
                </div>
              </div>
            )}

            {!isReply && (
              <div className="flex items-center gap-3">
                <Label
                  htmlFor={subjectFieldId}
                  className="text-[13px] font-medium w-12 shrink-0"
                >
                  Subject
                </Label>
                <div className="flex-1 min-w-0">
                  <Input
                    id={subjectFieldId}
                    className="h-8 text-[13px]"
                    placeholder="Subject"
                    {...composeForm.register("subject")}
                  />
                  {composeForm.formState.errors.subject && (
                    <p className="text-[11px] text-destructive mt-1">
                      {composeForm.formState.errors.subject.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 flex flex-col px-0">
            <div className="flex items-center justify-between px-6 pt-2 pb-1 border-b border-border/20">
              <span className="text-[11px] text-muted-foreground">Message</span>
              <AiDraftPopover
                accountId={activeAccountId}
                threadId={activeThreadId}
                mode={isReply ? "reply" : "compose"}
                onInsert={handleAiInsert}
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
              <p className="text-[11px] text-destructive px-6 pb-1">
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
