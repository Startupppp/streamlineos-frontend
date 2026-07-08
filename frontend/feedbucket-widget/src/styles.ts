export function getStyles(): string {
  return `
:host {
  all: initial;
}
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
.widget {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #0b1220;
}
.trigger-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: #0b1220;
  color: #ffffff;
  border: none;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(11,18,32,0.28);
  transition: transform 150ms ease, box-shadow 150ms ease;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.trigger-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(11,18,32,0.38);
}
.trigger-btn:active {
  transform: scale(0.97);
  box-shadow: 0 2px 8px rgba(11,18,32,0.2);
}
.trigger-btn svg {
  flex-shrink: 0;
}
.panel {
  position: absolute;
  bottom: 56px;
  right: 0;
  width: 340px;
  max-width: calc(100vw - 48px);
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(11,18,32,0.14);
  overflow: hidden;
  transform-origin: bottom right;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: scale(0.96) translateY(8px);
  transition: opacity 200ms ease, transform 200ms ease, visibility 0ms linear 200ms;
}
.panel[aria-hidden="false"] {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: none;
  transition: opacity 200ms ease, transform 200ms ease, visibility 0ms;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
}
.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #0b1220;
  margin: 0;
}
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: none;
  border: none;
  border-radius: 6px;
  color: #64748b;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: background 150ms ease, color 150ms ease;
}
.close-btn:hover {
  background: #f1f5f9;
  color: #0b1220;
}
.panel-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.type-group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.type-btn {
  padding: 5px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
  font-family: inherit;
}
.type-btn:hover {
  border-color: #94a3b8;
  color: #0b1220;
}
.type-btn.selected {
  background: #0b1220;
  border-color: #0b1220;
  color: #ffffff;
}
.message-textarea {
  width: 100%;
  min-height: 88px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  color: #0b1220;
  background: #ffffff;
  resize: vertical;
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.message-textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}
.message-textarea::placeholder {
  color: #94a3b8;
}
.screenshot-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.capture-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  color: #475569;
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
}
.capture-btn:hover {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #3b82f6;
}
.capture-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.screenshot-preview-wrap {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}
.screenshot-img {
  width: 100%;
  display: block;
  max-height: 120px;
  object-fit: cover;
}
.remove-screenshot-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  background: rgba(11,18,32,0.65);
  border: none;
  border-radius: 50%;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: background 150ms ease;
}
.remove-screenshot-btn:hover {
  background: rgba(11,18,32,0.85);
}
.optional-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.text-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  color: #0b1220;
  background: #ffffff;
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.text-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}
.text-input::placeholder {
  color: #94a3b8;
}
.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 4px;
}
.cancel-btn {
  padding: 8px 16px;
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  color: #475569;
  cursor: pointer;
  transition: border-color 150ms ease, color 150ms ease;
}
.cancel-btn:hover {
  border-color: #94a3b8;
  color: #0b1220;
}
.submit-btn {
  padding: 8px 18px;
  background: #0b1220;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  color: #ffffff;
  cursor: pointer;
  transition: background 150ms ease, transform 100ms ease;
}
.submit-btn:hover {
  background: #1e293b;
}
.submit-btn:active {
  transform: scale(0.98);
}
.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
.result-view {
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}
.result-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  flex-shrink: 0;
}
.result-icon.success-icon {
  background: #dcfce7;
  color: #16a34a;
}
.result-icon.error-icon {
  background: #fee2e2;
  color: #dc2626;
}
.result-title {
  font-size: 15px;
  font-weight: 600;
  color: #0b1220;
  margin: 0;
}
.result-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}
.done-btn,
.retry-btn {
  margin-top: 6px;
  padding: 8px 20px;
  background: #0b1220;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  color: #ffffff;
  cursor: pointer;
  transition: background 150ms ease;
}
.done-btn:hover,
.retry-btn:hover {
  background: #1e293b;
}
@media (prefers-reduced-motion: reduce) {
  .trigger-btn,
  .panel,
  .type-btn,
  .close-btn,
  .capture-btn,
  .remove-screenshot-btn,
  .submit-btn,
  .cancel-btn,
  .done-btn,
  .retry-btn,
  .text-input,
  .message-textarea {
    transition: none !important;
  }
  .panel[aria-hidden="false"] {
    transition: none !important;
  }
}
`;
}
