export default function BuilderLoading() {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading workflow builder…</p>
      </div>
    </div>
  );
}
