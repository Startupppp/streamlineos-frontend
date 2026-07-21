import {
  APP_THEME_MODE_STORAGE_KEY,
  APP_THEME_STORAGE_KEY,
  getSelectableThemeIds,
} from "@/lib/theme/app-themes";

export function AppThemeScript({ nonce }: { nonce?: string }) {
  const script = `try{if(location.pathname.indexOf("/employee-onboarding")!==0){var d=document.documentElement;var t=localStorage.getItem(${JSON.stringify(
    APP_THEME_STORAGE_KEY,
  )});if(t&&${JSON.stringify(
    getSelectableThemeIds(),
  )}.indexOf(t)>-1){d.classList.add("theme-"+t)}var m=localStorage.getItem(${JSON.stringify(
    APP_THEME_MODE_STORAGE_KEY,
  )});if(m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches)){d.classList.add("dark");d.style.colorScheme="dark"}}}catch(e){}`;

  return (
    <script
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
