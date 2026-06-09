"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "sl_v_sid";
const SENT_KEY = "sl_v_sent";

function makeSessionToken(): string {
  if (typeof window === "undefined") return "";
  let token = window.localStorage.getItem(STORAGE_KEY);
  if (!token) {
    token =
      window.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(STORAGE_KEY, token);
  }
  return token;
}

/* Fires a single anonymous beacon per page navigation. No cookies, no IDs
   that can identify a person — just a per-browser session token. */
export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname) return;

    const sessionToken = makeSessionToken();
    const sentKey = `${SENT_KEY}:${pathname}`;
    if (window.sessionStorage.getItem(sentKey)) return;
    window.sessionStorage.setItem(sentKey, "1");

    const payload = JSON.stringify({
      sessionToken,
      path: pathname,
      referrer: document.referrer || null,
    });

    const sendBeacon = () => {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/platform/visit", blob);
        return;
      }
      fetch("/api/platform/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    };

    const t = window.setTimeout(sendBeacon, 250);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return null;
}
