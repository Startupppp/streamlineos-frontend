const NS = "http://www.w3.org/2000/svg";

function icon(paths: string[], circles?: Array<[number, number, number]>, fill?: string): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", fill ?? "none");
  svg.setAttribute("stroke", fill ? "none" : "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  for (const d of paths) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    svg.appendChild(p);
  }
  for (const [cx, cy, r] of circles ?? []) {
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", String(cx));
    c.setAttribute("cy", String(cy));
    c.setAttribute("r", String(r));
    if (fill) c.setAttribute("fill", fill);
    svg.appendChild(c);
  }
  return svg;
}

function pickMime(): string {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "video/webm";
}

export class ScreenRecorder {
  private overlay: HTMLDivElement | null = null;
  private recorder: MediaRecorder | null = null;
  private displayStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private micEnabled = true;
  private paused = false;
  private mime = "video/webm";
  private resolveFn: ((b: Blob | null) => void) | null = null;

  private micBtn: HTMLButtonElement | null = null;
  private pauseBtn: HTMLButtonElement | null = null;

  async run(): Promise<Blob | null> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      return null;
    }
    try {
      this.displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    } catch {
      return null;
    }
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.micStream = null;
      this.micEnabled = false;
    }

    const tracks: MediaStreamTrack[] = [...this.displayStream.getVideoTracks()];
    if (this.micStream) tracks.push(...this.micStream.getAudioTracks());
    else tracks.push(...this.displayStream.getAudioTracks());
    const combined = new MediaStream(tracks);

    this.mime = pickMime();
    this.recorder = new MediaRecorder(combined, { mimeType: this.mime });
    this.chunks = [];
    this.recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    const videoTrack = this.displayStream.getVideoTracks()[0];
    if (videoTrack) videoTrack.addEventListener("ended", this.handleStop);

    this.recorder.start();
    this.mountControls();

    return new Promise((resolve) => {
      this.resolveFn = resolve;
      if (this.recorder) {
        this.recorder.onstop = () => {
          const blob = new Blob(this.chunks, { type: this.mime });
          this.cleanup();
          resolve(blob.size > 0 ? blob : null);
          this.resolveFn = null;
        };
      }
    });
  }

  private mountControls(): void {
    const overlay = document.createElement("div");
    overlay.id = "feedbucket-recorder";
    overlay.style.cssText = "position:fixed;top:0;left:0;z-index:2147483646;";
    const shadow = overlay.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = this.styles();
    shadow.appendChild(style);

    const bar = document.createElement("div");
    bar.className = "rc-bar";
    const grip = document.createElement("div");
    grip.className = "rc-grip";
    grip.appendChild(icon([], [[9, 6, 0.6], [15, 6, 0.6], [9, 12, 0.6], [15, 12, 0.6], [9, 18, 0.6], [15, 18, 0.6]]));
    bar.appendChild(grip);

    this.micBtn = this.controlButton("Toggle microphone", this.handleToggleMic, this.micIcon());
    bar.appendChild(this.micBtn);
    this.pauseBtn = this.controlButton("Pause", this.handlePauseResume, icon(["M6 4h4v16H6z", "M14 4h4v16h-4z"]));
    bar.appendChild(this.pauseBtn);

    const stop = this.controlButton("Stop recording", this.handleStop, icon([], [[12, 12, 6]], "#ef4444"));
    stop.classList.add("rc-stop");
    bar.appendChild(stop);

    const close = this.controlButton("Cancel", this.handleCancel, icon(["M18 6L6 18", "M6 6l12 12"]));
    bar.appendChild(close);

    shadow.appendChild(bar);
    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  private controlButton(label: string, handler: () => void, svg: SVGSVGElement): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rc-btn";
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.appendChild(svg);
    btn.addEventListener("click", handler);
    return btn;
  }

  private micIcon(): SVGSVGElement {
    if (this.micEnabled) {
      return icon(["M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z", "M19 10v2a7 7 0 0 1-14 0v-2", "M12 19v4"]);
    }
    return icon(["M1 1l22 22", "M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6", "M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23", "M12 19v4"]);
  }

  private readonly handleToggleMic = (): void => {
    if (!this.micStream) return;
    this.micEnabled = !this.micEnabled;
    for (const t of this.micStream.getAudioTracks()) t.enabled = this.micEnabled;
    if (this.micBtn) {
      this.micBtn.replaceChildren(this.micIcon());
      this.micBtn.classList.toggle("rc-off", !this.micEnabled);
    }
  };

  private readonly handlePauseResume = (): void => {
    if (!this.recorder) return;
    if (this.paused) {
      this.recorder.resume();
      this.paused = false;
      if (this.pauseBtn) {
        this.pauseBtn.replaceChildren(icon(["M6 4h4v16H6z", "M14 4h4v16h-4z"]));
        this.pauseBtn.title = "Pause";
      }
    } else {
      this.recorder.pause();
      this.paused = true;
      if (this.pauseBtn) {
        this.pauseBtn.replaceChildren(icon(["M5 3l14 9-14 9V3z"]));
        this.pauseBtn.title = "Resume";
      }
    }
  };

  private readonly handleStop = (): void => {
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.stop();
    }
  };

  private readonly handleCancel = (): void => {
    this.chunks = [];
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.onstop = () => {
        this.cleanup();
      };
      this.recorder.stop();
    } else {
      this.cleanup();
    }
    if (this.resolveFn) {
      this.resolveFn(null);
      this.resolveFn = null;
    }
  };

  private cleanup(): void {
    this.displayStream?.getTracks().forEach((t) => t.stop());
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.overlay?.remove();
    this.overlay = null;
  }

  private styles(): string {
    return `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; }
.rc-bar {
  position: fixed; top: 16px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 4px;
  background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 6px 8px; box-shadow: 0 8px 28px rgba(11,18,32,0.22);
  font-family: -apple-system, system-ui, sans-serif;
}
.rc-grip { display: flex; align-items: center; justify-content: center; width: 20px; height: 32px; color: #94a3b8; }
.rc-btn {
  display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border: none; background: none;
  border-radius: 9px; color: #334155; cursor: pointer; transition: background 120ms ease;
}
.rc-btn:hover { background: #f1f5f9; }
.rc-btn.rc-off { color: #ef4444; }
.rc-stop:hover { background: #fee2e2; }
`;
  }
}
