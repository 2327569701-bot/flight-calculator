const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const executable = [
  path.join(root, 'Flight Calculator V2.exe'),
  path.join(root, 'src-tauri', 'target', 'release', 'flight-calculator.exe')
].find(file => fs.existsSync(file));
if (!executable) {
  console.error('未找到桌面程序。请从 GitHub Releases 下载 EXE，或运行 npm run tauri:build 后重试。');
  process.exitCode = 1;
} else {
  const child = spawn(executable, [], { cwd: root, detached: true, stdio: 'ignore' });
  child.on('error', error => { console.error('无法启动桌面程序：' + error.message); process.exitCode = 1; });
  child.unref();
}
