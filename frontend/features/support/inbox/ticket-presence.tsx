"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { usePresence, usePresenceListener } from "ably/react";
import { Users } from "lucide-react";

const TYPING_EVENT = "support:ticket-typing";
const TYPING_IDLE_MS = 3000;

export function dispatchTicketTyping(ticketId: number) {
  window.dispatchEvent(new CustomEvent(TYPING_EVENT, { detail: { ticketId } }));
}

interface TicketPresenceData {
  userId: string;
  name: string;
  isTyping: boolean;
}

interface TicketPresenceProps {
  ticketId: number;
}

export function TicketPresence({ ticketId }: TicketPresenceProps) {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const userId = session?.user?.id;
  const name = session?.user?.name ?? session?.user?.email;

  if (!orgId || !userId) return null;

  return (
    <TicketPresenceInner
      key={ticketId}
      ticketId={ticketId}
      orgId={orgId}
      userId={userId}
      name={name ?? "Agent"}
    />
  );
}

interface TicketPresenceInnerProps {
  ticketId: number;
  orgId: string;
  userId: string;
  name: string;
}

function TicketPresenceInner({ ticketId, orgId, userId, name }: TicketPresenceInnerProps) {
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    let idleTimeout: ReturnType<typeof setTimeout> | undefined;

    function handleTyping(e: Event) {
      const detail = (e as CustomEvent<{ ticketId: number }>).detail;
      if (detail?.ticketId !== ticketId) return;
      setIsTyping(true);
      if (idleTimeout) clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => setIsTyping(false), TYPING_IDLE_MS);
    }

    window.addEventListener(TYPING_EVENT, handleTyping);
    return () => {
      window.removeEventListener(TYPING_EVENT, handleTyping);
      if (idleTimeout) clearTimeout(idleTimeout);
    };
  }, [ticketId]);

  const channelName = `support:${orgId}:${ticketId}`;
  const presenceData = useMemo<TicketPresenceData>(
    () => ({ userId, name, isTyping }),
    [userId, name, isTyping],
  );

  const { updateStatus } = usePresence<TicketPresenceData>(channelName, presenceData);
  const { presenceData: members } = usePresenceListener<TicketPresenceData>(channelName);

  useEffect(() => {
    void updateStatus(presenceData);
  }, [presenceData, updateStatus]);

  const others = useMemo(
    () => members.filter((m) => m.data?.userId && m.data.userId !== userId),
    [members, userId],
  );

  if (others.length === 0) return null;

  const typingNames = others.filter((m) => m.data.isTyping).map((m) => m.data.name);
  const viewingNames = others.filter((m) => !m.data.isTyping).map((m) => m.data.name);

  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Users className="h-3.5 w-3.5 shrink-0" />
      {typingNames.length > 0 ? (
        <span className="truncate">
          {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing…
        </span>
      ) : (
        <span className="truncate">Also viewing: {viewingNames.join(", ")}</span>
      )}
    </div>
  );
}
