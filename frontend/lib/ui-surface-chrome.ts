export const SURFACE_OVERLAY =
  "fixed inset-0 z-[100] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none";

export const SURFACE_MODAL =
  "rounded-xl border border-border/80 bg-background text-foreground shadow-lg outline-none";

export const SURFACE_SHEET_MOBILE =
  "rounded-t-2xl border border-border/80 border-b-0 bg-background text-foreground shadow-lg outline-none";

export const SURFACE_FLOATING =
  "rounded-lg border border-border/80 bg-popover text-popover-foreground shadow-md outline-none";

export const SURFACE_TOAST =
  "rounded-lg border border-border/80 bg-background text-foreground shadow-lg";

export const SURFACE_CARD =
  "rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm";

export const SURFACE_CARD_INTERACTIVE =
  "transition-[border-color,box-shadow,background-color,color,transform] duration-200 ease-out motion-reduce:transition-none hover:border-foreground/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const SURFACE_CARD_SELECTED =
  "border-foreground bg-foreground text-background shadow-sm ring-1 ring-foreground/20 [&_.text-muted-foreground]:text-background/70";

export const SURFACE_CLOSE_BUTTON =
  "absolute right-3 top-3 flex size-8 items-center justify-center rounded-md text-muted-foreground opacity-70 outline-none transition-[opacity,background-color,color] duration-200 hover:bg-accent hover:text-accent-foreground hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

export const SURFACE_EMPTY =
  "h-full min-h-80 w-full flex-1 rounded-xl border border-dashed border-border/80 bg-card px-6 py-12";
