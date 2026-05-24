import Image from "next/image";
import Link from "next/link";

export function CareersBrand({ href = "/careers" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 group">
      <div className="relative h-9 w-9 rounded-lg border border-gold/20 bg-card flex items-center justify-center overflow-hidden shadow-sm">
        <Image src="/logo.svg" alt="Vaivamm" width={28} height={28} className="rounded" />
      </div>
      <span className="text-lg font-bold font-serif tracking-tight text-foreground group-hover:opacity-90 transition-opacity">
        Vaivamm
      </span>
    </Link>
  );
}
