import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const repoDir = resolve(process.argv[2]);
const label = process.argv[3];
const outDir = resolve(process.argv[4]);
const concurrency = Number(process.argv[5] ?? 6);
const perGateTimeoutMs = Number(process.argv[6] ?? 300000);

mkdirSync(outDir, { recursive: true });

const pkg = JSON.parse(readFileSync(join(repoDir, 'package.json'), 'utf8'));
const gates = Object.keys(pkg.scripts)
  .filter((s) => /^(check|verify):/.test(s))
  .filter((s) => !/:(emit|baseline|list)$/.test(s))
  .sort();

const results = [];
let cursor = 0;

function runOne(name) {
  return new Promise((done) => {
    const started = Date.now();
    const child = execFile(
      'pnpm',
      ['run', '--silent', name],
      { cwd: repoDir, timeout: perGateTimeoutMs, maxBuffer: 32 * 1024 * 1024, windowsHide: true, shell: true },
      (err, stdout, stderr) => {
        const durationMs = Date.now() - started;
        const timedOut = Boolean(err && err.killed);
        const exitCode = timedOut ? 'TIMEOUT' : (err?.code ?? 0);
        const out = `${stdout ?? ''}${stderr ?? ''}`;
        results.push({
          gate: name,
          exitCode,
          durationMs,
          timedOut,
          tail: out.split('\n').filter(Boolean).slice(-25).join('\n'),
        });
        writeFileSync(join(outDir, `${name.replace(/:/g, '_')}.log`), out);
        const verdict = timedOut ? 'TIMEOUT' : exitCode === 0 ? 'PASS' : `EXIT ${exitCode}`;
        console.log(`[${label}] ${results.length}/${gates.length} ${name} -> ${verdict} (${durationMs}ms)`);
        done();
      },
    );
    child.stdin?.end();
  });
}

async function worker() {
  while (cursor < gates.length) {
    const name = gates[cursor++];
    await runOne(name);
  }
}

console.log(`[${label}] running ${gates.length} gates, concurrency ${concurrency}`);
await Promise.all(Array.from({ length: concurrency }, worker));

results.sort((a, b) => a.gate.localeCompare(b.gate));
writeFileSync(join(outDir, `_results.json`), JSON.stringify({ label, repoDir, total: gates.length, results }, null, 2));

const pass = results.filter((r) => r.exitCode === 0);
const fail = results.filter((r) => r.exitCode !== 0);
console.log(`\n[${label}] DONE  PASS=${pass.length}  NOT-PASS=${fail.length}  TOTAL=${gates.length}`);
for (const r of fail) console.log(`  ${r.gate} -> ${r.timedOut ? 'TIMEOUT' : 'exit ' + r.exitCode}`);
