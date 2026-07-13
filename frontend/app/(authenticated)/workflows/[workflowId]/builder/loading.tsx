export default function BuilderLoading() {
  return (
    <div className="flex-1 flex items-center justify-center bg-background h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading workflow builder…</p>
      </div>
    </div>
  );
}
