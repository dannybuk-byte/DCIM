/**
 * Postbuild verify: dist/commit-hash.txt ≡ generated BUILD_COMMIT ≡ resolver SHA (R-F13).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBuildIdentity } from './resolve-build-identity.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function walkJsFiles(dir, out = []) {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkJsFiles(p, out);
    else if (/\.(js|mjs|css|html)$/.test(name)) out.push(p);
  }
  return out;
}

const { commit, source } = resolveBuildIdentity();

const distMarkerPath = join(ROOT, 'dist', 'commit-hash.txt');
let distMarker;
try {
  distMarker = readFileSync(distMarkerPath, 'utf8').trim();
} catch {
  throw new Error(
    `R-F13 verify: missing ${distMarkerPath} — did vite copy public/?`,
  );
}

if (distMarker !== commit) {
  throw new Error(
    `R-F13 verify: dist/commit-hash.txt (${distMarker}) !== resolved SHA (${commit}, source=${source})`,
  );
}

const generatedPath = join(ROOT, 'src', 'generated', 'buildIdentity.ts');
const generated = readFileSync(generatedPath, 'utf8');
if (!generated.includes(`'${commit}'`)) {
  throw new Error(
    `R-F13 verify: src/generated/buildIdentity.ts does not embed ${commit}`,
  );
}

const distFiles = walkJsFiles(join(ROOT, 'dist'));
const bundleHit = distFiles.some((f) => {
  try {
    return readFileSync(f, 'utf8').includes(commit);
  } catch {
    return false;
  }
});

if (!bundleHit) {
  throw new Error(
    `R-F13 verify: resolved SHA ${commit} not found in dist bundle assets (file≡resolver ok, bundle missing)`,
  );
}

console.log(
  `✅ R-F13 verify: file ≡ bundle ≡ resolver (${commit.slice(0, 7)}, ${source})`,
);
