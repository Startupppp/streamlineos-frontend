"use client";

import { useId } from "react";
import { ChevronDown, MailOpen } from "lucide-react";
import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
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
import { EmailChipsInput } from "./email-chips-input";
import type { MailComposeValues, MailReplyValues } from "./mail-compose-schema";
import type { MailAccount } from "@/types/mail";
import { numericSelectChange } from "@/lib/numeric-field";

interface MailComposeHeaderFieldsProps {
  isReply: boolean;
  composeForm: UseFormReturn<MailComposeValues>;
  replyForm: UseFormReturn<MailReplyValues>;
  showCc: boolean;
  showBcc: boolean;
  onToggleCc: () => void;
  onToggleBcc: () => void;
  activeAccountOptions: MailAccount[];
  detailsExpanded: boolean;
  onToggleDetails: () => void;
}

export function MailComposeHeaderFields({
  isReply,
  composeForm,
  replyForm,
  showCc,
  showBcc,
  onToggleCc,
  onToggleBcc,
  activeAccountOptions,
  detailsExpanded,
  onToggleDetails,
}: MailComposeHeaderFieldsProps) {
  const toFieldId = useId();
  const ccFieldId = useId();
  const bccFieldId = useId();
  const subjectFieldId = useId();

  const activeErrors = isReply
    ? replyForm.formState.errors
    : composeForm.formState.errors;

  return (
    <div className="flex flex-col gap-3 border-b border-border/40 px-4 py-3 sm:px-6 sm:py-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-11 w-full justify-between rounded-lg border-border/60 bg-muted/20 px-3 text-left hover:bg-muted/40"
        aria-label="Message details"
        aria-expanded={detailsExpanded}
        onClick={onToggleDetails}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background text-foreground shadow-sm"><MailOpen className="size-3.5" aria-hidden="true" /></span>
          <span className="flex min-w-0 flex-col">
            <span className="text-xs font-medium text-foreground">{detailsExpanded ? "Message details" : "Add recipients and subject"}</span>
            <span className="truncate text-micro font-normal text-muted-foreground">{detailsExpanded ? "From, recipients and subject" : "Expand before sending"}</span>
          </span>
        </span>
        <ChevronDown
          className={`size-4 transition-transform ${detailsExpanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </Button>
      {detailsExpanded ? (
        <>
          <div className="flex items-center gap-3">
            <Label
              htmlFor={`account-${isReply ? "reply" : "compose"}`}
              className="text-label font-medium w-12 shrink-0"
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
                    onValueChange={numericSelectChange(field.onChange)}
                  >
                    <SelectTrigger
                      id="account-reply"
                      className="h-8 text-xs border-input bg-card flex-1"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                      {activeAccountOptions.map((acc) => (
                        <SelectItem
                          key={acc.id}
                          value={String(acc.id)}
                          className="text-xs"
                        >
                          {acc.accountEmail ??
                            acc.accountLabel ??
                            `Account ${acc.id}`}
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
                    onValueChange={numericSelectChange(field.onChange)}
                  >
                    <SelectTrigger
                      id="account-compose"
                      className="h-8 text-xs border-input bg-card flex-1"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                      {activeAccountOptions.map((acc) => (
                        <SelectItem
                          key={acc.id}
                          value={String(acc.id)}
                          className="text-xs"
                        >
                          {acc.accountEmail ??
                            acc.accountLabel ??
                            `Account ${acc.id}`}
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
              className="text-label font-medium w-12 shrink-0 pt-1.5"
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
                <p className="text-dense text-destructive mt-1">
                  {activeErrors.to.message ??
                    (Array.isArray(activeErrors.to)
                      ? activeErrors.to[0]?.message
                      : undefined)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-dense px-2 text-muted-foreground"
                onClick={onToggleCc}
              >
                Cc
              </Button>
              {!isReply && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-dense px-2 text-muted-foreground"
                  onClick={onToggleBcc}
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
                className="text-label font-medium w-12 shrink-0 pt-1.5"
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
                className="text-label font-medium w-12 shrink-0 pt-1.5"
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
                className="text-label font-medium w-12 shrink-0"
              >
                Subject
              </Label>
              <div className="flex-1 min-w-0">
                <Input
                  id={subjectFieldId}
                  className="h-8 text-label"
                  placeholder="Subject"
                  {...composeForm.register("subject")}
                />
                {composeForm.formState.errors.subject && (
                  <p className="text-dense text-destructive mt-1">
                    {composeForm.formState.errors.subject.message}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
