import Image from "next/image";
import Link from "next/link";

import { PillButton } from "@/features/landing/relay/components/ui/pill-button";
import { Reveal } from "@/features/landing/relay/components/ui/reveal";
import type { NavContent } from "@/features/landing/relay/data/nav";

import { BreathingDot } from "./breathing-dot";
import { NavMenu } from "./nav-menu";
import { NavShell } from "./nav-shell";

type NavProps = NavContent & {
  reveal?: boolean;
};

const BAR =
  "relative z-10 mx-page flex h-22 w-page items-center justify-between px-page-inset w768:h-16 w768:px-8 w390:h-14 w390:px-page-inset";

export const Nav = ({ brand, links, status, cta, reveal = true }: NavProps) => {
  const bar = (
    <>
      <Link href={brand.href} className="flex items-center gap-3">
        <Image
          src="/landing/relay/nav/nav-logo-mark.svg"
          alt=""
          width={28}
          height={28}
          className="size-7"
          priority
        />
        <span className="text-wordmark leading-lead font-medium w768:text-lead w390:text-body w390:leading-body tracking-wordmark text-foreground">
          {brand.name}
        </span>
      </Link>

      <nav aria-label="Primary" className="w390:hidden">
        <ul className="flex items-center gap-10 text-relay-label leading-label w1024:gap-8 w768:gap-6 text-foreground-muted">
          {links.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="whitespace-nowrap transition-colors duration-(--motion-fast) ease-entrance hover:text-accent"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-3 w390:gap-2">
        <p className="flex h-11 items-center w768:hidden gap-2 overflow-clip rounded-full border border-border-glass bg-surface-status px-4 shadow-float">
          <BreathingDot />
          <span className="font-mono text-relay-label leading-label whitespace-nowrap text-foreground">
            {status}
          </span>
        </p>
        <PillButton href={cta.href}>{cta.label}</PillButton>
        <NavMenu brand={brand} links={links} status={status} cta={cta} />
      </div>
    </>
  );
  return (
    <NavShell>
      {reveal ? (
        <Reveal tag="header" variant="fade" className={BAR}>
          {bar}
        </Reveal>
      ) : (
        <header className={BAR}>{bar}</header>
      )}
    </NavShell>
  );
};
