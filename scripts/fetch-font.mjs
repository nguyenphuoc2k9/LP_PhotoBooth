import { mkdir, writeFile } from 'node:fs/promises';
const response = await fetch('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700,800&display=swap');
if (!response.ok) throw new Error(`Font CSS request failed: ${response.status}`);
const css = await response.text();
const matches = [...css.matchAll(/url\(['"]?((?:https:)?\/\/[^)'"\s]+\.woff2)['"]?\)/g)];
if (!matches.length) throw new Error('No WOFF2 source found.');
await mkdir('public/fonts', { recursive: true });
let localCss = '';
const downloaded = new Map();
for (const match of matches) {
  const url = match[1].startsWith('//') ? `https:${match[1]}` : match[1];
  if (!downloaded.has(url)) {
    const font = await fetch(url);
    if (!font.ok) throw new Error(`Font request failed: ${font.status}`);
    const file = `Satoshi-${downloaded.size}.woff2`;
    await writeFile(`public/fonts/${file}`, Buffer.from(await font.arrayBuffer()));
    downloaded.set(url, file);
  }
  const block = css.slice(match.index, css.indexOf('}', match.index));
  const weight = block.match(/font-weight:\s*(\d+)/)?.[1] ?? '400';
  localCss += `@font-face { font-family: 'Satoshi'; src: url('/fonts/${downloaded.get(url)}') format('woff2'); font-weight: ${weight}; font-style: normal; font-display: swap; }\n`;
}
await writeFile('public/fonts/satoshi.css', localCss);
console.log(`Downloaded ${downloaded.size} font files.`);
