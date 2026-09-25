import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { DocumentClassification } from "@/types/hr";
import { classificationOption } from "./document-classification-model";

interface DocumentClassificationBadgeProps {
  classification: DocumentClassification;
  className?: string;
}

export function DocumentClassificationBadge({ classification, className }: DocumentClassificationBadgeProps) {
  const option = classificationOption(classification);
  return <SemanticBadge tone={option.tone} label={option.label} size="xs" className={className} />;
}
