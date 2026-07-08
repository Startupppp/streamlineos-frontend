export function getStyles(): string {
  return `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
[hidden] { display: none !important; }

.widget {
  position: fixed;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #0b1220;
}
.widget.positioned { transform: none; }
.widget.dragging { user-select: none; }
.widget.dragging * { cursor: grabbing !important; }

.launcher {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px;
  background: #ffffff;
  border: 1px solid #e6eaf0;
  border-radius: 16px;
  box-shadow: 0 6px 24px rgba(11,18,32,0.16);
}
.launcher-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  background: none;
  border: none;
  border-radius: 11px;
  color: #334155;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, transform 100ms ease;
}
.launcher-btn:hover { background: #f1f5f9; color: #0b1220; }
.launcher-btn:active { transform: scale(0.92); }
.launcher-btn svg { width: 19px; height: 19px; }
.launcher-divider { width: 22px; height: 1px; background: #eef1f5; margin: 2px 0; }
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 22px;
  color: #94a3b8;
  cursor: grab;
  touch-action: none;
  border-radius: 8px;
}
.drag-handle:hover { color: #475569; background: #f1f5f9; }
.drag-handle:active { cursor: grabbing; }
.drag-handle svg { width: 16px; height: 16px; }

.panel {
  position: absolute;
  top: 0;
  right: calc(100% + 10px);
  width: 340px;
  min-width: 288px;
  max-width: calc(100vw - 32px);
  height: auto;
  max-height: min(600px, calc(100vh - 32px));
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(11,18,32,0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  resize: both;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: scale(0.97);
  transform-origin: top right;
  transition: opacity 180ms ease, transform 180ms ease, visibility 0ms linear 180ms;
}
.panel.flip-left { right: auto; left: calc(100% + 10px); transform-origin: top left; }
.panel[aria-hidden="false"] {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: none;
  transition: opacity 180ms ease, transform 180ms ease, visibility 0ms;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 15px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
  flex-shrink: 0;
}
.panel-title { font-size: 14px; font-weight: 600; color: #0b1220; }
.close-btn {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; background: none; border: none; border-radius: 6px;
  color: #64748b; cursor: pointer; font-size: 18px; line-height: 1;
  transition: background 140ms ease, color 140ms ease;
}
.close-btn:hover { background: #f1f5f9; color: #0b1220; }

.panel-body {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
}

.type-group { display: flex; gap: 6px; flex-wrap: wrap; }
.type-btn {
  padding: 5px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px;
  font-size: 12px; font-weight: 500; color: #475569; cursor: pointer; font-family: inherit;
  transition: border-color 140ms ease, background 140ms ease, color 140ms ease;
}
.type-btn:hover { border-color: #94a3b8; color: #0b1220; }
.type-btn.selected { background: #0b1220; border-color: #0b1220; color: #ffffff; }

.message-textarea {
  width: 100%; min-height: 84px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px;
  font-family: inherit; font-size: 13px; color: #0b1220; background: #ffffff; resize: vertical; outline: none;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}
.message-textarea:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.message-textarea::placeholder { color: #94a3b8; }

.screenshot-section { display: flex; flex-direction: column; gap: 8px; }
.capture-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 8px 12px;
  background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 13px; font-family: inherit;
  color: #475569; cursor: pointer; transition: border-color 140ms ease, background 140ms ease, color 140ms ease;
}
.capture-btn:hover { border-color: #3b82f6; background: #eff6ff; color: #3b82f6; }
.capture-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.capture-btn svg { width: 16px; height: 16px; }
.screenshot-preview-wrap { position: relative; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0; }
.screenshot-img { width: 100%; display: block; max-height: 140px; object-fit: cover; }
.remove-screenshot-btn {
  position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; background: rgba(11,18,32,0.65);
  border: none; border-radius: 50%; color: #ffffff; font-size: 14px; cursor: pointer; display: flex;
  align-items: center; justify-content: center; line-height: 1; transition: background 140ms ease;
}
.remove-screenshot-btn:hover { background: rgba(11,18,32,0.85); }

.optional-fields { display: flex; flex-direction: column; gap: 8px; }
.text-input {
  width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: inherit;
  font-size: 13px; color: #0b1220; background: #ffffff; outline: none;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}
.text-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.text-input::placeholder { color: #94a3b8; }

.actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 2px; }
.cancel-btn {
  padding: 8px 16px; background: none; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px;
  font-weight: 500; font-family: inherit; color: #475569; cursor: pointer;
  transition: border-color 140ms ease, color 140ms ease;
}
.cancel-btn:hover { border-color: #94a3b8; color: #0b1220; }
.submit-btn {
  padding: 8px 18px; background: #0b1220; border: none; border-radius: 8px; font-size: 13px; font-weight: 500;
  font-family: inherit; color: #ffffff; cursor: pointer; transition: background 140ms ease, transform 100ms ease;
}
.submit-btn:hover { background: #1e293b; }
.submit-btn:active { transform: scale(0.98); }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.result-view {
  padding: 34px 22px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center;
  flex: 1 1 auto; justify-content: center;
}
.result-icon {
  width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 700; flex-shrink: 0;
}
.result-icon.success-icon { background: #dcfce7; color: #16a34a; }
.result-icon.error-icon { background: #fee2e2; color: #dc2626; }
.result-title { font-size: 15px; font-weight: 600; color: #0b1220; }
.result-subtitle { font-size: 13px; color: #64748b; }
.done-btn, .retry-btn {
  margin-top: 6px; padding: 8px 20px; background: #0b1220; border: none; border-radius: 8px; font-size: 13px;
  font-weight: 500; font-family: inherit; color: #ffffff; cursor: pointer; transition: background 140ms ease;
}
.done-btn:hover, .retry-btn:hover { background: #1e293b; }

@media (max-width: 480px) {
  .panel { width: calc(100vw - 24px); max-width: calc(100vw - 24px); resize: none; }
}
@media (prefers-reduced-motion: reduce) {
  .launcher-btn, .panel, .type-btn, .close-btn, .capture-btn, .remove-screenshot-btn,
  .submit-btn, .cancel-btn, .done-btn, .retry-btn, .text-input, .message-textarea { transition: none !important; }
  .panel[aria-hidden="false"] { transition: none !important; }
}
`;
}
