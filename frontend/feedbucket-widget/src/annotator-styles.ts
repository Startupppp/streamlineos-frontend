export function annotatorStyles(): string {
  return `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; }
.an-root {
  position: fixed; inset: 0; background: rgba(11,18,32,0.55);
  display: flex; align-items: center; justify-content: center;
  font-family: -apple-system, system-ui, 'Segoe UI', sans-serif;
}
.an-stage { position: relative; box-shadow: 0 12px 48px rgba(0,0,0,0.4); border-radius: 6px; overflow: hidden; }
.an-canvas { display: block; cursor: crosshair; touch-action: none; }
.an-pin-layer { position: absolute; inset: 0; pointer-events: none; }
.an-pin {
  position: absolute; transform: translate(-50%,-50%); width: 24px; height: 24px; border-radius: 50%;
  background: #ef4444; color: #fff; font-size: 13px; font-weight: 700; display: flex; align-items: center;
  justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); pointer-events: none;
}
.an-toolbar {
  position: fixed; top: 18px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 2px;
  background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 6px; box-shadow: 0 8px 28px rgba(11,18,32,0.2);
}
.an-grip { display: flex; align-items: center; justify-content: center; width: 24px; height: 34px; color: #94a3b8; }
.an-tool {
  display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border: none; background: none;
  border-radius: 8px; color: #334155; cursor: pointer; transition: background 120ms ease, color 120ms ease;
}
.an-tool:hover { background: #f1f5f9; color: #0b1220; }
.an-tool.active { background: #6366f1; color: #fff; }
.an-close { color: #64748b; }
.an-comment-box {
  position: fixed; width: min(288px, calc(100vw - 2rem)); max-width: calc(100vw - 2rem);
  background: #fff; border-radius: 12px; box-shadow: 0 10px 36px rgba(11,18,32,0.28);
  padding: 12px; display: flex; flex-direction: column; gap: 8px; pointer-events: auto; z-index: 10;
  box-sizing: border-box;
}
@media (max-width: 480px) {
  .an-toolbar {
    max-width: calc(100vw - 1.5rem); overflow-x: auto; top: max(12px, env(safe-area-inset-top, 0px));
  }
  .an-comment-box { width: calc(100vw - 2rem); max-width: calc(100vw - 2rem); }
}
.an-type-row { display: flex; flex-wrap: wrap; gap: 4px; }
.an-chip {
  padding: 3px 9px; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 14px; font-size: 11px; color: #475569;
  cursor: pointer; font-family: inherit;
}
.an-chip.active { background: #0b1220; border-color: #0b1220; color: #fff; }
.an-title, .an-desc {
  width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; font-size: 13px; font-family: inherit;
  color: #0b1220; outline: none; resize: none;
}
.an-title:focus, .an-desc:focus { border-color: #6366f1; }
.an-ai-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: 100%;
  padding: 7px 12px; background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; border-radius: 8px;
  font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 120ms ease;
}
.an-ai-btn:hover { background: #e0e7ff; }
.an-ai-btn:disabled { opacity: 0.7; cursor: default; }
.an-ai-note { font-size: 11px; color: #b45309; }
.an-box-footer { display: flex; justify-content: flex-end; }
.an-submit {
  padding: 7px 18px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600;
  font-family: inherit; cursor: pointer;
}
.an-submit:hover { background: #4f46e5; }
`;
}
