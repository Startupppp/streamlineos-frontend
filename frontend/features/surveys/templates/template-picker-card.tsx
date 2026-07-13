import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface TemplatePickerCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

export function TemplatePickerCard({ icon: Icon, title, description, onClick, disabled }: TemplatePickerCardProps) {
  return (
    <Card
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) onClick();
      }}
      className={cn(
        "h-full cursor-pointer transition-all hover:shadow-md hover:border-brand-core/40",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-core/10">
          <Icon className="h-5 w-5 text-brand-core" />
        </div>
        <p className="font-semibold text-sm">{title}</p>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
