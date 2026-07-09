import { Card } from "@/components/ui/card";

export default function FormLoading() {
  return (
    <main className="min-h-screen surface-soft flex items-start justify-center pt-8 sm:pt-12 px-4">
      <div className="w-full max-w-lg">
        <div className="gradient-brand rounded-t-2xl px-6 py-8 shadow-noir">
          <div className="h-7 bg-white/20 rounded animate-pulse w-1/2 mx-auto" />
        </div>
        <Card className="rounded-t-none border-t-0 px-6 py-6 shadow-noir space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 bg-slate-200 rounded animate-pulse w-24" />
              <div className="h-10 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
          <div className="h-11 bg-slate-200 rounded animate-pulse" />
        </Card>
      </div>
    </main>
  );
}
