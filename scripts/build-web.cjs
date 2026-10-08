// Keep the Tauri frontend in sync with the browser entry point.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
// Start from a clean folder so removed/renamed files never linger in the bundle.
fs.rmSync(dist, { recursive: true, force: true });
const files = ['index.html', 'css/workspace.css', 'js/calculator-data.js', 'js/flight-diagrams.js', 'js/flight-session.js', 'js/session-page.js', 'js/workspace.js'];
for (const file of files) {
  const destination = path.join(dist, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, file), destination);
}
console.log('Web frontend rebuilt into dist (cleaned first).');
