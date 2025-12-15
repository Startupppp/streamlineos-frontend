import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "../globals.css";
import { Toaster } from "../components/ui/sonner";
import { TRPCReactProvider } from "../trpc/react";
import { SessionProvider } from "../components/providers/session-provider";
import { ThemeProvider } from "../components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

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
        className={`${inter.className} min-h-screen bg-background text-foreground antialiased selection:bg-[#ba931e]/30 selection:text-[#ba931e]`}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
          <SessionProvider>
            <TRPCReactProvider>{children}</TRPCReactProvider>
            <Toaster position="top-right" />

          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
