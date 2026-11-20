import fs from 'fs';

const html = fs.readFileSync('C:/Users/USER/.gemini/antigravity/brain/f88ba175-838d-451a-b8e6-563f672767ac/.system_generated/steps/281/output.txt', 'utf8');

// Look for sections around instruments, groups, trading
const headings = ['#groups', '#servers', '#instruments', '#currencies', '#subsets', '#subset-groups', '#subset-instruments', '#orders', '#positions', '#deals'];

for (const h of headings) {
  const pos = html.indexOf(`id="${h.replace('#', '')}"`);
  if (pos !== -1) {
    console.log(`\n=================== HEADING: ${h} ===================`);
    const slice = html.substring(pos, pos + 1200);
    const clean = slice.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');
    console.log(clean);
  }
}
