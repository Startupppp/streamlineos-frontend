import { Newsreader } from "next/font/google";

/**
 * Newsreader (SIL Open Font License), self-hosted by next/font at build time: no request to Google
 * at page load. Two weights plus italic keep the download small; `swap` shows fallback text at once
 * and the metric-adjusted fallback keeps the swap from shifting layout.
 */
const journalSerif = Newsreader({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-journal-serif",
  display: "swap",
  adjustFontFallback: true,
});

export const JOURNAL_FONT_CLASS = journalSerif.variable;
