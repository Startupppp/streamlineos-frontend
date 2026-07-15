"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, Copy, CheckCheck, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { useCrmEmailDraft, useSummarizeNotes, useCrmObjectionHelp } from "@/hooks/api/crm";
import { useOrgFeatureFlags } from "@/hooks/api/ai";

type AiEntityType = "lead" | "deal" | "contact";
type EmailTone = "formal" | "friendly" | "urgent";

interface EmailDraftResult {
  subject: string;
  body: string;
  generatedAt: string;
}

interface NotesResult {
  summary: string;
  actionItems: string[];
  objections: string[];
  sentiment: "positive" | "neutral" | "negative";
}

interface ObjectionResult {
  counterArguments: string[];
  talkingPoints: string[];
  suggestedResponse: string;
}

interface AiAssistantPanelProps {
  entityType: AiEntityType;
  entityId: number;
  entityName?: string;
  onOpenEmailCompose?: (prefill: { subject: string; body: string }) => void;
}

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  neutral: "bg-muted text-muted-foreground border-border",
  negative: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? (
        <CheckCheck className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function EmailDraftTab({
  entityType,
  entityId,
  onOpenEmailCompose,
}: {
  entityType: AiEntityType;
  entityId: number;
  onOpenEmailCompose?: (prefill: { subject: string; body: string }) => void;
}) {
  const [intent, setIntent] = useState("");
  const [tone, setTone] = useState<EmailTone>("formal");
  const [result, setResult] = useState<EmailDraftResult | null>(null);

  const { mutate: draft, isPending } = useCrmEmailDraft();

  const handleDraft = useCallback(() => {
    if (!intent.trim()) {
      toast.error("Please describe your email intent.");
      return;
    }
    draft(
      { entityType: entityType === "contact" ? "lead" : entityType, entityId, intent, tone },
      {
        onSuccess: (data) => setResult(data),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [draft, entityType, entityId, intent, tone]);

  const handleIntentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIntent(e.target.value);
  }, []);

  const handleToneChange = useCallback((val: string) => {
    setTone(val as EmailTone);
  }, []);

  const handleOpenCompose = useCallback(() => {
    if (result && onOpenEmailCompose) {
      onOpenEmailCompose({ subject: result.subject, body: result.body });
    }
  }, [result, onOpenEmailCompose]);

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="e.g. follow up after no response for 2 weeks"
        value={intent}
        onChange={handleIntentChange}
        className="min-h-[72px] text-sm resize-none"
      />
      <Select value={tone} onValueChange={handleToneChange}>
        <SelectTrigger className="text-xs">
          <SelectValue placeholder="Tone" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="formal">Formal</SelectItem>
          <SelectItem value="friendly">Friendly</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
        </SelectContent>
      </Select>
      <LoadingButton
        size="sm"
        isPending={isPending}
        loadingText="Drafting..."
        onClick={handleDraft}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Draft Email
      </LoadingButton>
      {result && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</p>
            <CopyButton text={result.subject} />
          </div>
          <p className="text-xs text-foreground">{result.subject}</p>
          <div className="flex items-start justify-between gap-2 pt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Body</p>
            <CopyButton text={result.body} />
          </div>
          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{result.body}</p>
          {onOpenEmailCompose && (
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-1 h-7 text-xs gap-1.5"
              onClick={handleOpenCompose}
            >
              <ExternalLink className="h-3 w-3" />
              Open in Email Composer
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function AiDisabledBanner({ href }: { href: string }) {
  return (
    <div className="py-2 text-center text-xs text-muted-foreground bg-muted/50 rounded-lg px-3">
      This AI feature is disabled for your organization. Enable it in{" "}
      <Link href={href} className="text-primary hover:underline">
        AI Settings
      </Link>
      .
    </div>
  );
}

function NotesSummaryTab({ aiEnabled }: { aiEnabled: boolean }) {
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<NotesResult | null>(null);

  const { mutate: summarize, isPending } = useSummarizeNotes();

  const handleSummarize = useCallback(() => {
    if (!notes.trim()) {
      toast.error("Please paste some notes to summarize.");
      return;
    }
    summarize(notes, {
      onSuccess: (data) => setResult(data),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [summarize, notes]);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  }, []);

  if (!aiEnabled) return <AiDisabledBanner href="/crm/settings/ai" />;

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Paste your meeting or call notes here..."
        value={notes}
        onChange={handleNotesChange}
        className="min-h-[90px] text-sm resize-none"
      />
      <LoadingButton
        size="sm"
        isPending={isPending}
        loadingText="Summarizing..."
        onClick={handleSummarize}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Summarize
      </LoadingButton>
      {result && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Summary</p>
            <p className="text-xs text-foreground leading-relaxed">{result.summary}</p>
          </div>
          {result.actionItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Action Items</p>
              <ul className="space-y-0.5">
                {result.actionItems.map((item, i) => (
                  <li key={i} className="text-xs text-foreground flex gap-1.5">
                    <span className="text-primary shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.objections.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Objections</p>
              <ul className="space-y-0.5">
                {result.objections.map((obj, i) => (
                  <li key={i} className="text-xs text-foreground flex gap-1.5">
                    <span className="text-amber-500 shrink-0">•</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Badge
            variant="outline"
            className={`text-[10px] capitalize ${SENTIMENT_COLOR[result.sentiment] ?? ""}`}
          >
            {result.sentiment} sentiment
          </Badge>
        </div>
      )}
    </div>
  );
}

function ObjectionHelpTab({ aiEnabled }: { aiEnabled: boolean }) {
  const [objection, setObjection] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<ObjectionResult | null>(null);

  const { mutate: getHelp, isPending } = useCrmObjectionHelp();

  const handleGetHelp = useCallback(() => {
    if (!objection.trim()) {
      toast.error("Please describe the objection.");
      return;
    }
    getHelp(
      { objection, context: context.trim() || undefined },
      {
        onSuccess: (data) => setResult(data),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [getHelp, objection, context]);

  const handleObjectionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setObjection(e.target.value);
  }, []);

  const handleContextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContext(e.target.value);
  }, []);

  if (!aiEnabled) return <AiDisabledBanner href="/crm/settings/ai" />;

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="e.g. Your price is too high compared to competitors"
        value={objection}
        onChange={handleObjectionChange}
        className="min-h-[60px] text-sm resize-none"
      />
      <Textarea
        placeholder="Optional: additional context about the deal or prospect"
        value={context}
        onChange={handleContextChange}
        className="min-h-[50px] text-sm resize-none"
      />
      <LoadingButton
        size="sm"
        isPending={isPending}
        loadingText="Getting help..."
        onClick={handleGetHelp}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Get Help
      </LoadingButton>
      {result && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          {result.counterArguments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Counter Arguments</p>
              <ul className="space-y-0.5">
                {result.counterArguments.map((arg, i) => (
                  <li key={i} className="text-xs text-foreground flex gap-1.5">
                    <span className="text-primary shrink-0">•</span>
                    {arg}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.talkingPoints.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Talking Points</p>
              <ul className="space-y-0.5">
                {result.talkingPoints.map((pt, i) => (
                  <li key={i} className="text-xs text-foreground flex gap-1.5">
                    <span className="text-emerald-500 shrink-0">•</span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Suggested Response</p>
              <CopyButton text={result.suggestedResponse} />
            </div>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{result.suggestedResponse}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function AiAssistantPanel({ entityType, entityId, entityName, onOpenEmailCompose }: AiAssistantPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: flags } = useOrgFeatureFlags();

  const emailEnabled = flags?.aiEmailDraft !== false;
  const chatEnabled = flags?.aiChat !== false;

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">AI Sales Assistant</span>
          {entityName && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">{entityName}</span>
          )}
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <Tabs defaultValue="email">
                <TabsList className="w-full text-xs mb-3">
                  <TabsTrigger value="email" className="flex-1 text-xs">Email Draft</TabsTrigger>
                  <TabsTrigger value="notes" className="flex-1 text-xs">Notes Summary</TabsTrigger>
                  <TabsTrigger value="objection" className="flex-1 text-xs">Objection Help</TabsTrigger>
                </TabsList>
                <TabsContent value="email">
                  {emailEnabled ? (
                    <EmailDraftTab
                      entityType={entityType}
                      entityId={entityId}
                      onOpenEmailCompose={onOpenEmailCompose}
                    />
                  ) : (
                    <AiDisabledBanner href="/crm/settings/ai" />
                  )}
                </TabsContent>
                <TabsContent value="notes">
                  <NotesSummaryTab aiEnabled={chatEnabled} />
                </TabsContent>
                <TabsContent value="objection">
                  <ObjectionHelpTab aiEnabled={chatEnabled} />
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
