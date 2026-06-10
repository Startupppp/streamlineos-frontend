"use client";

import { useCallback, useEffect, useRef } from "react";
import Script from "next/script";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

type Props = {
  onToken: (token: string | null) => void;
  theme?: "light" | "dark" | "auto";
  className?: string;
};

export function TurnstileWidget({ onToken, theme = "light", className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const render = useCallback(() => {
    if (!siteKey || !containerRef.current) return;
    if (widgetIdRef.current) return;
    const w = window as unknown as { turnstile?: TurnstileApi };
    if (!w.turnstile) return;
    widgetIdRef.current = w.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme,
      callback: (token: string) => onToken(token),
      "expired-callback": () => onToken(null),
      "error-callback": () => onToken(null),
    });
  }, [siteKey, theme, onToken]);

  useEffect(() => {
    render();
    return () => {
      const w = window as unknown as { turnstile?: TurnstileApi };
      if (widgetIdRef.current && w.turnstile) {
        try {
          w.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [render]);

  if (!siteKey) return null;

  return (
    <>
      <div ref={containerRef} className={className} aria-label="Bot verification" />
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
        onLoad={render}
      />
    </>
  );
}

export function isTurnstileEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}
