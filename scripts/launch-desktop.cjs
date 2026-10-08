const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const executable = path.resolve(__dirname, '../src-tauri/target/release/flight-calculator.exe');
if (!fs.existsSync(executable)) {
  console.error('未找到桌面程序。请先运行 npm run tauri:build -- --no-bundle。');
  process.exitCode = 1;
} else {
  const child = spawn(executable, [], { cwd: path.dirname(executable), detached: true, stdio: 'ignore' });
  child.on('error', error => { console.error('无法启动桌面程序：' + error.message); process.exitCode = 1; });
  child.unref();
}
