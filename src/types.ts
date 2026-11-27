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
  /**
   * When false (or when enabledTools is provided without allowToolConfiguration=true),
   * restricts commands to enabledTools and hides ungranted commands in Settings.
   */
  allowToolConfiguration?: boolean;
  /** Optional notice shown in Settings -> Components when command access is restricted. */
  accessNoticeText?: string;
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
  onThemeChange?: (theme: string) => void;
}

export interface BlockRendererProps {
  data: EditorJSData | null | undefined;
  theme?: string;
  className?: string;
}
