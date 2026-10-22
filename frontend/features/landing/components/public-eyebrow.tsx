import { Badge } from "@/features/landing/relay/components/ui/badge";

type PublicEyebrowProps = { children: string };

export function PublicEyebrow({ children }: PublicEyebrowProps) {
  return (
    <div className="mb-4">
      <Badge label={children} />
    </div>
  );
}
