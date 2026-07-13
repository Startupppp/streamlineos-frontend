"use client";

import {
  APP_THEME_STORAGE_KEY,
  getSelectableThemeIds,
} from "@/lib/theme/app-themes";

export function AppThemeScript({ nonce }: { nonce?: string }) {
  const script = `try{var t=localStorage.getItem(${JSON.stringify(
    APP_THEME_STORAGE_KEY,
  )});if(t&&${JSON.stringify(
    getSelectableThemeIds(),
  )}.indexOf(t)>-1){document.documentElement.classList.add("theme-"+t)}}catch(e){}`;

  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
