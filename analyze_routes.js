const fs = require('fs');
const path = require('path');

function extractMetadata(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Extract exported methods
  const methods = [];
  if (/export\s+(async\s+)?function\s+GET\s*\(/.test(content)) methods.push('GET');
  if (/export\s+(async\s+)?function\s+POST\s*\(/.test(content)) methods.push('POST');
  if (/export\s+(async\s+)?function\s+PATCH\s*\(/.test(content)) methods.push('PATCH');
  if (/export\s+(async\s+)?function\s+DELETE\s*\(/.test(content)) methods.push('DELETE');
  if (/export\s+(async\s+)?function\s+PUT\s*\(/.test(content)) methods.push('PUT');
  if (/export\s+(async\s+)?function\s+OPTIONS\s*\(/.test(content)) methods.push('OPTIONS');
  if (content.includes('export const { GET, POST }')) {
    if (!methods.includes('GET')) methods.push('GET');
    if (!methods.includes('POST')) methods.push('POST');
  }
  
  // Extract guards
  let guard = 'none';
  let guardArgs = '';
  
  if (content.includes('withAuth(')) {
    guard = 'withAuth';
  } else if (content.includes('withAdmin(')) {
    guard = 'withAdmin';
  } else if (content.includes('withBlogAdmin(')) {
    guard = 'withBlogAdmin';
  } else if (content.includes('withModuleAbility(')) {
    guard = 'withModuleAbility';
    const match = content.match(/withModuleAbility\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)"/);
    if (match) guardArgs = `"${match[1]}","${match[2]}","${match[3]}"`;
  } else if (content.includes('withAbility(')) {
    guard = 'withAbility';
    const match = content.match(/withAbility\("([^"]+)",\s*"([^"]+)"/);
    if (match) guardArgs = `"${match[1]}","${match[2]}"`;
  } else if (content.includes('withModule(')) {
    guard = 'withModule';
    const match = content.match(/withModule\("([^"]+)"/);
    if (match) guardArgs = `"${match[1]}"`;
  } else if (content.includes('withRoles(')) {
    guard = 'withRoles';
    const match = content.match(/withRoles\(\[(.*?)\]/);
    if (match) guardArgs = `[${match[1]}]`;
  }
  
  // Check for direct db access without auth
  let notes = '';
  const dbDirect = /\.from\(.*?\)\.where\(|\.delete\(|\.update\(|\.insert\(/.test(content);
  const hasAuthInline = /auth\(\)/.test(content);
  const noGuard = guard === 'none';
  
  if (noGuard && (dbDirect || hasAuthInline)) {
    notes = 'auth-bypass-risk';
  }
  
  return {
    methods: methods.join(','),
    guard,
    guardArgs,
    notes
  };
}

function walkDir(dir) {
  const results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else if (file === 'route.ts') {
      const relPath = path.relative('.', fullPath).replace(/\/g, '/');
      const meta = extractMetadata(fullPath);
      results.push({ path: relPath, ...meta, fullPath });
    }
  }
  
  return results;
}

const routes = walkDir('app/api').sort((a, b) => a.path.localeCompare(b.path));

// Group by folder
const grouped = {};
for (const route of routes) {
  const folder = route.path.split('/')[2]; // app/api/FOLDER
  if (!grouped[folder]) grouped[folder] = [];
  grouped[folder].push(route);
}

// Output
for (const [folder, routes] of Object.entries(grouped).sort()) {
  console.log(`\n## ${folder} (${routes.length})`);
  for (const r of routes) {
    console.log(`${r.path}|${r.methods}|${r.guard}|${r.guardArgs}|${r.notes}`);
  }
}
