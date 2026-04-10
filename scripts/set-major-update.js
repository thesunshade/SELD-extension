import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT, 'utils/update-status.ts');

async function ask(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase());
        });
    });
}

async function run() {
    const args = process.argv.slice(2);
    const shouldAsk = args.includes('--ask');
    let isMajorUpdate = false;

    if (shouldAsk && process.stdout.isTTY) {
        console.log('\n--- Major Update Check ---');
        const answer = await ask('Is this a major update that should trigger the welcome page? (y/N): ');
        isMajorUpdate = (answer === 'y' || answer === 'yes');
        console.log(isMajorUpdate ? '✅ Marked as MAJOR update.' : 'ℹ️  Marked as regular update.');
    }

    const content = `// Auto-generated update status
export const IS_MAJOR_UPDATE = ${isMajorUpdate};
`;

    if (!fs.existsSync(path.dirname(OUTPUT_PATH))) {
        fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, content, 'utf-8');
    if (shouldAsk) {
        console.log(`✅ Generated ${path.basename(OUTPUT_PATH)}\n`);
    }
}

run().catch(err => {
    console.error('Error setting major update status:', err);
    process.exit(1);
});
