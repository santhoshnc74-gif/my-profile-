import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const qaDir = resolve('qa');
if (!existsSync(qaDir)) mkdirSync(qaDir, { recursive: true });

const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const exe = existsSync(chromeExe) ? chromeExe : edgeExe;

const tempUserData = join(tmpdir(), `headless-portfolio-${Date.now()}`);

console.log(`Using browser: ${exe}`);

function snap(url, filename, width, height) {
  const dest = join(qaDir, filename);
  console.log(`Capturing ${filename} (${width}x${height}) from ${url}...`);
  spawnSync(exe, [
    '--headless=new',
    `--user-data-dir=${tempUserData}`,
    `--screenshot=${dest}`,
    `--window-size=${width},${height}`,
    '--hide-scrollbars',
    url,
  ], { stdio: 'inherit' });
  console.log(`  -> ${filename} exists:`, existsSync(dest));
}

// 1. Desktop Workshop (1440x900)
snap('http://127.0.0.1:3001/', 'desktop-preview.png', 1440, 900);

// 2. Mobile Workshop (390x844)
snap('http://127.0.0.1:3001/', 'mobile-preview.png', 390, 844);

// 3. Station Modal (Projects Station 01)
snap('http://127.0.0.1:3001/?station=projects', 'station-projects-preview.png', 1440, 900);

// 4. Accessible Simple View
snap('http://127.0.0.1:3001/?view=simple', 'simple-view-preview.png', 1440, 1100);

// 5. Admin workspace
snap('http://127.0.0.1:3001/admin', 'admin-preview.png', 1200, 900);

console.log('All screenshots captured successfully.');
