"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Plus, TrendingUp, TrendingDown, Users, Eye, MousePointerClick,
} from "lucide-react";
import { useSocialMediaLatest, useUpsertSocialMediaStats } from "@/lib/api/hooks/social-media";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PLATFORMS = ["instagram", "twitter", "linkedin", "facebook", "youtube"] as const;
const PLATFORM_COLORS: Record<string, string> = {
  instagram: "text-pink-400",
  twitter: "text-sky-400",
  linkedin: "text-blue-400",
  facebook: "text-blue-600",
  youtube: "text-red-400",
};

export default function SocialMediaPage() {
  const [showEntry, setShowEntry] = useState(false);
  const [formData, setFormData] = useState({
    platform: "instagram" as typeof PLATFORMS[number],
    date: new Date().toISOString().split("T")[0],
    postsPublished: 0, storiesReels: 0, followersTotal: 0,
    engagementRate: "", impressions: 0, reach: 0, linkClicks: 0, profileVisits: 0,
  });

  const { data: latestData } = useSocialMediaLatest();
  const upsertMutation = useUpsertSocialMediaStats();

  const platforms = latestData;

  return (
    <PageWrapper
      title="Social Media Tracker"
      subtitle="Track daily social media metrics across platforms"
      actions={
        <Button onClick={() => setShowEntry(true)}><Plus className="h-4 w-4 mr-1" /> Add Daily Stats</Button>
      }
    >
      <div className="space-y-6">
        {/* Platform Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PLATFORMS.map(platform => {
            const data = platforms?.[platform];
            const latest = data?.latest;
            const previous = data?.previous;
            const newFollowers = latest && previous ? (latest.followersTotal || 0) - (previous.followersTotal || 0) : null;

            return (
              <Card key={platform}>
                <CardHeader className="pb-3">
                  <CardTitle className={cn("text-sm capitalize", PLATFORM_COLORS[platform])}>
                    {platform}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {latest ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Followers</p>
                          <p className="text-lg font-bold">{(latest.followersTotal || 0).toLocaleString()}</p>
                          {newFollowers !== null && (
                            <p className={cn("text-xs flex items-center gap-0.5",
                              newFollowers >= 0 ? "text-emerald-400" : "text-red-400"
                            )}>
                              {newFollowers >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {newFollowers >= 0 ? "+" : ""}{newFollowers}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Engagement</p>
                          <p className="text-lg font-bold">{latest.engagementRate || "0"}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" /> Impressions</p>
                          <p className="text-sm font-medium">{(latest.impressions || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Reach</p>
                          <p className="text-sm font-medium">{(latest.reach || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Posts</p>
                          <p className="text-sm font-medium">{latest.postsPublished || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> Link Clicks</p>
                          <p className="text-sm font-medium">{(latest.linkClicks || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Last updated: {latest.date}</p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground py-4 text-center">No data yet. Add daily stats to get started.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Entry Dialog */}
      <Dialog open={showEntry} onOpenChange={setShowEntry}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add Daily Social Stats</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Platform</Label>
                <Select value={formData.platform} onValueChange={(v) => setFormData(f => ({ ...f, platform: v as typeof PLATFORMS[number] }))}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" className="h-8" value={formData.date} onChange={(e) => setFormData(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "followersTotal", label: "Total Followers" },
                { key: "engagementRate", label: "Engagement Rate (%)" },
                { key: "postsPublished", label: "Posts Published" },
                { key: "storiesReels", label: "Stories/Reels" },
                { key: "impressions", label: "Impressions" },
                { key: "reach", label: "Reach" },
                { key: "linkClicks", label: "Link Clicks" },
                { key: "profileVisits", label: "Profile Visits" },
              ].map(field => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    type="number"
                    className="h-8"
                    value={(formData as Record<string, unknown>)[field.key] as string}
                    onChange={(e) => setFormData(f => ({
                      ...f,
                      [field.key]: field.key === "engagementRate" ? e.target.value : Number(e.target.value),
                    }))}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEntry(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(
              formData,
              { onSuccess: () => { toast.success("Stats saved"); setShowEntry(false); }, onError: (err) => toast.error(err.message) }
            )}>Save Stats</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
