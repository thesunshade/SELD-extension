const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const FILES_TO_CHECK = [
  'lists.xml',
  'public/SELD.dict',
];

// 1. Get hours from command line argument (e.g., node script.js 48)
// If no argument is provided, default to 168 hours (1 week)
const args = process.argv.slice(2);
const limitHours = parseInt(args[0]) || 168;
const LIMIT_MS = limitHours * 60 * 60 * 1000;

/**
 * Gets the modification time and age in ms for a file
 */
function getAge(filePath) {
  const stat = fs.statSync(filePath);
  return {
    mtime: stat.mtime,
    ageMs: Date.now() - stat.mtime.getTime()
  };
}

/**
 * Formats milliseconds into a human-readable string
 */
function formatAge(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  return `${hours}h`;
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

    if (ageMs > LIMIT_MS) {
      staleFiles.push({
        file: relPath,
        modified: mtime.toLocaleString(),
        age: formatAge(ageMs),
      });
    }
  }

  // If everything is fresh, exit silently and let the build continue
  if (staleFiles.length === 0) {
    return;
  }

  // Log the stale files in a table format
  console.log(`\n-- STALE FILES DETECTED (Limit: ${limitHours}h) --`);
  console.table(staleFiles);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Dynamic prompt based on the hour limit
  const timeDescription = limitHours === 168 ? 'one week' : `${limitHours} hours`;

  const answer = await new Promise(resolve => {
    rl.question(`These files are more than ${timeDescription} old. Continue anyway? (y/N): `, resolve);
  });

  rl.close();

  if (answer.trim().toLowerCase() !== 'y') {
    console.log('❌ Build aborted by user.');
    process.exit(1);
  }

  console.log('✅ Continuing with build...\n');
}

main().catch(err => {
  console.error('Error in freshness check:', err);
  process.exit(1);
});