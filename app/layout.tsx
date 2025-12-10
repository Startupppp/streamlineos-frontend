import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "../globals.css";
import { Toaster } from "../components/ui/sonner";
import { TRPCReactProvider } from "../trpc/react";
import { SessionProvider } from "../components/providers/session-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vaivamm CRM",
  description: "Advanced HR and Project Management",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen bg-black text-white antialiased selection:bg-gold/30 selection:text-gold`}
      >
        <SessionProvider>
          <TRPCReactProvider>{children}</TRPCReactProvider>
          <Toaster position="bottom-right" theme="dark" />
        </SessionProvider>
      </body>
    </html>
  );
}
