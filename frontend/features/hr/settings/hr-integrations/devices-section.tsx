"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface LinkCard {
  label: string;
  description: string;
  href: string;
}

const LINK_CARDS: LinkCard[] = [
  {
    label: "Biometric Devices",
    description: "Configure fingerprint/face-scan devices for time & attendance capture.",
    href: "/hr/biometric",
  },
  {
    label: "Attendance Devices",
    description: "Manage registered clock-in devices and their health.",
    href: "/hr/devices",
  },
  {
    label: "Background Verification",
    description: "Configure BGV vendor integrations for candidate screening.",
    href: "/hr/background-verification",
  },
];

export function DevicesSection() {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Devices &amp; Providers</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure hardware integrations and external service providers.
        </p>
      </div>

      <div className="rounded-lg border divide-y">
        {LINK_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group"
          >
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium">{card.label}</p>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
