import { Newsreader } from "next/font/google";

const journalSerif = Newsreader({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-journal-serif",
  display: "swap",
  adjustFontFallback: true,
});

export const JOURNAL_FONT_CLASS = journalSerif.variable;
