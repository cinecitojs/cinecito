const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const files = [
  'package.json',
  'apps/api/package.json',
  'apps/web/package.json',
  'packages/ui/package.json',
  'packages/shared/package.json'
];

function sanitizeVersion(v) {
  if (!v) return v;
  // remove common prefixes
  return v.replace(/^[\^~<>*= ]+/, '').split(' ')[0];
}

function checkPackage(pkg, ver) {
  try {
    const clean = sanitizeVersion(ver);
    if (!clean || clean === '*') return { ok: true };
    // fetch versions list
    const out = execSync(`npm view ${pkg} versions --json`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const versions = JSON.parse(out);
    if (!Array.isArray(versions)) return { ok: false, error: 'no versions array' };
    if (versions.includes(clean)) return { ok: true };
    return { ok: false, available: versions.slice(-10) };
  } catch (err) {
    return { ok: false, error: String(err.message) };
  }
}

const report = {};

for (const f of files) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) continue;
  try {
    const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
    const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
    report[f] = [];
    for (const [name, ver] of Object.entries(deps)) {
      const res = checkPackage(name, ver);
      if (!res.ok) report[f].push({ name, requested: ver, result: res });
    }
  } catch (err) {
    report[f] = { error: String(err) };
  }
}

console.log(JSON.stringify(report, null, 2));
