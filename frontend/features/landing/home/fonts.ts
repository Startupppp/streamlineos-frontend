import { Instrument_Serif } from "next/font/google";

/**
 * Display face for the landing page only. The founder's reference pairs a light,
 * condensed serif for headlines with a plain sans for everything else; the app
 * itself never loads it.
 */
export const displaySerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-lp-display",
});
