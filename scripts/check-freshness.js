const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const FILES_TO_CHECK = [
  'lists.xml',
  'public/SELD.dict',
];

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function getAge(filePath) {
  const stat = fs.statSync(filePath);
  return { mtime: stat.mtime, ageMs: Date.now() - stat.mtime.getTime() };
}

function formatAge(ms) {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 0) return 'less than a day';
  if (days === 1) return '1 day';
  return `${days} days`;
}

async function main() {
  const staleFiles = [];

  for (const relPath of FILES_TO_CHECK) {
    const fullPath = path.join(ROOT, relPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  File not found: ${relPath} — skipping freshness check.`);
      continue;
    }
    const { mtime, ageMs } = getAge(fullPath);
    if (ageMs > ONE_WEEK_MS) {
      staleFiles.push({
        file: relPath,
        modified: mtime.toLocaleDateString(),
        age: formatAge(ageMs),
      });
    }
  }

  if (staleFiles.length === 0) return; // All fresh, continue build

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║           ⚠️  STALE FILES DETECTED ⚠️            ║');
  console.log('╠══════════════════════════════════════════════════╣');
  for (const { file, modified, age } of staleFiles) {
    console.log(`║  📄 ${file}`);
    console.log(`║     Last modified: ${modified} (${age} ago)`);
  }
  console.log('╚══════════════════════════════════════════════════╝\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(resolve => {
    rl.question('These files are more than a week old. Continue anyway? (y/N) ', resolve);
  });
  rl.close();

  if (answer.trim().toLowerCase() !== 'y') {
    console.log('❌ Build aborted.');
    process.exit(1);
  }

  console.log('✅ Continuing build...\n');
}

main().catch(err => {
  console.error('Freshness check failed:', err);
  process.exit(1);
});
