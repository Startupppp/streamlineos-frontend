"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useCan } from "@/hooks/api/access";
import { useAcceptIntakeRequest } from "@/hooks/api/build/intake-mutations";
import { useUpdateIntakeRequest } from "@/hooks/api/build/intake";
import { useTicket } from "@/hooks/api/build/tickets";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { getIntakeTicketHref, buildIntakeReturnHref } from "@/features/build/ticket-details/build-ticket-detail-url";
import {
  intakeDecisionSchema,
  type IntakeDecisionForm,
} from "../intake-schema";
import { authenticatedScope } from "@/lib/query-scope";
import { getErrorMessage } from "@/lib/get-error-message";
import type { IntakeRequest } from "@/types/projects";
import { DecisionFields } from "./intake-decision-fields";

type DecisionAction = IntakeDecisionForm["action"];
type Decision = { requestId: number; action: DecisionAction };
type Actions = {
  onAccept: (requestId: number) => void;
  onDecline: (requestId: number) => void;
  onDuplicate: (requestId: number) => void;
};
type Props = { projectId: number; children: (actions: Actions) => ReactNode };

const ACCEPT_TOAST_DURATION_MS = 20_000;
const TITLES = {
  accept: "Accept Intake Item",
  decline: "Decline Intake Item",
  duplicate: "Mark Intake Item as Duplicate",
};
const SUBMIT_LABELS = {
  accept: "Accept & Create",
  decline: "Decline Item",
  duplicate: "Mark as Duplicate",
};

const DecisionFormDialog = dynamic(
  () =>
    import("@/components/shared/entity-form-dialog").then(
      (module) => module.EntityFormDialog<IntakeDecisionForm>,
    ),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="text-sm text-muted-foreground">Loading decision form…</p>
    ),
  },
);
export function IntakeDecisionDialog({ projectId, children }: Props) {
  const { data: session, status } = useSession();
  const canManage = useCan("build:workspace:manage");
  const identity =
    status === "authenticated" && session?.orgId && session.user?.id
      ? authenticatedScope(session.orgId, session.user.id)
      : "";
  return (
    <DecisionOwner
      key={`${projectId}:${identity}:${canManage}`}
      projectId={projectId}
      orgId={session?.orgId ?? ""}
      enabled={!!identity && canManage}
    >
      {children}
    </DecisionOwner>
  );
}

