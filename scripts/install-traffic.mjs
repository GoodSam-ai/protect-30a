import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const tag = '<script defer src="/assets/traffic.js"></script>';
async function visit(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) await visit(path);
    else if (item.isFile() && item.name.endsWith('.html')) {
      const html = await readFile(path, 'utf8');
      if (!html.includes('src="/assets/traffic.js"') && /<\/head>/i.test(html)) {
        await writeFile(path, html.replace(/<\/head>/i, tag + '\n</head>'));
      }
    }
  }
}
await visit(process.argv[2] || 'public');
