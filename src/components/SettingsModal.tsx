import React, { useState } from 'react';
import {
  AI_PROVIDER_PRESETS,
  type AiConfig,
  type AiProviderId,
} from '../utils/aiClient';

export type EditorThemePreset =
  | 'inherit'
  | 'light'
  | 'dark'
  | 'catppuccin-mocha'
  | 'catppuccin-macchiato'
  | 'catppuccin-frappe'
  | 'catppuccin-latte';

export type EditorMode = 'block' | 'simple';

interface SettingsModalProps {
  open: boolean;
  theme: EditorThemePreset;
  mode: EditorMode;
  showStats: boolean;
  aiConfig: AiConfig;
  onChangeTheme: (theme: EditorThemePreset) => void;
  onChangeMode: (mode: EditorMode) => void;
  onChangeShowStats: (show: boolean) => void;
  onChangeAiConfig: (config: AiConfig) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  theme,
  mode,
  showStats,
  aiConfig,
  onChangeTheme,
  onChangeMode,
  onChangeShowStats,
  onChangeAiConfig,
  onClose,
}) => {
  const [showKey, setShowKey] = useState(false);

  if (!open) return null;

  const handleProviderChange = (providerId: AiProviderId) => {
    const preset = AI_PROVIDER_PRESETS.find((p) => p.id === providerId);
    onChangeAiConfig({
      ...aiConfig,
      provider: providerId,
      model: preset?.defaultModel || aiConfig.model,
      endpoint: preset?.defaultEndpoint || '',
    });
  };

  return (
    <div className="ng-modal-backdrop" role="dialog" aria-modal="true" aria-label="Editor Settings">
      <div className="ng-modal">
        <div className="ng-modal-head">
          <div>
            <h3>Editor Settings</h3>
            <p>Configure appearance, editor mode, and AI provider.</p>
          </div>
          <button type="button" className="excalidraw-btn" onClick={onClose}>
            Done
          </button>
        </div>

        <div className="ng-modal-body">
          <div className="ng-field">
            <label>Theme</label>
            <select
              className="cdx-input editor-form-select"
              value={theme}
              onChange={(e) => onChangeTheme(e.target.value as EditorThemePreset)}
            >
              <option value="inherit">Inherit from Host App</option>
              <option value="light">shadcn Light</option>
              <option value="dark">shadcn Dark</option>
              <option value="catppuccin-mocha">Catppuccin Mocha</option>
              <option value="catppuccin-macchiato">Catppuccin Macchiato</option>
              <option value="catppuccin-frappe">Catppuccin Frappé</option>
              <option value="catppuccin-latte">Catppuccin Latte</option>
            </select>
          </div>

          <div className="ng-field">
            <label>Editor Mode</label>
            <div className="ng-segmented">
              <button
                type="button"
                className={`excalidraw-btn${mode === 'block' ? ' is-active' : ''}`}
                onClick={() => onChangeMode('block')}
              >
                Block Editor (Full)
              </button>
              <button
                type="button"
                className={`excalidraw-btn${mode === 'simple' ? ' is-active' : ''}`}
                onClick={() => onChangeMode('simple')}
              >
                Simple Mode
              </button>
            </div>
          </div>

          <div className="ng-field ng-field-inline">
            <label htmlFor="ng-stats-toggle">Show word count &amp; read time</label>
            <input
              id="ng-stats-toggle"
              type="checkbox"
              checked={showStats}
              onChange={(e) => onChangeShowStats(e.target.checked)}
            />
          </div>

          <hr className="ng-divider" />

          <div className="ng-field">
            <label>AI Provider</label>
            <select
              className="cdx-input editor-form-select"
              value={aiConfig.provider}
              onChange={(e) => handleProviderChange(e.target.value as AiProviderId)}
            >
              {AI_PROVIDER_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="ng-field">
            <label>Model</label>
            <input
              type="text"
              className="cdx-input editor-form-input"
              value={aiConfig.model}
              placeholder="e.g. gpt-4o-mini"
              onChange={(e) =>
                onChangeAiConfig({ ...aiConfig, model: e.target.value })
              }
            />
          </div>

          <div className="ng-field">
            <label>API Key</label>
            <div className="ng-key-row">
              <input
                type={showKey ? 'text' : 'password'}
                className="cdx-input editor-form-input"
                value={aiConfig.apiKey}
                placeholder="sk-..."
                onChange={(e) =>
                  onChangeAiConfig({ ...aiConfig, apiKey: e.target.value })
                }
              />
              <button
                type="button"
                className="excalidraw-btn"
                onClick={() => setShowKey((s) => !s)}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="ng-field">
            <label>Endpoint URL (optional)</label>
            <input
              type="url"
              className="cdx-input editor-form-input"
              value={aiConfig.endpoint || ''}
              placeholder="Default provider endpoint"
              onChange={(e) =>
                onChangeAiConfig({ ...aiConfig, endpoint: e.target.value })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};
