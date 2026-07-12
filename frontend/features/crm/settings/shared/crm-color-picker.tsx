"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { getCrmTokenClasses } from "@/features/crm/shared/metadata";
import { cn } from "@/lib/utils";

const COLOR_TOKENS = [
  "blue",
  "emerald",
  "amber",
  "red",
  "slate",
  "cyan",
  "sky",
  "orange",
  "pink",
  "violet",
] as const;

type CrmColorToken = (typeof COLOR_TOKENS)[number];

interface CrmColorPickerProps {
  value: string;
  onChange: (token: string) => void;
  className?: string;
}

export function CrmColorPicker({ value, onChange, className }: CrmColorPickerProps) {
  const { dotClass } = getCrmTokenClasses(value);

  function handleSelect(token: CrmColorToken) {
    onChange(token);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn("h-7 w-7 rounded", className)}
          aria-label="Pick color"
        >
          <span className={cn("h-2 w-2 rounded-full", dotClass)} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-5 gap-1">
          {COLOR_TOKENS.map((token) => {
            const { dotClass: dc } = getCrmTokenClasses(token);
            const isSelected = value === token;

            function handleClick() {
              handleSelect(token);
            }

            return (
              <button
                key={token}
                type="button"
                aria-label={token}
                onClick={handleClick}
                className={cn(
                  "h-7 w-7 rounded-md border-2 flex items-center justify-center transition-colors",
                  isSelected
                    ? "border-blue-500 ring-2 ring-blue-500/20"
                    : "border-border",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", dc)} />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
