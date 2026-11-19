const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) results = results.concat(walk(full));
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) results.push(full);
  });
  return results;
}

const files = walk('apps/trader-web/src');
let updatedCount = 0;

files.forEach(f => {
  if (f.endsWith('lib' + path.sep + 'api.ts')) return;

  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  // Pattern 1: http://localhost:4000/api/v1/...
  if (content.includes('http://localhost:4000/api/v1') || content.includes('http://localhost:4000')) {
    // Add import if missing
    if (!content.includes('API_BASE_URL')) {
      // Find first import statement
      const importIdx = content.indexOf('import ');
      if (importIdx !== -1) {
        content = content.slice(0, importIdx) + "import { API_BASE_URL } from '@/lib/api';\n" + content.slice(importIdx);
      }
    }

    // Replace apiUrl definitions:
    content = content.replace(/const apiUrl = process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:4000';/g, 'const apiUrl = API_BASE_URL;');
    content = content.replace(/process\.env\.INTERNAL_API_URL \|\| process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:4000'/g, 'API_BASE_URL');

    // Replace literal fetch strings
    content = content.replace(/'http:\/\/localhost:4000\/api\/v1([^']*)'/g, '`${API_BASE_URL}$1`');
    content = content.replace(/"http:\/\/localhost:4000\/api\/v1([^"]*)"/g, '`${API_BASE_URL}$1`');
    content = content.replace(/`http:\/\/localhost:4000\/api\/v1([^`]*)`/g, '`${API_BASE_URL}$1`');

    // Also replace without /api/v1 if any
    content = content.replace(/'http:\/\/localhost:4000([^']*)'/g, '`${API_BASE_URL}$1`');
    content = content.replace(/"http:\/\/localhost:4000([^"]*)"/g, '`${API_BASE_URL}$1`');
    content = content.replace(/`http:\/\/localhost:4000([^`]*)`/g, '`${API_BASE_URL}$1`');

    if (content !== original) {
      fs.writeFileSync(f, content, 'utf8');
      console.log('Updated:', f);
      updatedCount++;
    }
  }
});

console.log(`Successfully updated ${updatedCount} files in apps/trader-web/src`);
