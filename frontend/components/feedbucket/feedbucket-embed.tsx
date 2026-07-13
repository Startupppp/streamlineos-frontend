"use client";

import Script from "next/script";

const WIDGET_KEY = "fb_qd_tfFaGhsUVL7QS-DeH-nKWIR46Sq99";

export function FeedbucketEmbed() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) return null;
  return (
    <Script
      id="feedbucket-widget"
      src="/feedbucket-widget.js?v=9"
      data-key={WIDGET_KEY}
      data-api={apiBase}
      strategy="afterInteractive"
    />
  );
}
