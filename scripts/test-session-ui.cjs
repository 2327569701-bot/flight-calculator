const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const server = http.createServer((request, response) => {
  const file = path.resolve(root, '.' + (request.url === '/' ? '/index.html' : request.url.split('?')[0]));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { response.writeHead(404); response.end(); return; }
  response.setHeader('Content-Type', ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' })[path.extname(file)] || 'application/octet-stream');
  response.end(fs.readFileSync(file));
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.getByRole('heading', { name: '本次飞行' }).waitFor();
    await page.locator('#session-arrival').fill('KSFO');
    await page.locator('#session-currentAltFt').fill('12000');
    await page.locator('#session-targetAltFt').fill('3000');
    await page.locator('#session-groundSpeedKt').fill('120');
    await page.locator('#session-qnhHpa').fill('1000');
    await page.locator('#session-fieldElevFt').fill('500');
    await page.locator('#session-oatC').fill('20');
    await page.locator('#session-vrefKt').fill('135');
    await page.getByRole('button', { name: '保存本次飞行' }).click();
    await page.getByRole('button', { name: /TOD 距离/ }).waitFor();
    assert.equal(await page.locator('[data-session-card="t1"]').isEnabled(), true);
    assert.equal(await page.locator('[data-session-card="a2"]').isEnabled(), true);
    console.log('PASS flight session saves canonical measurements and enables linked tools');

    await page.locator('[data-session-card="t1"]').click();
    await page.locator('#t1-alt3').waitFor();
    assert.equal(await page.locator('#t1-alt3').inputValue(), '9000');
    assert.equal(await page.locator('#t1-angle3').inputValue(), '3');
    console.log('PASS flight session transfers descent values to TOD');

    await page.locator('nav a[href="#session"]').click();
    await page.locator('#session-arrival').waitFor();
    await page.reload();
    await page.locator('#session-arrival').waitFor();
    assert.equal(await page.locator('#session-arrival').inputValue(), 'KSFO');
    assert.equal(await page.locator('#session-currentAltFt').inputValue(), '12000');
    console.log('PASS session persists after navigation and reload');

    await page.locator('#session-aircraft').fill('A320');
    await page.locator('#profileName').fill('A320 Test');
    await page.locator('#saveProfile').click();
    await page.locator('#profileSelect option[value="A320 Test"]').waitFor({ state: 'attached' });
    await page.locator('#session-aircraft').fill('Other');
    await page.locator('#profileSelect').selectOption('A320 Test');
    await page.locator('#loadProfile').click();
    await page.locator('#session-aircraft').waitFor();
    assert.equal(await page.locator('#session-aircraft').inputValue(), 'A320');
    console.log('PASS aircraft profile can be saved and restored');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#exportBackup').click();
    const download = await downloadPromise;
    const stream = fs.readFileSync(await download.path(), 'utf8');
    const backup = JSON.parse(stream);
    assert.equal(backup.format, 'flight-calculator-v4-backup');
    assert.equal(backup.session.aircraft, 'A320');
    assert.equal(backup.profiles.aircraft.length, 1);
    console.log('PASS complete backup contains session and actual profile config');

    await page.locator('#session-aircraft').fill('Other');
    await page.locator('#importBackupFile').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(stream) });
    await page.waitForFunction(() => document.querySelector('#session-aircraft')?.value === 'A320');
    assert.equal(await page.locator('#profileSelect option[value="A320 Test"]').count(), 1);
    console.log('PASS complete backup restores session and profile');

    const poisoned = { ...backup, history: [{ id: '\" onmouseover=\"alert(1)', t: Date.now(), title: 'x' }] };
    await page.locator('#importBackupFile').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(poisoned)) });
    await page.locator('#sessionStatus').getByText('备份格式不受支持').waitFor();
    console.log('PASS invalid history backup is rejected');

    await page.locator('nav a[href="#glide"]').click();
    await page.locator('#g1-alt1').waitFor();
    await page.locator('.unit-pill').click();
    await page.locator('[data-preset="metric"]').click();
    await page.getByRole('button', { name: '应用设置' }).click();
    await page.locator('nav a[href="#session"]').click();
    await page.locator('#session-currentAltFt').waitFor();
    assert.ok(Math.abs(Number(await page.locator('#session-currentAltFt').inputValue()) - 3657.6) < .01);
    assert.deepEqual(errors, []);
    console.log('PASS unit change preserves physical session measurements without page errors');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
