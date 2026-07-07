"use client";

import { useState, useTransition } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";

async function sendReply(
  publicCode: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiClient.post(`/api/owner/inbox/${publicCode}/reply`, { body });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: getErrorMessage(err),
    };
  }
}

export function ReplyComposer({
  publicCode,
  replied,
}: {
  publicCode: string;
  replied: boolean;
}) {
  const [body, setBody] = useState("");
  const [done, setDone] = useState(replied);
  const [pending, startTransition] = useTransition();

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value);
  };

  const handleSendAnother = () => setDone(false);

  const submit = () => {
    if (!body.trim()) {
      toast.error("Write something before sending.");
      return;
    }
    startTransition(async () => {
      const result = await sendReply(publicCode, body);
      if (result.ok) {
        setDone(true);
        setBody("");
        toast.success("Reply sent.");
      } else {
        toast.error(result.error);
      }
    });
  };

  if (done && !body) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 text-center">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
        <p className="text-[13px] font-medium text-slate-800">Reply sent.</p>
        <button
          onClick={handleSendAnother}
          className="text-[11px] font-medium text-blue-600 hover:underline mt-3"
        >
          Send another →
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-[11px] font-medium text-slate-500 mb-2">Reply</p>
      <Textarea
        value={body}
        onChange={handleBodyChange}
        rows={6}
        placeholder="Write a thoughtful reply — the customer receives this as a branded email."
        className="resize-y"
      />
      <div className="flex items-center justify-between mt-3">
        <p className="text-[11px] font-mono text-slate-400">
          Sends from no-reply@streamlineos.in · reply-to support@streamlineos.in
        </p>
        <Button onClick={submit} disabled={pending} className="h-9">
          {pending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              Sending…
            </>
          ) : (
            <>
              Send reply
              <Send className="h-3.5 w-3.5 ml-1.5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
