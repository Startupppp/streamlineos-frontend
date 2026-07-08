"use client";

import Script from "next/script";

const WIDGET_KEY = "fb_demo_streamlineos_test";

export function FeedbucketEmbed() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) return null;
  return (
    <Script
      id="feedbucket-widget"
      src="/feedbucket-widget.js?v=4"
      data-key={WIDGET_KEY}
      data-api={apiBase}
      strategy="afterInteractive"
    />
  );
}
