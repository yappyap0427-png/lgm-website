// 把 Google Sheet 抓下来存成 data/data.json（网站读不到 Sheet 时的备份）
// GitHub Actions 每天自动跑；也可以手动：node scripts/sync-sheet.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const cfg = readFileSync(new URL('../assets/js/config.js', import.meta.url), 'utf8');
const sheetId = cfg.match(/sheetId:\s*'([^']+)'/)[1];
const tabs = JSON.parse(cfg.match(/tabs:\s*(\[[^\]]+\])/)[1].replace(/'/g, '"'));

function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const cleanKey = (k) => k.split(/[（(]/)[0].trim();

const out = {};
for (const tab of tabs) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tab)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`读不到分页 ${tab}：HTTP ${res.status}（Sheet 有设成「知道连结的任何人可检视」吗？）`);
  const rows = parseCSV(await res.text());
  const keys = rows[0].map(cleanKey);
  out[tab] = rows.slice(1).filter((r) => r.some((v) => v.trim() !== ''))
    .map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
  console.log(`${tab}: ${out[tab].length} 行`);
}
writeFileSync(new URL('../data/data.json', import.meta.url), JSON.stringify(out, null, 1));
