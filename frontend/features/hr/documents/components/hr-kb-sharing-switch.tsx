"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ErrorReference } from "@/components/shared/error-reference";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { useCan } from "@/hooks/api/access";
import { useHrKbLinkFlagsAdmin, useUpdateHrKbLinkFlags, type HrKbLinkFlags } from "@/hooks/api/kb/hr-link-config";
import { getErrorMessage } from "@/lib/get-error-message";

type FlagName = keyof HrKbLinkFlags;

interface FlagCopy {
  label: string;
  on: string;
  off: string;
  /** What has to be on first, and how to say so. */
  needs: { flag: FlagName; hint: string } | null;
  turnOn: { title: string; description: string; success: string };
  turnOff: { title: string; description: string; success: string };
}

const COPY: Record<FlagName, FlagCopy> = {
  link: {
    label: "Share company documents in the Knowledge Base",
    on: "On. HR can classify a document and add it to the Knowledge Base for the people it is meant for.",
    off: "Off. Nothing about HR documents shows in the Knowledge Base.",
    needs: null,
    turnOn: {
      title: "Turn on sharing in the Knowledge Base?",
      description:
        "HR will be able to classify documents and add company policies to the Knowledge Base. Nothing is shared until HR adds a document, and personal documents such as payslips and contracts can never be shared.",
      success: "Company documents can now be shared in the Knowledge Base.",
    },
    turnOff: {
      title: "Turn off sharing in the Knowledge Base?",
      description:
        "The feature disappears for everyone straight away, and search and the assistants stop using company documents too. Documents already shared stay as they are and come back if you turn this on again.",
      success: "Sharing company documents in the Knowledge Base is off.",
    },
  },
  search: {
    label: "Let people search company documents",
    on: "On. A search in the Knowledge Base also finds company documents the person is allowed to open.",
    off: "Off. Search finds pages only.",
    needs: { flag: "link", hint: "Turn on sharing first." },
    turnOn: {
      title: "Let people search company documents?",
      description:
        "A search will also match a company document's name, description, category and tags. People only ever find documents they could already open, and the contents of the files are not searched.",
      success: "Company documents can now be searched.",
    },
    turnOff: {
      title: "Stop searching company documents?",
      description: "Search finds pages only again, and the assistants stop using company documents too.",
      success: "Company documents are no longer searched.",
    },
  },
  ai: {
    label: "Let the AI assistants use company documents",
    on: "On. Ask KB and Ask OS may draw on, and cite, company documents the person could open themselves.",
    off: "Off. The assistants never use company documents.",
    needs: { flag: "search", hint: "Turn on search first." },
    turnOn: {
      title: "Let the AI assistants use company documents?",
      description:
        "The assistants may then use a company document's title, category, effective date and description in an answer, and cite it, but only for a person who could open that document. The contents of the files are never read or sent. Answers are produced by the AI provider your organisation already uses.",
      success: "The AI assistants can now use company documents.",
    },
    turnOff: {
      title: "Stop the AI assistants using company documents?",
      description: "The assistants stop using and citing company documents straight away.",
      success: "The AI assistants no longer use company documents.",
    },
  },
};

const ORDER: readonly FlagName[] = ["link", "search", "ai"];

interface FlagRowProps {
  flag: FlagName;
  on: boolean;
  locked: boolean;
  pending: boolean;
  onAsk: (flag: FlagName, next: boolean) => void;
}

function FlagRow({ flag, on, locked, pending, onAsk }: FlagRowProps) {
  const copy = COPY[flag];
  const handleChange = useCallback((next: boolean) => onAsk(flag, next), [flag, onAsk]);
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{copy.label}</p>
        <p className="text-xs text-muted-foreground">{locked && copy.needs ? `${copy.needs.hint} ${copy.off}` : on ? copy.on : copy.off}</p>
      </div>
      <Switch checked={on} onCheckedChange={handleChange} disabled={pending || locked} aria-label={copy.label} />
    </div>
  );
}

/**
 * The organisation's switches for company documents in the Knowledge Base, for the person who administers the
 * Knowledge Base (`kb:settings:manage`). Everyone else sees nothing here. All three are OFF for every organisation
 * until someone turns them on, each needs the one before it, and turning one on shares nothing by itself: HR
 * still has to classify a document and add it. Turning one off takes effect at once and leaves everything where
 * it is, so turning it back on restores it.
 */
export function HrKbSharingSwitch() {
  const canManage = useCan("kb:settings:manage");
  const admin = useHrKbLinkFlagsAdmin();
  const update = useUpdateHrKbLinkFlags();
  const [confirming, setConfirming] = useState<{ flag: FlagName; next: boolean } | null>(null);
  const [failure, setFailure] = useState<unknown>(null);

  const handleAsk = useCallback((flag: FlagName, next: boolean) => setConfirming({ flag, next }), []);
  const handleDialogChange = useCallback((open: boolean) => { if (!open) setConfirming(null); }, []);
  const handleConfirm = useCallback(async () => {
    if (confirming === null) return;
    setFailure(null);
    try {
      await update.mutateAsync({ [confirming.flag]: confirming.next });
      const copy = COPY[confirming.flag];
      toast.success(confirming.next ? copy.turnOn.success : copy.turnOff.success);
    } catch (error) {
      setFailure(error);
      toast.error(getErrorMessage(error));
    } finally {
      setConfirming(null);
    }
  }, [confirming, update]);

  if (!canManage || !admin.data) return null;
  const stored = admin.data.stored;
  const dialog = confirming === null ? null : confirming.next ? COPY[confirming.flag].turnOn : COPY[confirming.flag].turnOff;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3">
      {ORDER.map((flag) => {
        const needs = COPY[flag].needs;
        return <FlagRow key={flag} flag={flag} on={stored[flag]} locked={needs !== null && !stored[needs.flag]} pending={update.isPending} onAsk={handleAsk} />;
      })}
      {!admin.data.hrModuleEnabled ? (
        <p className="text-xs text-muted-foreground">The HR module has to be enabled for this to work.</p>
      ) : null}
      {failure !== null ? (
        <Alert variant="destructive">
          <AlertTitle>Not changed</AlertTitle>
          <AlertDescription>
            <p>{getErrorMessage(failure)}</p>
            <ErrorReference error={failure} className="mt-2 justify-start" />
          </AlertDescription>
        </Alert>
      ) : null}
      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={handleDialogChange}
        title={dialog?.title ?? ""}
        description={dialog?.description ?? ""}
        confirmLabel={confirming?.next ? "Turn on" : "Turn off"}
        destructive={confirming !== null && !confirming.next}
        isPending={update.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirm}
      />
    </div>
  );
}
