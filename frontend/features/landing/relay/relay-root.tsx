import { Fragment_Mono, Instrument_Serif, Inter } from "next/font/google";
import type { ReactNode } from "react";

import { ReducedMotion } from "@/features/landing/relay/components/common/reduced-motion";
import { ScrollLayout } from "@/features/landing/relay/layouts/scroll-layout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: "italic",
  subsets: ["latin"],
  display: "swap",
});

const fragmentMono = Fragment_Mono({
  variable: "--font-fragment-mono",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

/**
 * The public site's wrapper: Relay's fonts, its dark theme (every Relay
 * token is declared on `.relay-root`, styles/relay.css), Lenis smooth
 * scrolling and the reduced-motion switch. Only public pages mount it, so
 * none of it reaches the authenticated app.
 */
export const RelayRoot = ({ children }: { children: ReactNode }) => (
  <div
    className={`relay-root dark ${inter.variable} ${instrumentSerif.variable} ${fragmentMono.variable}`}
  >
    <ScrollLayout>
      <ReducedMotion />
      {children}
    </ScrollLayout>
  </div>
);
