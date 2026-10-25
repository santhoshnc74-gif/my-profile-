import { spawnSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const qaDir = resolve('qa');
if (!existsSync(qaDir)) mkdirSync(qaDir, { recursive: true });

const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const exe = existsSync(chromeExe) ? chromeExe : edgeExe;

const tempUserData = join(tmpdir(), `headless-portfolio-${Date.now()}`);

function snap(url, filename, width, height, waitMs = 1500) {
  const dest = join(qaDir, filename);
  console.log(`Capturing ${filename} from ${url}...`);
  spawnSync(exe, [
    '--headless=new',
    `--user-data-dir=${tempUserData}`,
    `--screenshot=${dest}`,
    `--window-size=${width},${height}`,
    `--virtual-time-budget=${waitMs}`,
    '--hide-scrollbars',
    url,
  ], { stdio: 'inherit' });
  console.log(`  -> ${filename} exists:`, existsSync(dest));
}

// 1. Unauthenticated /admin gate
snap('http://127.0.0.1:3001/admin', 'admin-gate-preview.png', 1200, 900, 2000);

// 2. Start editor fixture to capture authenticated /admin editor
console.log('Starting test fixture on port 4180...');
const fixture = spawn('node', ['qa/editor-fixture.mjs'], { stdio: 'pipe' });

setTimeout(() => {
  snap('http://127.0.0.1:4180/__test__/signin', 'admin-editor-preview.png', 1200, 1400, 3000);
  fixture.kill();
  console.log('Done capturing admin editor.');
}, 2500);
