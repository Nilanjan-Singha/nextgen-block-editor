import fs from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
await fs.mkdir(distDir, { recursive: true });

const katexCss = await fs.readFile(path.resolve('node_modules/katex/dist/katex.min.css'), 'utf-8');
const editorCss = await fs.readFile(path.resolve('src/styles/editor.css'), 'utf-8');
const blocksCss = await fs.readFile(path.resolve('src/styles/blocks.css'), 'utf-8');
const shadcnCss = await fs.readFile(path.resolve('src/styles/shadcn.css'), 'utf-8');

await fs.writeFile(
  path.join(distDir, 'styles.css'),
  `${katexCss}\n\n${editorCss}\n\n${blocksCss}\n\n${shadcnCss}`,
  'utf-8'
);
console.log('Bundled dist/styles.css');
