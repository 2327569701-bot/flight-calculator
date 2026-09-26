// Keep the Tauri frontend in sync with the browser/Electron entry point.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = ['index.html', 'css/workspace.css', 'js/calculator-data.js', 'js/flight-diagrams.js', 'js/workspace.js'];
for (const file of files) {
  const destination = path.join(root, 'dist', file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, file), destination);
}
console.log('Web frontend synced to dist.');
