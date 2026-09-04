import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const repoDir = resolve(process.argv[2]);
const label = process.argv[3];
const outDir = resolve(process.argv[4]);
const perGateTimeoutMs = Number(process.argv[5] ?? 900000);
mkdirSync(outDir, { recursive: true });

const prior = JSON.parse(readFileSync(join(outDir, '_results.json'), 'utf8'));
const gates = prior.results.filter((r) => r.exitCode !== 0).map((r) => r.gate);

const results = [];
for (const name of gates) {
  await new Promise((done) => {
    const started = Date.now();
    execFile('pnpm', ['run', '--silent', name],
      { cwd: repoDir, timeout: perGateTimeoutMs, maxBuffer: 32 * 1024 * 1024, windowsHide: true, shell: true },
      (err, stdout, stderr) => {
        const durationMs = Date.now() - started;
        const timedOut = Boolean(err && err.killed);
        const exitCode = timedOut ? 'TIMEOUT' : (err?.code ?? 0);
        const out = `${stdout ?? ''}${stderr ?? ''}`;
        writeFileSync(join(outDir, `${name.replace(/:/g, '_')}.rerun.log`), out);
        results.push({ gate: name, exitCode, durationMs, timedOut });
        console.log(`[${label}] ${results.length}/${gates.length} ${name} -> ${timedOut ? 'TIMEOUT' : exitCode === 0 ? 'PASS' : 'exit ' + exitCode} (${durationMs}ms)`);
        done();
      });
  });
}
writeFileSync(join(outDir, '_rerun.json'), JSON.stringify({ label, results }, null, 2));
const fixed = results.filter((r) => r.exitCode === 0);
console.log(`\n[${label}] RERUN DONE  now-PASS=${fixed.length}  still-NOT-PASS=${results.length - fixed.length}`);
for (const r of results.filter((x) => x.exitCode !== 0)) console.log(`  ${r.timedOut ? 'TIMEOUT' : 'exit ' + r.exitCode} ${r.gate}`);
