"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface IncomingNotification {
  id: number;
  title: string;
  message: string;
  priority: string;
  category: string;
  link?: string | null;
  eventKey?: string | null;
}

async function fetchStreamToken(): Promise<string | null> {
  try {
    const sessionRes = await fetch("/api/auth/session", { credentials: "include" });
    if (!sessionRes.ok) return null;
    const session = (await sessionRes.json()) as { backendJwt?: string };
    if (!session.backendJwt) return null;

    const res = await fetch(`${BACKEND_URL}/notifications/events/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.backendJwt}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token: string };
    return data.token ?? null;
  } catch {
    return null;
  }
}

export function useNotificationEvents() {
  const qc = useQueryClient();
  const { status } = useSession();
  const router = useRouter();
  const esRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    if (status !== "authenticated") return;
    activeRef.current = true;

    function showIncoming(n: IncomingNotification) {
      if (n.priority === "LOW") return;
      const openLink = () => {
        if (n.link) router.push(n.link);
      };
      toast(n.title, {
        description: n.message,
        ...(n.link ? { action: { label: "View", onClick: openLink } } : {}),
      });
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" && document.hidden) {
        try {
          const native = new Notification(n.title, { body: n.message, tag: `notif-${n.id}` });
          native.onclick = () => {
            window.focus();
            if (n.link) router.push(n.link);
            native.close();
          };
        } catch {
          // Some browsers throw if the page isn't in a secure context — ignore.
        }
      }
    }

    async function connect() {
      if (!activeRef.current) return;
      const token = await fetchStreamToken();
      if (!token || !activeRef.current) return;

      const es = new EventSource(`${BACKEND_URL}/notifications/events?token=${encodeURIComponent(token)}`);
      esRef.current = es;

      es.onmessage = (event) => {
        void qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
        void qc.invalidateQueries({ queryKey: queryKeys.notifications.list() });
        try {
          const parsed = JSON.parse(event.data) as { type?: string; notification?: IncomingNotification };
          if (parsed.type === "notification" && parsed.notification) showIncoming(parsed.notification);
        } catch {
          // Ignore malformed frames.
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (activeRef.current) {
          retryTimeoutRef.current = setTimeout(() => {
            void connect();
          }, 10_000);
        }
      };
    }

    void connect();

    return () => {
      activeRef.current = false;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [status, qc, router]);
}
