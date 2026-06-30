"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { queryKeys } from "@/lib/query-keys";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

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
  const esRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    if (status !== "authenticated") return;
    activeRef.current = true;

    async function connect() {
      if (!activeRef.current) return;
      const token = await fetchStreamToken();
      if (!token || !activeRef.current) return;

      const es = new EventSource(`${BACKEND_URL}/notifications/events?token=${encodeURIComponent(token)}`);
      esRef.current = es;

      es.onmessage = () => {
        void qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
        void qc.invalidateQueries({ queryKey: queryKeys.notifications.list() });
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
  }, [status, qc]);
}
