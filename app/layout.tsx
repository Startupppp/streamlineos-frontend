import type { Metadata } from "next";

import "../globals.css";
import { Toaster } from "../components/ui/sonner";
import { TRPCReactProvider } from "../trpc/react";
import { SessionProvider } from "../components/providers/session-provider";
import { ThemeProvider } from "../components/theme-provider";
import { MotionProvider } from "../components/providers/motion-provider";

import { JetBrains_Mono } from "next/font/google";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vaivamm CRM",
  description: "Advanced HR and Project Management",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jetbrains.variable} font-sans min-h-screen bg-background text-foreground antialiased selection:bg-gold/30 selection:text-gold noir-grain`}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            forcedTheme="light"
            disableTransitionOnChange
          >
          <SessionProvider>
            <MotionProvider>
              <TRPCReactProvider>{children}</TRPCReactProvider>
            </MotionProvider>
            <Toaster position="top-right" />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
