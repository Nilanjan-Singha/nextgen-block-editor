export interface EditorJSBlock {
  id?: string;
  type: string;
  data: Record<string, unknown>;
}

export interface EditorJSData {
  time?: number;
  version?: string;
  blocks: EditorJSBlock[];
}

export interface BlockEditorHandle {
  save: () => Promise<EditorJSData | null>;
  undo: () => void;
  redo: () => void;
}

export interface BlockEditorProps {
  initialData?: EditorJSData;
  placeholder?: string;
  linkEndpoint?: string;
  enabledTools?: string[];
  showStats?: boolean;
  showAiBar?: boolean;
  onAiRequest?: (params: {
    mode: 'continue' | 'ask';
    prompt: string;
    context: string;
  }) => Promise<string>;
  className?: string;
  onReady?: () => void;
  onChange?: (data: EditorJSData) => void;
}

export interface BlockRendererProps {
  data: EditorJSData | null | undefined;
  className?: string;
}
