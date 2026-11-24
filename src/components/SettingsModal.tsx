import React, { useState } from 'react';
import {
  ALL_TOOL_NAMES,
  SIMPLE_MODE_TOOLS,
  TOOL_CATEGORIES,
  TOOL_LABELS,
} from '../utils/popoverCategories';
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
type SettingsTab = 'appearance' | 'ai' | 'components';

interface SettingsModalProps {
  open: boolean;
  theme: EditorThemePreset;
  mode: EditorMode;
  showStats: boolean;
  aiConfig: AiConfig;
  selectedTools: string[];
  onChangeTheme: (theme: EditorThemePreset) => void;
  onChangeMode: (mode: EditorMode) => void;
  onChangeShowStats: (show: boolean) => void;
  onChangeAiConfig: (config: AiConfig) => void;
  onChangeSelectedTools: (tools: string[]) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  theme,
  mode,
  showStats,
  aiConfig,
  selectedTools,
  onChangeTheme,
  onChangeMode,
  onChangeShowStats,
  onChangeAiConfig,
  onChangeSelectedTools,
  onClose,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [toolFilter, setToolFilter] = useState('');
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  if (!open) return null;

  const selectedSet = new Set(selectedTools);
  const toggleTool = (tool: string) => {
    const next = new Set(selectedTools);
    if (next.has(tool)) next.delete(tool);
    else next.add(tool);
    next.add('settings');
    onChangeSelectedTools(Array.from(next));
  };

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
      <div className="ng-modal ng-modal-wide">
        <div className="ng-modal-head">
          <div>
            <h3>Editor Settings</h3>
            <p>Configure appearance, AI provider, and registered components.</p>
          </div>
          <button type="button" className="excalidraw-btn" onClick={onClose}>
            Done
          </button>
        </div>

        <div className="ng-modal-layout">
          <aside className="ng-modal-sidebar" role="tablist" aria-label="Settings sections">
            {(
              [
                { id: 'appearance', label: 'Appearance' },
                { id: 'ai', label: 'AI Provider' },
                { id: 'components', label: `Components (${selectedSet.size})` },
              ] as Array<{ id: SettingsTab; label: string }>
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                className={`ng-modal-tab${activeTab === t.id ? ' is-active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </aside>

          <div className="ng-modal-main">
            {activeTab === 'appearance' && (
              <div className="ng-modal-panel">
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
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="ng-modal-panel">
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
            )}

            {activeTab === 'components' && (
              <div className="ng-tools-manager">
                <div className="ng-tools-header">
                  <div>
                    <label>Registered Components ({selectedSet.size}/{ALL_TOOL_NAMES.length})</label>
                  </div>
                  <div className="ng-tools-actions">
                    <button
                      type="button"
                      className="excalidraw-btn"
                      onClick={() => onChangeSelectedTools([...ALL_TOOL_NAMES])}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className="excalidraw-btn"
                      onClick={() => onChangeSelectedTools([...SIMPLE_MODE_TOOLS])}
                    >
                      Minimal
                    </button>
                  </div>
                </div>

                <input
                  type="search"
                  className="cdx-input editor-form-input"
                  placeholder="Filter components (e.g. bento, chart, spoiler...)"
                  value={toolFilter}
                  onChange={(e) => setToolFilter(e.target.value)}
                />

                <div className="ng-tools-groups">
                  {TOOL_CATEGORIES.filter((g) => g.label !== 'Settings').map((group) => {
                    const q = toolFilter.trim().toLowerCase();
                    const visible = group.tools.filter((t) => {
                      const label = (TOOL_LABELS[t] || t).toLowerCase();
                      return !q || label.includes(q) || t.toLowerCase().includes(q);
                    });
                    if (!visible.length) return null;
                    return (
                      <div key={group.label} className="ng-tools-group">
                        <div className="ng-tools-group-title">{group.label}</div>
                        <div className="ng-tools-grid">
                          {visible.map((tool) => {
                            const checked = selectedSet.has(tool);
                            return (
                              <label
                                key={tool}
                                className={`ng-tool-chip${checked ? ' is-checked' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleTool(tool)}
                                />
                                <span>{TOOL_LABELS[tool] || tool}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
