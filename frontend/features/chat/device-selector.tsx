"use client";

import { useEffect, useState } from "react";
import { Mic, Speaker } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

export function useMediaDevices() {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceOption[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceOption[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>("default");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>("default");

  useEffect(() => {
    const load = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputs(
          devices
            .filter((d) => d.kind === "audioinput")
            .map((d) => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 4)}` })),
        );
        setAudioOutputs(
          devices
            .filter((d) => d.kind === "audiooutput")
            .map((d) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 4)}` })),
        );
      } catch {}
    };
    load();
    navigator.mediaDevices.addEventListener("devicechange", load);
    return () => navigator.mediaDevices.removeEventListener("devicechange", load);
  }, []);

  return {
    audioInputs,
    audioOutputs,
    selectedAudioInput,
    selectedAudioOutput,
    setSelectedAudioInput,
    setSelectedAudioOutput,
  };
}

interface DeviceSelectorProps {
  show: boolean;
  onClose: () => void;
  audioInputs: MediaDeviceOption[];
  audioOutputs: MediaDeviceOption[];
  selectedAudioInput: string;
  selectedAudioOutput: string;
  onAudioInputChange: (deviceId: string) => void;
  onAudioOutputChange: (deviceId: string) => void;
}

export function DeviceSelector({
  show,
  onClose,
  audioInputs,
  audioOutputs,
  selectedAudioInput,
  selectedAudioOutput,
  onAudioInputChange,
  onAudioOutputChange,
}: DeviceSelectorProps) {
  if (!show) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onAudioInputChange(e.target.value);
  };

  const handleOutputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onAudioOutputChange(e.target.value);
  };

  return (
    <div className="absolute bottom-full mb-2 left-0 right-0 mx-4 bg-background border border-border/60 rounded-xl shadow-xl p-4 z-50">
      <h4 className="text-xs font-bold mb-3">Audio Settings</h4>

      {audioInputs.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Mic className="h-3 w-3 text-muted-foreground" />
            <label htmlFor="device-audio-input" className="text-dense font-medium text-muted-foreground">Microphone</label>
          </div>
          <select
            id="device-audio-input"
            value={selectedAudioInput}
            onChange={handleInputChange}
            className={cn(
              "w-full text-xs border border-border/50 rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:border-primary/40",
            )}
          >
            {audioInputs.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {audioOutputs.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Speaker className="h-3 w-3 text-muted-foreground" />
            <label htmlFor="device-audio-output" className="text-dense font-medium text-muted-foreground">Speaker</label>
          </div>
          <select
            id="device-audio-output"
            value={selectedAudioOutput}
            onChange={handleOutputChange}
            className={cn(
              "w-full text-xs border border-border/50 rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:border-primary/40",
            )}
          >
            {audioOutputs.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full mt-1 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
      >
        Done
      </button>
    </div>
  );
}
