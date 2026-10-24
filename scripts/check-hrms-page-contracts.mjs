import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const spec = new URL('../docs/specs/hrms-payroll-reform/', import.meta.url);
const read = (name) => readFileSync(new URL(name, spec), 'utf8');
const fail = (message) => { throw new Error(message); };
const tableRoutes = (markdown) => [...markdown.matchAll(/^\| `(\/[^`]+)` \|/gm)].map((match) => match[1]);
const ensureUnique = (items, label) => {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) fail(`${label}: duplicate ${item}`);
    seen.add(item);
  }
  return seen;
};

const canonical = read('07-pages-navigation-roles-prd.md');
const main = canonical.slice(canonical.indexOf('## 3. Canonical Self-Service Pages'), canonical.indexOf('## 6. Recruitment Boundary Pages'));
const expected = tableRoutes(main).filter((route) => route.startsWith('/me') || route.startsWith('/hr') || route.startsWith('/payroll'));
if (expected.length !== 100) fail(`Canonical primary route count changed: ${expected.length}; review the page contract`);
const expectedSet = ensureUnique(expected, 'canonical inventory');
const docs = [
  ['18-self-service-page-ui-backend-prd.md', 27],
  ['19-hr-administration-page-ui-backend-prd.md', 48],
  ['20-payroll-page-ui-backend-prd.md', 25],
];
const covered = [];
for (const [name, count] of docs) {
  const content = read(name);
  const routes = tableRoutes(content);
  if (routes.length !== count) fail(`${name}: expected ${count} page rows, found ${routes.length}`);
  for (const route of routes) {
    const line = content.split('\n').find((item) => item.startsWith(`| \`${route}\` |`));
    if (!line || line.split('|').length < 5 || /\|\s*\|/.test(line)) fail(`${name}: UI/backend item missing for ${route}`);
  }
  covered.push(...routes);
}
const coveredSet = ensureUnique(covered, 'primary page contracts');
for (const route of expectedSet) if (!coveredSet.has(route)) fail(`Missing canonical page contract: ${route}`);
for (const route of coveredSet) if (!expectedSet.has(route)) fail(`Unexpected primary page contract: ${route}`);

const supporting = read('21-supporting-page-route-disposition-prd.md');
const supportRoutes = tableRoutes(supporting);
const settingRoutes = supportRoutes.filter((route) => route.startsWith('/hr/settings'));
const implementationRoutes = supportRoutes.filter((route) => route.startsWith('/implementation'));
ensureUnique(supportRoutes, 'supporting page contracts');
if (settingRoutes.length < 20 || implementationRoutes.length !== 9) fail(`Supporting contract coverage changed: ${settingRoutes.length} settings, ${implementationRoutes.length} implementation`);

const appRoot = fileURLToPath(new URL('../frontend/app/(authenticated)/', import.meta.url));
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? walk(path) : entry.name === 'page.tsx' ? [path] : [];
});
const current = walk(appRoot).map((path) => '/' + relative(appRoot, path).replaceAll('\\', '/').replace(/\/page\.tsx$/, ''))
  .filter((route) => /^\/(me|hr|payroll)\//.test(route) || ['/hr', '/payroll', '/timesheets/payroll'].includes(route));
const currentSet = ensureUnique(current, 'current source routes');
const disposition = tableRoutes(read('22-current-route-disposition-prd.md'));
const dispositionSet = ensureUnique(disposition, 'route dispositions');
for (const route of currentSet) if (!dispositionSet.has(route)) fail(`Current route lacks disposition: ${route}`);
for (const route of dispositionSet) if (!currentSet.has(route)) fail(`Disposition has no current page: ${route}`);
console.log(`PASS HRMS page contracts: ${covered.length} primary pages, ${settingRoutes.length} settings pages, ${implementationRoutes.length} implementation pages, ${disposition.length} current route dispositions`);
