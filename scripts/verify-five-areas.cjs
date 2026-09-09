const { spawnSync } = require('node:child_process');
const { mkdirSync, openSync, closeSync, readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createRequire } = require('node:module');

const root = resolve(__dirname, '..');
const backend = resolve(root, 'backend');
const fromBackend = createRequire(resolve(backend, 'package.json'));
process.env.TS_NODE_PROJECT = resolve(backend, 'tsconfig.json');
fromBackend('ts-node/register/transpile-only');
const { buildSeededProcessEnvironment } = fromBackend('./test/helpers/seeded-process-environment.ts');
const { verifySeededDatabaseHead } = fromBackend('./test/helpers/seeded-database-preflight.ts');
const source = fromBackend('dotenv').parse(readFileSync('D:/localstack/backend-local.env'));
const env = buildSeededProcessEnvironment({ ...process.env, ...source }, 'scratch_local');
for (const key of ['DATABASE_URL', 'APP_DATABASE_URL']) {
  const url = new URL(env[key]);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('Local scratch database required');
}
env.ALLOW_DESTRUCTIVE_DB_TESTS = '1';
env.NODE_OPTIONS = '--max-old-space-size=8192';
const selected = new Set((process.env.CERTIFICATION_CHECKS ?? '').split(',').filter(Boolean));
const runId = process.env.CERTIFICATION_RUN ?? 'five-areas-2026-09-09';
if (!/^[a-z0-9][a-z0-9-]*$/.test(runId)) throw new Error('CERTIFICATION_RUN must be a simple directory name');
const output = resolve(backend, '.artifacts', runId);
mkdirSync(output, { recursive: true });
const sha = cwd => spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8', windowsHide: true }).stdout.trim();
const results = { startedAt: new Date().toISOString(), root: sha(root), backend: sha(backend), checks: [] };
function run(name, args, cwd = backend) {
  if (selected.size && !selected.has(name)) return;
  const log = resolve(output, `${name}.log`);
  const fd = openSync(log, 'w');
  const started = Date.now();
  process.stdout.write(`START ${name}\n`);
  const result = spawnSync(process.execPath, args, { cwd, env, stdio: ['ignore', fd, fd], windowsHide: true });
  closeSync(fd);
  const row = { name, args, exitCode: result.status, signal: result.signal, seconds: (Date.now() - started) / 1000, log };
  results.checks.push(row);
  writeFileSync(resolve(output, 'summary.json'), JSON.stringify(results, null, 2));
  process.stdout.write(`END ${name} exit=${result.status} seconds=${row.seconds}\n`);
  if (result.error) throw result.error;
}
async function main() {
  await verifySeededDatabaseHead(env, backend);
  process.stdout.write('Local scratch database matches journal; application role does not bypass RLS\n');
  const jest = './node_modules/jest/bin/jest.js';
  run('billing-unit', [jest, '--runInBand', '--testPathPattern=billing|plan-limit|quota-ordering|invitation-acceptance-insert-ordering|employee-onboarding-lock-ordering', '--json', `--outputFile=${output}/billing-unit.json`]);
  run('five-area-e2e', [jest, '--config', 'jest-e2e.json', '--runInBand', '--forceExit', '--testPathPattern=test.settings|test.module-access|billing|payments|session-revocation-live|settings.controller|rbac|organization', '--json', `--outputFile=${output}/five-area-e2e.json`]);
  run('seeded', ['-r', 'ts-node/register/transpile-only', 'test/helpers/run-seeded-e2e.ts', 'scratch_local', 'test/settings/settings-per-person-grant-lifecycle.seeded-e2e-spec.ts', 'test/settings/settings-rbac-authorization.seeded-e2e-spec.ts', 'test/home/home-module-universal-access.seeded-e2e-spec.ts', 'test/home/home-self-service-universal.seeded-e2e-spec.ts', 'test/billing/billing-entitlement-and-seat-isolation.seeded-e2e-spec.ts', 'test/billing/ai-credits-reserve-race.seeded-e2e-spec.ts', 'test/payments/payment-record-isolation.seeded-e2e-spec.ts', 'test/payments/manual-payment-methods.seeded-e2e-spec.ts']);
  run('billing-hierarchy-db', [jest, '--config', 'jest-db.json', '--runInBand', '--forceExit', '--testPathPattern=billing|org-hierarchy-descendant-protection', '--json', `--outputFile=${output}/billing-hierarchy-db.json`]);
  run('provider-self-test', ['-r', 'ts-node/register/transpile-only', 'src/scripts/verify-razorpay-sandbox.ts', '--self-test']);
  run('openapi-fresh', ['-r', 'ts-node/register/transpile-only', 'src/scripts/check-openapi-fresh.ts']);
  if (selected.has('provider-live')) {
    const providerConfig = fromBackend('dotenv').parse(readFileSync(resolve(backend, '.env')));
    for (const key of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'])
      if (providerConfig[key]) env[key] = providerConfig[key];
    run('provider-live', ['-r', 'ts-node/register/transpile-only', 'src/scripts/verify-razorpay-sandbox.ts']);
    for (const key of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET']) delete env[key];
  }
  for (const gate of ['settings-route-e2e-coverage', 'plan-limit-enforcement', 'permission-keys', 'owner-authority', 'scope-application', 'record-access', 'module-gate', 'module-entitlement', 'tenant-isolation', 'operation-ids', 'openapi-coverage', 'openapi-path-params', 'vacuous-assertions', 'test-suppressions', 'baseline-integrity', 'gate-wiring', 'spec-typecheck', 'test-typecheck'])
    run(gate, [`src/scripts/check-${gate === 'tenant-isolation' ? 'tenant-isolation-coverage' : gate}.mjs`]);
  env.TENANT_RELATIONSHIP_DB_URL = env.DATABASE_URL;
  run('tenant-relationships', ['src/scripts/check-tenant-relationships.mjs']);
  run('backend-typecheck', ['./node_modules/typescript/bin/tsc', '--noEmit']);
  const frontend = resolve(root, 'frontend');
  for (const gate of ['response-contracts', 'contract-vendor', 'permission-route-binding', 'contract-drift'])
    run(`frontend-${gate}`, [`scripts/check-${gate}.mjs`], frontend);
  run('frontend-typecheck', ['./node_modules/typescript/bin/tsc', '--noEmit'], frontend);
  results.finishedAt = new Date().toISOString();
  results.finalRoot = sha(root);
  results.finalBackend = sha(backend);
  results.unexecutedChecks = [...selected].filter(name => !results.checks.some(check => check.name === name));
  writeFileSync(resolve(output, 'summary.json'), JSON.stringify(results, null, 2));
  process.exitCode = results.checks.length > 0 && results.unexecutedChecks.length === 0 && results.checks.every(row => row.exitCode === 0) && results.root === results.finalRoot && results.backend === results.finalBackend ? 0 : 1;
}
main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
