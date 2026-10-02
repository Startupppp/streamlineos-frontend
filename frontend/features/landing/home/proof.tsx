import Image from "next/image";
import { customerLogos } from "./proof-data";

const PLACEHOLDER_BOX =
  "flex items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground";

/** Customer logos, or labelled empty slots until real ones are approved. */
export function LogoStrip({ caption }: { caption: string }) {
  return (
    <div>
      <p className="text-center text-sm text-muted-foreground">{caption}</p>
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {customerLogos.length > 0
          ? customerLogos.map((logo) => (
              <li key={logo.name} className="flex h-12 items-center justify-center">
                <Image
                  src={logo.src}
                  alt={logo.name}
                  width={120}
                  height={32}
                  loading="lazy"
                  className="max-h-8 w-auto opacity-70 grayscale"
                />
              </li>
            ))
          : Array.from({ length: 5 }, (_, i) => (
              <li key={i} className={`${PLACEHOLDER_BOX} h-12 text-xs last:hidden sm:last:flex`}>
                Logo placeholder
              </li>
            ))}
      </ul>
    </div>
  );
}
