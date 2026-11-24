export type AiProviderId =
  | 'openai'
  | 'codex'
  | 'openrouter'
  | 'opencode'
  | 'anthropic'
  | 'gemini'
  | 'custom';

export interface AiConfig {
  provider: AiProviderId;
  model: string;
  apiKey: string;
  endpoint?: string;
}

export interface AiProviderPreset {
  id: AiProviderId;
  label: string;
  defaultModel: string;
  defaultEndpoint: string;
}

export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI (ChatGPT)',
    defaultModel: 'gpt-4o-mini',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
  },
  {
    id: 'codex',
    label: 'OpenAI Codex',
    defaultModel: 'codex-mini-latest',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    defaultModel: 'openai/gpt-4o-mini',
    defaultEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    defaultModel: 'opencode/default',
    defaultEndpoint: 'https://api.opencode.ai/v1/chat/completions',
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    defaultModel: 'claude-3-5-sonnet-latest',
    defaultEndpoint: 'https://api.anthropic.com/v1/messages',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
  },
  {
    id: 'custom',
    label: 'Custom OpenAI-Compatible',
    defaultModel: 'gpt-4o-mini',
    defaultEndpoint: 'http://localhost:11434/v1/chat/completions',
  },
];

export const AI_STORAGE_KEY = 'nextgen-editor-ai-config';

export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AiConfig>;
      if (parsed.provider) {
        return {
          provider: parsed.provider,
          model: parsed.model || 'gpt-4o-mini',
          apiKey: parsed.apiKey || '',
          endpoint: parsed.endpoint || '',
        };
      }
    }
  } catch {
    // ignore storage errors
  }
  return {
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: '',
    endpoint: '',
  };
}

export function saveAiConfig(cfg: AiConfig): void {
  try {
    localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}

export async function generateAiText(params: {
  config: AiConfig;
  mode: 'continue' | 'ask';
  prompt: string;
  context: string;
}): Promise<string> {
  const { config, mode, prompt, context } = params;
  const preset =
    AI_PROVIDER_PRESETS.find((p) => p.id === config.provider) || AI_PROVIDER_PRESETS[0];
  const endpoint = (config.endpoint || preset.defaultEndpoint).trim();
  const model = (config.model || preset.defaultModel).trim();
  const apiKey = config.apiKey.trim();

  if (!apiKey && config.provider !== 'custom') {
    throw new Error('Please add an API key in Settings first.');
  }

  const systemPrompt =
    mode === 'continue'
      ? 'You are a concise writing assistant inside a block editor. Continue the document naturally from the provided context in 1-3 clear paragraphs. Return only the continuation text.'
      : 'You are a helpful writing and editing assistant inside a block editor. Fulfill the user request concisely using the provided document context.';

  const userContent =
    mode === 'continue'
      ? `Document context:\n${context || '(Empty document)'}\n\nContinue writing naturally:`
      : `Document context:\n${context || '(Empty document)'}\n\nUser request: ${prompt}`;

  if (config.provider === 'gemini') {
    const url = `${endpoint.replace(/\/$/, '')}/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userContent}` }] }],
      }),
    });
    if (!res.ok) throw new Error(`Gemini API error (${res.status})`);
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  }

  if (config.provider === 'anthropic') {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error (${res.status})`);
    const json = (await res.json()) as {
      content?: Array<{ text?: string }>;
    };
    return json.content?.[0]?.text?.trim() || '';
  }

  // OpenAI, Codex, OpenRouter, OpenCode, Custom OpenAI-compatible
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI API error (${res.status})`);
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() || '';
}
