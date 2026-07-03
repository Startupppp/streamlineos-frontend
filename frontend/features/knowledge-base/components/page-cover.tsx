"use client";

import { useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

const GRADIENT_PRESETS = [
  { key: "slate", css: "linear-gradient(135deg, #1e293b 0%, #334155 100%)" },
  { key: "ocean", css: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)" },
  { key: "forest", css: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)" },
  { key: "sunset", css: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)" },
  { key: "rose", css: "linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)" },
  { key: "violet", css: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)" },
  { key: "amber", css: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)" },
  { key: "dark", css: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" },
] as const;

function getCoverStyle(coverImage: string | null): React.CSSProperties {
  if (!coverImage) return {};
  if (coverImage.startsWith("gradient:")) {
    const key = coverImage.slice(9);
    const preset = GRADIENT_PRESETS.find((p) => p.key === key);
    return preset ? { background: preset.css } : {};
  }
  return {
    backgroundImage: `url(${coverImage})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

interface PageCoverProps {
  coverImage: string | null;
  isEditable: boolean;
  onCoverChange: (cover: string | null) => void;
}

function GradientPicker({
  onSelect,
}: {
  onSelect: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-3">
      {GRADIENT_PRESETS.map((p) => (
        <button
          key={p.key}
          data-gradient-key={p.key}
          className="h-10 rounded-md border border-border hover:ring-2 hover:ring-primary transition-all"
          style={{ background: p.css }}
          onClick={onSelect}
          aria-label={p.key}
        />
      ))}
    </div>
  );
}

export default function PageCover({
  coverImage,
  isEditable,
  onCoverChange,
}: PageCoverProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  function handleGradientSelect(e: React.MouseEvent<HTMLButtonElement>) {
    const key = e.currentTarget.dataset.gradientKey;
    if (!key) return;
    onCoverChange(`gradient:${key}`);
    setPickerOpen(false);
  }

  function handleApplyUrl() {
    if (!urlInput.trim()) return;
    onCoverChange(urlInput.trim());
    setUrlInput("");
    setPickerOpen(false);
  }

  function handleRemoveCover() {
    onCoverChange(null);
    setPickerOpen(false);
  }

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUrlInput(e.target.value);
  }

  if (!coverImage) {
    if (!isEditable) return null;
    return (
      <div className="group relative h-8 flex items-end px-6 max-w-4xl mx-auto w-full">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground gap-1"
            >
              <ImageIcon className="h-3 w-3" />
              Add cover
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4">
            <p className="text-xs font-semibold mb-2">Choose gradient</p>
            <GradientPicker onSelect={handleGradientSelect} />
            <p className="text-xs font-semibold mb-1">Or image URL</p>
            <div className="flex gap-2">
              <Input
                value={urlInput}
                onChange={handleUrlChange}
                placeholder="https://â€¦"
                className="h-7 text-xs"
              />
              <Button size="sm" onClick={handleApplyUrl} className="h-7 text-xs">
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="group relative h-40 w-full" style={getCoverStyle(coverImage)}>
      {isEditable && (
        <div className="absolute bottom-3 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="secondary" className="text-xs h-7">
                Change cover
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4">
              <p className="text-xs font-semibold mb-2">Choose gradient</p>
              <GradientPicker onSelect={handleGradientSelect} />
              <p className="text-xs font-semibold mb-1">Or image URL</p>
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={handleUrlChange}
                  placeholder="https://â€¦"
                  className="h-7 text-xs"
                />
                <Button size="sm" onClick={handleApplyUrl} className="h-7 text-xs">
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            size="sm"
            variant="secondary"
            className="text-xs h-7"
            onClick={handleRemoveCover}
          >
            <X className="h-3 w-3 mr-1" />
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
