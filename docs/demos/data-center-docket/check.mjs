import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
assert.ok(scripts.length > 0);
for (const [index, script] of scripts.entries()) {
  new vm.Script(script[1], { filename: `inline-${index + 1}.js` });
}
console.log(`PASS: ${scripts.length} inline scripts parse`);

assert.doesNotMatch(html, /chatgpt\.com|libfile_|page_[a-f0-9]{16}|\/Users\/|sediment:\/\//i);
assert.doesNotMatch(html, /BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|github_pat_|ghp_[a-z0-9]{20}|sk-[a-z0-9]{20}/i);
assert.doesNotMatch(html, /\b(?:fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage)\b/);
assert.doesNotMatch(html, /<script[^>]+src=|<iframe|<form\b/i);
console.log('PASS: no private references, recognizable credential patterns or automatic external IO');

const catalogueText = html.match(/const catalogue=(\[[\s\S]*?\]);/)[1];
const catalogue = JSON.parse(catalogueText);
assert.equal(catalogue.length, 61);
assert.equal(new Set(catalogue.map(row => row.id)).size, 61);
for (const row of catalogue) {
  assert.equal(new URL(row.url).protocol, 'https:');
  assert.ok(row.boundary && row.access);
}
assert.match(html, /const packetCaptured=new Set\(\[\]\)/);
assert.match(html, /const originalChecked=new Set\(\[\]\)/);
assert.match(html, /Unknown does not mean zero/);
console.log('PASS: 61 unique bounded source families, no inherited capture/check receipts, unknown job counts retained');
