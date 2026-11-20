import fs from 'fs';

const html = fs.readFileSync('scripts/steratrader_docs_extracted.txt', 'utf8');

// Find all occurrences of HTTP methods or /crm/ or endpoints
const regex = /"(GET|POST|PATCH|DELETE|PUT)\s+([^"]+)"/g;
let m;
const endpoints = new Set();
while ((m = regex.exec(html)) !== null) {
  endpoints.add(`${m[1]} ${m[2]}`);
}

console.log('Endpoints found:', Array.from(endpoints));

// Also search for words like "close", "position", "terminate", "disable", "archive", "suspend"
const keywords = ['close', 'terminate', 'suspend', 'disable', 'archive', 'position', 'positions', 'password', 'group'];
for (const kw of keywords) {
  let idx = 0;
  console.log(`\n=== Keyword: ${kw} ===`);
  let count = 0;
  while ((idx = html.toLowerCase().indexOf(kw, idx)) !== -1 && count < 5) {
    const snippet = html.substring(Math.max(0, idx - 100), Math.min(html.length, idx + 200));
    console.log(`[${idx}] ${snippet.replace(/\s+/g, ' ')}`);
    idx += kw.length;
    count++;
  }
}
