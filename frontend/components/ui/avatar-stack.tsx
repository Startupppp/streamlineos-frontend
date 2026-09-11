
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

interface User {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
}

interface AvatarStackProps {
  users: User[];
  limit?: number;
  className?: string;
  onSelect?: (userId: string) => void;
  selectedIds?: string[];
}

function displayName(user: User): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
}

export function AvatarStack({ users, limit = 5, className, onSelect, selectedIds = [] }: AvatarStackProps) {
  const visibleUsers = users.slice(0, limit);
  const remainingCount = Math.max(0, users.length - limit);

  return (
    <div className={cn("flex -space-x-3 items-center", className)}>
      <TooltipProvider>
        {visibleUsers.map((user) => {
          const isSelected = selectedIds.includes(user.id);
          const name = displayName(user);
          const face = (
            <Avatar
              className={cn(
                "h-8 w-8 border-2 border-background",
                isSelected && "ring-2 ring-primary border-primary",
              )}
            >
              <AvatarImage src={resolveImageUrl(user.image)} />
              <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                {user.firstName?.[0]}
                {user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
          );
          function handleSelect() {
            onSelect?.(user.id);
          }
          return (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                {onSelect ? (
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={name || "Team member"}
                    className={cn(
                      "relative rounded-full transition-transform hover:z-10 hover:scale-110 cursor-pointer",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:z-10",
                      isSelected && "z-20 scale-110",
                    )}
                    onClick={handleSelect}
                  >
                    {face}
                  </button>
                ) : (
                  <span className={cn("relative", isSelected && "z-20 scale-110")}>{face}</span>
                )}
              </TooltipTrigger>
              <TooltipContent>
                <p>{name}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>

      {remainingCount > 0 && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium text-muted-foreground hover:bg-muted/80 z-0">
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
