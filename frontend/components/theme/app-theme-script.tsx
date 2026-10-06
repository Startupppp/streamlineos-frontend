"use client";

import { APP_FONT_CLASS } from "@/lib/theme/app-fonts";
import {
  APP_THEME_MODE_STORAGE_KEY,
  APP_THEME_STORAGE_KEY,
  AUTHENTICATED_PALETTE_CLASS,
  getSelectableThemeIds,
} from "@/lib/theme/app-themes";

const SHELL_CLASSES = [AUTHENTICATED_PALETTE_CLASS, ...APP_FONT_CLASS.split(" ")];

export function AppThemeScript({ nonce }: { nonce?: string }) {
  const script = `try{var d=document.documentElement;${JSON.stringify(SHELL_CLASSES)}.forEach(function(c){d.classList.add(c)});var t=localStorage.getItem(${JSON.stringify(
    APP_THEME_STORAGE_KEY,
  )});if(t&&${JSON.stringify(
    getSelectableThemeIds(),
  )}.indexOf(t)>-1){d.classList.add("theme-"+t)}var m=localStorage.getItem(${JSON.stringify(
    APP_THEME_MODE_STORAGE_KEY,
  )});var dark=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);d.classList.toggle("dark",dark);d.classList.toggle("light",!dark);d.style.colorScheme=dark?"dark":"light"}catch(e){}`;

  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
