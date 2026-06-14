"use client";

import { useCallback } from "react";
import { Plus, Trash2, Star, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCrmPageAnalytics } from "@/lib/api/hooks/marketing";
import type { CrmPageTestimonial } from "@/lib/api/hooks/marketing";

interface AnalyticsPanelProps {
  pageId: number;
}

export function AnalyticsPanel({ pageId }: AnalyticsPanelProps) {
  const { data, isLoading } = useCrmPageAnalytics(pageId, 30);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { summary, dailyViews, deviceBreakdown, utmSourceBreakdown } = data;
  const maxViews = Math.max(...dailyViews.map((d) => d.views), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-2xl font-bold">{summary.totalViews.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Views</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-2xl font-bold">{summary.totalLeads.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Leads Generated</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.conversionRate}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Conversion Rate</p>
        </div>
      </div>

      {dailyViews.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Daily Views (30 days)</p>
          <div className="flex items-end gap-0.5 h-20 bg-muted/30 rounded-md p-2">
            {dailyViews.slice(-30).map((d) => {
              const pct = Math.round((d.views / maxViews) * 100);
              return (
                <div
                  key={d.date}
                  className="flex-1 rounded-sm bg-primary/70 hover:bg-primary transition-colors cursor-default"
                  style={{ height: `${Math.max(pct, 3)}%` }}
                  title={`${d.date}: ${d.views} views`}
                />
              );
            })}
          </div>
        </div>
      )}

      {deviceBreakdown.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Device Breakdown</p>
          <div className="space-y-2">
            {deviceBreakdown.map((d) => {
              const total = deviceBreakdown.reduce((s, x) => s + x.count, 0);
              const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
              return (
                <div key={d.type} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="capitalize text-muted-foreground">{d.type}</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {utmSourceBreakdown.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Lead Sources</p>
          <div className="space-y-1.5">
            {utmSourceBreakdown.slice(0, 8).map((r) => {
              const total = utmSourceBreakdown.reduce((s, x) => s + x.count, 0);
              const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
              return (
                <div key={r.source} className="flex items-center gap-2 text-xs">
                  <span className="w-28 truncate text-muted-foreground capitalize">{r.source}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-medium">{r.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dailyViews.length === 0 && deviceBreakdown.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No analytics data yet — publish the page to start tracking visits.
        </p>
      )}
    </div>
  );
}

interface TestimonialsEditorProps {
  testimonials: CrmPageTestimonial[];
  setTestimonials: (t: CrmPageTestimonial[]) => void;
  showTrustSection: boolean;
  setShowTrustSection: (v: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function TestimonialsEditor({
  testimonials,
  setTestimonials,
  showTrustSection,
  setShowTrustSection,
  onSave,
  isSaving,
}: TestimonialsEditorProps) {
  const addTestimonial = useCallback(() => {
    setTestimonials([
      ...testimonials,
      { id: crypto.randomUUID(), name: "", text: "", rating: 5 },
    ]);
  }, [testimonials, setTestimonials]);

  const removeTestimonial = useCallback(
    (id: string) => {
      setTestimonials(testimonials.filter((t) => t.id !== id));
    },
    [testimonials, setTestimonials],
  );

  const updateTestimonial = useCallback(
    (id: string, field: keyof CrmPageTestimonial, value: string | number) => {
      setTestimonials(
        testimonials.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
      );
    },
    [testimonials, setTestimonials],
  );

  return (
    <div className="max-w-2xl space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Trust & Social Proof Section</CardTitle>
              <CardDescription>
                Show testimonials below the hero on your landing page.
              </CardDescription>
            </div>
            <Switch checked={showTrustSection} onCheckedChange={setShowTrustSection} />
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {testimonials.map((t) => (
          <Card key={t.id}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={t.name}
                      onChange={(e) => updateTestimonial(t.id, "name", e.target.value)}
                      placeholder="Jane Doe"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Role / Company</Label>
                    <Input
                      value={t.role ?? ""}
                      onChange={(e) => updateTestimonial(t.id, "role", e.target.value)}
                      placeholder="CEO, Acme Corp"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive mt-5"
                  onClick={() => removeTestimonial(t.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Testimonial Text</Label>
                <Textarea
                  value={t.text}
                  onChange={(e) => updateTestimonial(t.id, "text", e.target.value)}
                  placeholder="This service transformed our business..."
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Rating</Label>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => updateTestimonial(t.id, "rating", star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          (t.rating ?? 0) >= star
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={addTestimonial}
          className="gap-2 w-full"
        >
          <Plus className="h-4 w-4" />
          Add Testimonial
        </Button>
      </div>

      <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-2">
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save Testimonials
      </Button>
    </div>
  );
}
