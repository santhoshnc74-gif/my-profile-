import { spawn } from 'node:child_process';
const children = [
  spawn(process.execPath, ['--env-file-if-exists=.env', 'server/index.mjs'], { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' } }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...process.argv.slice(2)], { stdio: 'inherit' }),
];
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; children.forEach(c => c.kill()); process.exitCode = code; }
children.forEach(child => { child.on('error', () => stop(1)); child.on('exit', code => stop(code || 0)); });
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
