import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

const appSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const appMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

/** Class names that define the authenticated font variables on <html>. */
export const APP_FONT_CLASS = `${appSans.variable} ${appMono.variable}`;