function DecisionOwner({
  projectId,
  orgId,
  enabled,
  children,
}: Props & { orgId: string; enabled: boolean }) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [pending, setPending] = useState(false);
  const active = useRef<Decision | null>(null);
  const inFlight = useRef(false);
  const acceptMutation = useAcceptIntakeRequest();
  const updateMutation = useUpdateIntakeRequest();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestLeave = useNavigationLeave();
  const canViewTicket = useCan("build:tickets:view");
  const [acceptedTicket, setAcceptedTicket] = useState<{ id: number; ticketNumber?: number; toastId: string | number } | null>(null);
  const { data: ticket, isPending: ticketPending, isError: ticketError } = useTicket(
    enabled ? projectId : 0,
    enabled && !acceptedTicket?.ticketNumber ? (acceptedTicket?.id ?? 0) : 0,
    INLINE_READ_ERROR,
  );
  const ticketNumber = acceptedTicket?.ticketNumber ?? (
    acceptedTicket && !ticketPending && !ticketError &&
    ticket?.id === acceptedTicket.id && ticket.projectId === projectId
      ? ticket.ticketNumber : 0
  );
  const ticketHref = enabled && canViewTicket && ticketNumber > 0
      ? getIntakeTicketHref(
          projectId,
          null,
          ticketNumber,
          buildIntakeReturnHref(projectId, searchParams),
        )
      : null;
  const currentTicketNavigation = useRef<{ href: string; requestLeave: typeof requestLeave } | null>(null);
  const offeredTicket = useRef<typeof acceptedTicket>(null);

  useLayoutEffect(() => {
    currentTicketNavigation.current = ticketHref ? { href: ticketHref, requestLeave } : null;
    return () => {
      currentTicketNavigation.current = null;
    };
  }, [ticketHref, requestLeave]);

  useEffect(() => {
    if (!acceptedTicket || !ticketHref || offeredTicket.current === acceptedTicket) return;
    offeredTicket.current = acceptedTicket;
    const destinationHref = ticketHref;
    function handleViewTicket() {
      if (currentTicketNavigation.current?.href !== destinationHref) return;
      currentTicketNavigation.current.requestLeave(() => {
        if (currentTicketNavigation.current?.href === destinationHref)
          router.push(destinationHref);
      });
    }
    toast.success("Item accepted — ticket created", {
      id: acceptedTicket.toastId,
      duration: ACCEPT_TOAST_DURATION_MS,
      action: { label: "View ticket", onClick: handleViewTicket },
    });
  }, [acceptedTicket, ticketHref, requestLeave, router]);

  useLayoutEffect(() => {
    active.current = decision;
    return () => {
      active.current = null;
    };
  }, [decision]);

  const openDecision = useCallback(
    (requestId: number, action: DecisionAction) => {
      if (!enabled || pending) return;
      setDecision({ requestId, action });
    },
    [enabled, pending],
  );
  const onAccept = useCallback((id: number) => openDecision(id, "accept"), [openDecision]);
  const onDecline = useCallback((id: number) => openDecision(id, "decline"), [openDecision]);
  const onDuplicate = useCallback((id: number) => openDecision(id, "duplicate"), [openDecision]);
  const onOpenChange = useCallback((open: boolean) => {
    if (open || inFlight.current) return;
    active.current = null;
    setDecision(null);
  }, []);

  const onSubmit = useCallback(
    (data: IntakeDecisionForm) => {
      const submitted = active.current;
      if (
        !enabled ||
        !submitted ||
        submitted.action !== data.action ||
        inFlight.current
      )
        return;
      inFlight.current = true;
      setPending(true);
      const onError = (error: Error) => {
        if (active.current !== submitted) return;
        inFlight.current = false;
        setPending(false);
        toast.error(getErrorMessage(error));
      };
      const onSuccess = (result: IntakeRequest) => {
        if (active.current !== submitted) return;
        const expectedStatus =
          data.action === "accept"
            ? "accepted"
            : data.action === "decline"
              ? "declined"
              : "duplicate";
        if (
          result.id !== submitted.requestId ||
          result.projectId !== projectId ||
          result.orgId !== orgId ||
          result.status !== expectedStatus ||
          (data.action === "duplicate" &&
            result.linkedWorkItemId !== data.linkedWorkItemId)
        ) {
          onError(
            new Error(
              "The decision response did not match this request. Please retry.",
            ),
          );
          return;
        }
        active.current = null;
        inFlight.current = false;
        setPending(false);
        setDecision(null);
        if (submitted.action === "accept" && result.linkedWorkItemId) {
          const toastId = toast.success("Item accepted — ticket created", {
            duration: ACCEPT_TOAST_DURATION_MS,
          });
          const summary = result.linkedTicket;
          const ticketNumber = summary?.id === result.linkedWorkItemId &&
            summary.projectId === projectId && Number.isSafeInteger(summary.ticketNumber) &&
            summary.ticketNumber > 0 ? summary.ticketNumber : undefined;
          setAcceptedTicket({ id: result.linkedWorkItemId, ticketNumber, toastId });
        } else
          toast.success(
            submitted.action === "accept"
              ? "Item accepted and work item created"
              : submitted.action === "decline"
                ? "Item declined"
                : "Item marked as duplicate",
          );
      };
      const target = { intakeRequestId: submitted.requestId, projectId };
      if (data.action === "accept") {
        acceptMutation.mutate(
          {
            ...target,
            status: "accepted",
            state: data.state,
            assigneeId: data.assigneeId,
            cycleId: data.cycleId,
            moduleId: data.moduleId,
          },
          { onSuccess, onError },
        );
      } else {
        updateMutation.mutate(
          data.action === "decline"
            ? { ...target, status: "declined", declineReason: data.reason }
            : {
                ...target,
                status: "duplicate",
                linkedWorkItemId: data.linkedWorkItemId,
              },
          { onSuccess, onError },
        );
      }
    },
    [enabled, projectId, orgId, acceptMutation, updateMutation],
  );

  return (
    <>
      {children({ onAccept, onDecline, onDuplicate })}
      {decision && (
        <DecisionFormDialog
          key={`${decision.requestId}:${decision.action}`}
          open
          onOpenChange={onOpenChange}
          title={TITLES[decision.action]}
          description={
            decision.action === "duplicate"
              ? "Select the existing ticket this request duplicates."
              : "Review this request before submitting your decision."
          }
          resolver={zodResolver(intakeDecisionSchema)}
          defaultValues={
            decision.action === "accept"
              ? { action: "accept", state: "" }
              : decision.action === "decline"
                ? { action: "decline", reason: "" }
                : { action: "duplicate" }
          }
          onSubmit={onSubmit}
          isSubmitting={pending}
          submitLabel={SUBMIT_LABELS[decision.action]}
        >
          {() => (
            <DecisionFields projectId={projectId} action={decision.action} pending={pending} />
          )}
        </DecisionFormDialog>
      )}
    </>
  );
}

