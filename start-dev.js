import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
    server: '\x1b[34m', // Blue
    vite: '\x1b[32m',   // Green
    reset: '\x1b[0m'
};

function startProcess(name, command, args, color) {
    const proc = spawn(command, args, {
        cwd: __dirname,
        shell: true,
        stdio: 'pipe'
    });

    proc.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                console.log(`${color}[${name}]${colors.reset} ${line}`);
            }
        });
    });

    proc.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                console.error(`${color}[${name}]${colors.reset} ${line}`);
            }
        });
    });

    proc.on('close', (code) => {
        console.log(`${color}[${name}]${colors.reset} process exited with code ${code}`);
        process.exit(code);
    });

    return proc;
}

console.log('Starting development servers...\n');

// Start the Express server
const serverProc = startProcess('server', 'node', ['server/index.js'], colors.server);

// Start Vite dev server using the actual vite.js file
const viteJs = join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
const viteProc = startProcess('vite', 'node', [viteJs], colors.vite);

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    serverProc.kill();
    viteProc.kill();
    process.exit(0);
});

// Handle process termination
process.on('SIGTERM', () => {
    serverProc.kill();
    viteProc.kill();
    process.exit(0);
});
