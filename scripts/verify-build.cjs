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
const source = fromBackend('dotenv').parse(readFileSync(process.env.BUILD_ENV_FILE ?? 'D:/localstack/backend-local.env'));
const database = process.env.BUILD_DATABASE ?? 'scratch_local';
const env = buildSeededProcessEnvironment({ ...process.env, ...source }, database);
for (const key of ['DATABASE_URL', 'APP_DATABASE_URL']) {
  const url = new URL(env[key]);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('Local scratch database required');
}
if ((new URL(env.DATABASE_URL).port || '5432') !== (new URL(env.APP_DATABASE_URL).port || '5432'))
  throw new Error('Owner and application connections must use the same local database server port');
env.ALLOW_DESTRUCTIVE_DB_TESTS = '1';
env.NODE_OPTIONS = '--max-old-space-size=8192';
const selected = new Set((process.env.BUILD_CHECKS ?? '').split(',').filter(Boolean));
const gates = ['spec-typecheck', 'test-typecheck', 'scope-application', 'record-access', 'migration-ledger', 'migration-discipline', 'operation-ids', 'openapi-coverage', 'tenant-isolation-coverage'];
const known = new Set(['unit', 'http', 'http-complete', 'http-db', 'http-timesheets', 'seeded', 'read-cost', 'backend-typecheck', 'openapi-generate', 'openapi-fresh', ...gates]);
if ([...selected].some(name => !known.has(name))) throw new Error('Unknown BUILD_CHECKS selection');
const runId = process.env.BUILD_RUN ?? 'build-2026-09-09';
if (!/^[a-z0-9][a-z0-9-]*$/.test(runId)) throw new Error('BUILD_RUN must be a simple directory name');
const output = resolve(backend, '.artifacts', runId);
mkdirSync(output, { recursive: true });
const git = (cwd, args) => spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true }).stdout.trim();
const results = {
  startedAt: new Date().toISOString(), root: git(root, ['rev-parse', 'HEAD']),
  backend: git(backend, ['rev-parse', 'HEAD']),
  rootChanges: git(root, ['status', '--short']), backendChanges: git(backend, ['status', '--short']), database, checks: [],
};
function run(name, args, cwd = backend) {
  if (selected.size && !selected.has(name)) return;
  const log = resolve(output, `${name}.log`);
  const fd = openSync(log, 'w');
  const started = Date.now();
  process.stdout.write(`START ${name}\n`);
  const result = spawnSync(process.execPath, args, { cwd, env, stdio: ['ignore', fd, fd], windowsHide: true });
  closeSync(fd);
  results.checks.push({ name, args, exitCode: result.status, signal: result.signal, seconds: (Date.now() - started) / 1000, log });
  writeFileSync(resolve(output, 'summary.json'), JSON.stringify(results, null, 2));
  process.stdout.write(`END ${name} exit=${result.status}\n`);
  if (result.error) throw result.error;
}
async function main() {
  if (!selected.size || ['http', 'http-complete', 'http-db', 'http-timesheets', 'seeded', 'read-cost'].some(name => selected.has(name)))
    await verifySeededDatabaseHead(env, backend);
  const jest = './node_modules/jest/bin/jest.js';
  run('unit', [jest, '--runInBand', '--testPathPattern=modules/build', '--json', `--outputFile=${output}/unit.json`]);
  if (selected.has('http'))
    run('http', [jest, '--config', 'jest-e2e.json', '--runInBand', '--forceExit', '--testPathPattern=modules/build', '--json', `--outputFile=${output}/http.json`]);
  if (!selected.size || selected.has('http-complete')) {
    env.RBAC_E2E_DATABASE_URL = env.DATABASE_URL;
    run('http-complete', [jest, '--config', 'jest-e2e.json', '--runInBand', '--forceExit', '--testPathPattern=modules/build', '--json', `--outputFile=${output}/http-complete.json`]);
    delete env.RBAC_E2E_DATABASE_URL;
  }
  if (selected.has('http-db')) {
    env.RBAC_E2E_DATABASE_URL = env.DATABASE_URL;
    run('http-db', [jest, '--config', 'jest-e2e.json', '--runInBand', '--forceExit', '--testPathPattern=projects-access.e2e|projects-team-access.e2e|projects-scope.e2e|projects-tickets-key.e2e|timesheets-scope.e2e', '--json', `--outputFile=${output}/http-db.json`]);
    delete env.RBAC_E2E_DATABASE_URL;
  }
  if (selected.has('http-timesheets')) {
    env.RBAC_E2E_DATABASE_URL = env.DATABASE_URL;
    run('http-timesheets', [jest, '--config', 'jest-e2e.json', '--runInBand', '--forceExit', '--testPathPattern=timesheets-scope.e2e', '--json', `--outputFile=${output}/http-timesheets.json`]);
    delete env.RBAC_E2E_DATABASE_URL;
  }
  run('seeded', ['-r', 'ts-node/register/transpile-only', 'test/helpers/run-seeded-e2e.ts', database, 'test/build/build-ticket-scope-and-isolation.seeded-e2e-spec.ts', 'test/build/build-workflow-lifecycle.seeded-e2e-spec.ts']);
  run('read-cost', ['src/scripts/check-build-read-cost.mjs']);
  run('backend-typecheck', ['./node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false']);
  run('openapi-generate', ['-r', 'ts-node/register/transpile-only', 'src/scripts/generate-openapi.ts']);
  run('openapi-fresh', ['-r', 'ts-node/register/transpile-only', 'src/scripts/check-openapi-fresh.ts']);
  for (const gate of gates)
    run(gate, [`src/scripts/check-${gate}.mjs`]);
  const executed = new Set(results.checks.map(check => check.name));
  const unknown = [...selected].filter(name => !executed.has(name));
  if (unknown.length || !executed.size) throw new Error(`No execution for requested checks: ${unknown.join(',')}`);
  process.exitCode = results.checks.some(check => check.exitCode !== 0) ? 1 : 0;
}
main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
