import Link from "next/link";
import Image from "next/image";

export function BrandHeader() {
  return (
    <header className="w-full glass border-b border-gold/10 px-6 py-3 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/logo.svg" alt="Vaivamm Logo" width={28} height={28} className="rounded-lg" />
        <span className="text-lg font-bold tracking-tight text-foreground">Vaivamm CRM</span>
      </Link>
    </header>
  );
}
