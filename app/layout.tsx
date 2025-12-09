import type { Metadata } from "next";
import { dark } from "@clerk/themes";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import "../globals.css";
import { Toaster } from "../components/ui/sonner";
import { TRPCReactProvider } from "../trpc/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vaivamm CRM",
  description: "Advanced HR and Project Management",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
      }}
    >
      <html lang="en" className="dark" suppressHydrationWarning>
        <body
          className={`${inter.className} min-h-screen bg-black text-white antialiased selection:bg-gold/30 selection:text-gold`}
        >
          <TRPCReactProvider>{children}</TRPCReactProvider>
          <Toaster position="bottom-right" theme="dark" />
        </body>
      </html>
    </ClerkProvider>
  );
}
