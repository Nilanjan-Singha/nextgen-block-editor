export type DetectedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'rust'
  | 'go'
  | 'sql'
  | 'html'
  | 'css'
  | 'json'
  | 'bash'
  | 'plaintext';

export const SUPPORTED_LANGUAGES: Array<{ id: DetectedLanguage; label: string }> = [
  { id: 'typescript', label: 'TypeScript' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'rust', label: 'Rust' },
  { id: 'go', label: 'Go' },
  { id: 'sql', label: 'SQL' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'json', label: 'JSON' },
  { id: 'bash', label: 'Bash' },
  { id: 'plaintext', label: 'Plain Text' },
];

export function detectCodeLanguage(code: string): DetectedLanguage {
  const src = code.trim();
  if (!src) return 'plaintext';

  if (
    (src.startsWith('{') || src.startsWith('[')) &&
    /"[^"]+"\s*:/.test(src)
  ) {
    try {
      JSON.parse(src);
      return 'json';
    } catch {
      // fall through
    }
  }

  if (/^#!\/bin\/(bash|sh|zsh)|^\s*(npm|pnpm|yarn|git|curl|cd|mkdir|echo)\s+/m.test(src)) {
    return 'bash';
  }
  if (/^\s*<(?:!DOCTYPE|html|div|span|section|form|head|body|script|style)\b/i.test(src)) {
    return 'html';
  }
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|WITH)\b[\s\S]*\b(FROM|INTO|TABLE|WHERE|SET)\b/i.test(src)) {
    return 'sql';
  }
  if (/\b(def\s+\w+\s*\(|import\s+\w+|from\s+\w+\s+import|elif\s+|print\s*\()/.test(src)) {
    return 'python';
  }
  if (/\b(fn\s+\w+|let\s+mut\s+|impl\s+|pub\s+fn|println!\s*\()/.test(src)) {
    return 'rust';
  }
  if (/\b(package\s+main|func\s+\w+\s*\(|fmt\.\w+|:=)/.test(src)) {
    return 'go';
  }
  if (
    /\b(interface\s+\w+|type\s+\w+\s*=|:\s*(string|number|boolean|unknown|void|React\.)|as\s+\w+)/.test(
      src
    )
  ) {
    return 'typescript';
  }
  if (/\b(const|let|var|function|export|import|async|await|=>|console\.log)\b/.test(src)) {
    return 'javascript';
  }
  if (/[.#]?[\w-]+\s*\{[^}]*:\s*[^;]+;/.test(src)) {
    return 'css';
  }

  return 'plaintext';
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const KEYWORDS = new Set([
  'import', 'export', 'from', 'default', 'const', 'let', 'var', 'function', 'return',
  'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'try', 'catch',
  'finally', 'throw', 'new', 'class', 'extends', 'implements', 'interface', 'type',
  'async', 'await', 'true', 'false', 'null', 'undefined', 'def', 'elif', 'pass',
  'lambda', 'with', 'as', 'in', 'not', 'and', 'or', 'None', 'True', 'False', 'fn',
  'pub', 'mut', 'impl', 'struct', 'enum', 'match', 'package', 'func', 'go', 'defer',
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'CREATE', 'TABLE', 'JOIN', 'ON', 'ORDER', 'BY', 'GROUP', 'LIMIT',
]);

const TYPES = new Set([
  'string', 'number', 'boolean', 'void', 'unknown', 'any', 'never', 'object',
  'Promise', 'Array', 'Record', 'React', 'HTMLElement', 'int', 'float', 'str', 'bool',
  'String', 'Vec', 'Option', 'Result',
]);

export function highlightCodeHtml(code: string, lang?: string): string {
  const effectiveLang = !lang || lang === 'auto' ? detectCodeLanguage(code) : lang;
  if (effectiveLang === 'plaintext') {
    return escapeHtml(code);
  }

  // Tokenize comments, strings, numbers, identifiers, and tags in a single pass
  const tokenRe =
    /(\/\/[^\n]*|#[^\n]*|--[^\n]*|\/\*[\s\S]*?\*\/|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|<\/?[A-Za-z][\w-]*|\b[A-Za-z_]\w*\b(?=\s*\()|\b[A-Za-z_]\w*\b)/g;

  let out = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(code)) !== null) {
    if (match.index > lastIndex) {
      out += escapeHtml(code.slice(lastIndex, match.index));
    }
    const tok = match[0];
    const escaped = escapeHtml(tok);

    if (
      tok.startsWith('//') ||
      tok.startsWith('/*') ||
      tok.startsWith('--') ||
      (tok.startsWith('#') && effectiveLang === 'python') ||
      (tok.startsWith('#') && effectiveLang === 'bash')
    ) {
      out += `<span class="hl-comment">${escaped}</span>`;
    } else if (
      tok.startsWith('"') ||
      tok.startsWith("'") ||
      tok.startsWith('`')
    ) {
      out += `<span class="hl-string">${escaped}</span>`;
    } else if (tok.startsWith('<')) {
      out += `<span class="hl-tag">${escaped}</span>`;
    } else if (/^\d/.test(tok)) {
      out += `<span class="hl-number">${escaped}</span>`;
    } else if (KEYWORDS.has(tok) || KEYWORDS.has(tok.toUpperCase())) {
      out += `<span class="hl-keyword">${escaped}</span>`;
    } else if (TYPES.has(tok)) {
      out += `<span class="hl-type">${escaped}</span>`;
    } else if (code[match.index + tok.length] === '(') {
      out += `<span class="hl-func">${escaped}</span>`;
    } else {
      out += escaped;
    }

    lastIndex = tokenRe.lastIndex;
  }

  if (lastIndex < code.length) {
    out += escapeHtml(code.slice(lastIndex));
  }

  return out;
}
