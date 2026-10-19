import { Badge } from "@/features/landing/relay/components/ui/badge";

type PublicEyebrowProps = { children: string };

/** A public page's eyebrow — Relay's section badge (accent dot + label pill). */
export function PublicEyebrow({ children }: PublicEyebrowProps) {
  return (
    <div className="mb-4">
      <Badge label={children} />
    </div>
  );
}
