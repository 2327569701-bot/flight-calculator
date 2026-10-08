// Live Windows WebView2 smoke test for the built, standalone Tauri EXE.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const exe = path.join(root, 'src-tauri', 'target', 'release', 'flight-calculator.exe');
if (!fs.existsSync(exe)) throw new Error('Build the V4 EXE before running the desktop smoke test');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
(async () => {
  const port = await freePort();
  const child = spawn(exe, [], {
    cwd: root, windowsHide: true, stdio: 'ignore',
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}` }
  });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 50; i++) {
      if (child.exitCode !== null) throw new Error(`EXE exited early: ${child.exitCode}`);
      try {
        const response = await fetch(`http://127.0.0.1:${port}/json/version`);
        if (response.ok) { ready = true; break; }
      } catch { /* WebView2 has not opened CDP yet. */ }
      await delay(200);
    }
    assert.equal(ready, true, 'WebView2 debugging endpoint did not start');
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    let page;
    for (let i = 0; i < 50; i++) {
      page = browser.contexts().flatMap(context => context.pages()).find(candidate => candidate.url().includes('tauri.localhost'));
      if (page) break;
      await delay(200);
    }
    assert(page, 'Tauri main webview not found');
    await page.getByRole('heading', { name: '本次飞行' }).waitFor();
    assert.equal(await page.locator('script[src="js/flight-session.js"]').count(), 1);
    console.log('PASS standalone V4 EXE starts the flight workspace in WebView2');

    const profiles = await page.evaluate(() => window.__TAURI__.core.invoke('export_all'));
    assert.equal(profiles.format, 'flight-calculator-profiles');
    assert(Array.isArray(profiles.aircraft));
    await assert.rejects(() => page.evaluate(() => window.__TAURI__.core.invoke('load_preset', { presetType: '../aircraft', name: 'test' })));
    console.log('PASS native profile export includes config and rejects invalid profile paths');

    const profileName = `V4 Smoke ${Date.now()}`;
    try {
      await page.evaluate(name => window.__TAURI__.core.invoke('save_aircraft_preset', {
        name, config: { version: 1, aircraft: 'A320', vrefKt: 135 }
      }), profileName);
      const loaded = await page.evaluate(name => window.__TAURI__.core.invoke('load_preset', {
        presetType: 'aircraft', name
      }), profileName);
      assert.equal(loaded.config.vrefKt, 135);
      const exported = await page.evaluate(() => window.__TAURI__.core.invoke('export_all'));
      assert(exported.aircraft.some(profile => profile.name === profileName && profile.config.aircraft === 'A320'));
      console.log('PASS native profile save, load and full-config export');
    } finally {
      await page.evaluate(name => window.__TAURI__.core.invoke('delete_preset', {
        presetType: 'aircraft', name
      }), profileName);
    }

    const weather = await page.evaluate(() => window.__TAURI__.core.invoke('fetch_metar', { station: 'KSFO' }));
    assert.equal(weather.icaoId, 'KSFO');
    assert.equal(typeof weather.altim, 'number');
    assert.match(weather.rawOb, /KSFO/);
    console.log('PASS native METAR lookup returns a single station observation');

    await page.evaluate(() => window.__TAURI__.core.invoke('open_chartfox_window'));
    console.log('PASS native ChartFox window creation completes');
    try {
      await page.evaluate(() => window.__TAURI__.core.invoke('dock_chartfox_window'));
      console.log('PASS ChartFox window docks beside the calculator');
    } catch (error) {
      if (!String(error).includes('空间不足')) throw error;
      console.log('PASS narrow display reports that docking needs manual placement');
    }
  } finally {
    if (browser) await browser.close();
    child.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
