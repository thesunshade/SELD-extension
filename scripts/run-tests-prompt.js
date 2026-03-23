import { spawn } from 'child_process';
import readline from 'readline';

/**
 * Runs a command and returns its exit code.
 */
function runCommand(command, args) {
	return new Promise((resolve) => {
		const child = spawn(command, args, { stdio: 'inherit', shell: true });
		child.on('close', (code) => resolve(code));
	});
}

async function main() {
	console.log('\n🔍 Running unit tests...\n');
	
	const exitCode = await runCommand('npm', ['test']);

	if (exitCode === 0) {
		console.log('\n✅ Tests passed!\n');
		process.exit(0);
	}

	console.log('\n⚠️  Tests failed.');

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	const answer = await new Promise(resolve => {
		rl.question('Some tests failed. Continue with the dev environment anyway? (y/N): ', resolve);
	});

	rl.close();

	if (answer.trim().toLowerCase() !== 'y') {
		console.log('❌ Build aborted due to test failure.');
		process.exit(1);
	}

	console.log('✅ Continuing anyway...\n');
}

main().catch(err => {
	console.error('Error in test runner:', err);
	process.exit(1);
});
