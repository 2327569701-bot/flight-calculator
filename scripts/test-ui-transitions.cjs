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
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    const pill = page.locator('.unit-pill');
    const pillBox = await pill.boundingBox();
    await pill.click();
    const dialog = page.locator('#settingsDialog');
    assert.equal(await dialog.evaluate(node => node.open), true);
    const earlyDialog = await dialog.boundingBox();
    assert(earlyDialog.width < 480 && earlyDialog.width >= pillBox.width * .8, 'settings should start near its trigger');
    await page.waitForTimeout(260);
    const growingDialog = await dialog.boundingBox();
    assert(growingDialog.width > earlyDialog.width + Math.min(15, (480 - earlyDialog.width) / 2), `settings should unfold through intermediate sizes (${earlyDialog.width.toFixed(1)} -> ${growingDialog.width.toFixed(1)})`);
    await page.waitForTimeout(500);
    assert((await dialog.boundingBox()).width > 450, 'settings should reach its full width');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
    assert.equal(await dialog.evaluate(node => node.open), true, 'settings should animate closed');
    await page.waitForTimeout(350);
    assert.equal(await dialog.evaluate(node => node.open), false);
    assert.equal(await pill.evaluate(node => document.activeElement === node), true, 'focus returns to the unit control');
    console.log('PASS settings opens from the unit pill and closes back to it');

    await pill.click();
    await page.waitForTimeout(90);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(420);
    assert.equal(await dialog.evaluate(node => node.open), false, 'settings closes cleanly during its opening motion');
    assert.equal(await pill.evaluate(node => document.activeElement === node), true);
    console.log('PASS interrupting the settings animation restores the trigger');

    await page.locator('.sidebar-settings').click();
    await page.waitForTimeout(720);
    await page.locator('[data-preset="metric"]').click();
    await page.getByRole('button', { name: '应用设置' }).click();
    await page.waitForTimeout(420);
    assert.equal(await dialog.evaluate(node => node.open), false);
    assert.equal(await page.locator('#unitSummary').textContent(), '公制单位');
    assert.equal(await page.locator('.sidebar-settings').evaluate(node => document.activeElement === node), true);
    console.log('PASS sidebar settings and apply still update the calculator');

    await page.locator('nav a[href="#glide"]').click();
    await page.locator('#g1-alt1').fill('1234');
    await page.locator('nav a[href="#vs"]').click();
    await page.getByRole('heading', { name: '垂直速度' }).waitFor();
    const earlyProgress = await page.evaluate(() => document.getAnimations().find(animation => animation.effect?.pseudoElement === '::view-transition-old(liquid-page)')?.currentTime);
    assert.equal(typeof earlyProgress, 'number', 'old page should be captured for the native transition');
    assert.equal(await page.evaluate(() => document.getAnimations().some(animation => animation.effect?.pseudoElement === '::view-transition-new(liquid-orb-in)')), true, 'incoming glass sphere should animate');
    assert.equal(await page.locator('nav a[href="#vs"] svg').evaluate(node => getComputedStyle(node).animationName), 'none', 'sidebar icon should not add a competing bounce');
    const motionSamples = await page.evaluate(async () => {
      const animations = document.getAnimations().filter(animation => animation.effect?.pseudoElement?.includes('liquid-'));
      const saved = animations.map(animation => ({ animation, time: animation.currentTime, running: animation.playState === 'running' }));
      animations.forEach(animation => animation.pause());
      const samples = [];
      const duration = Number.parseFloat(document.documentElement.style.getPropertyValue('--liquid-duration')) || 570;
      for (const time of [0, .2, .4, .6, .8, .99].map(part => part * duration)) {
        animations.forEach(animation => { animation.currentTime = time; });
        await new Promise(resolve => requestAnimationFrame(resolve));
        const read = side => {
          const style = getComputedStyle(document.documentElement, `::view-transition-${side}(liquid-page)`);
          return { x: Number.parseFloat(style.translate), scale: Number.parseFloat(style.scale) };
        };
        samples.push({ old: read('old'), next: read('new') });
      }
      saved.forEach(({ animation, time, running }) => { animation.currentTime = time; if (running) animation.play(); });
      return samples;
    });
    for (let i = 1; i < motionSamples.length; i++) {
      assert(motionSamples[i].next.scale > motionSamples[i - 1].next.scale, 'new page should expand without a pause or reverse');
      assert(motionSamples[i].old.scale < motionSamples[i - 1].old.scale, 'old page should contract without a pause or reverse');
      assert(Math.abs(motionSamples[i].next.x) < Math.abs(motionSamples[i - 1].next.x), 'incoming sphere should keep flying toward the page');
      assert(Math.abs(motionSamples[i].old.x) > Math.abs(motionSamples[i - 1].old.x), 'outgoing sphere should keep flying toward the sidebar');
    }
    assert(Math.abs(motionSamples[1].next.x) < Math.abs(motionSamples[0].next.x) * .6 && motionSamples[1].next.scale < .2, 'incoming sphere should fly before it unfolds');
    assert(motionSamples[1].old.scale < .55 && Math.abs(motionSamples[1].old.x) < Math.abs(motionSamples.at(-1).old.x) * .25, 'outgoing page should fold before flying back');
    await page.waitForTimeout(260);
    const laterProgress = await page.evaluate(() => document.getAnimations().find(animation => animation.effect?.pseudoElement === '::view-transition-old(liquid-page)')?.currentTime);
    assert(laterProgress > earlyProgress, 'old page transition should progress between frames');
    const expandingPage = await page.evaluate(() => getComputedStyle(document.documentElement, '::view-transition-new(liquid-page)').scale);
    assert(expandingPage !== 'none', 'new page should be scaling open during the transition');
    await page.waitForTimeout(550);
    assert.equal(await page.evaluate(() => document.getAnimations().some(animation => animation.effect?.pseudoElement?.includes('liquid-page'))), false, 'transition surfaces should be removed');
    await page.locator('nav a[href="#glide"]').click();
    await page.waitForTimeout(780);
    assert.equal(await page.locator('#g1-alt1').inputValue(), '1234', 'navigation preserves calculator input');
    console.log('PASS sidebar navigation exchanges pages through glass spheres');

    await page.locator('#mode-g2').click();
    await page.locator('#g2-alt2').waitFor();
    assert.equal(await page.evaluate(() => document.getAnimations().some(animation => animation.effect?.pseudoElement === '::view-transition-old(liquid-page)')), true, 'calculator modes share the page transition');
    assert.equal(await page.evaluate(() => document.getAnimations().some(animation => animation.effect?.pseudoElement === '::view-transition-new(liquid-orb-in)')), true, 'mode change should retain the glass sphere');
    await page.waitForTimeout(610);
    assert.equal(await page.locator('#g2-alt2').count(), 1);
    await page.locator('#mode-g1').click();
    await page.waitForTimeout(610);
    assert.equal(await page.locator('#g1-alt1').inputValue(), '1234');
    console.log('PASS calculator mode changes use the same motion without losing inputs');

    await page.locator('nav a[href="#tod"]').click();
    await page.waitForTimeout(90);
    await page.locator('nav a[href="#tri"]').click();
    await page.waitForTimeout(90);
    await page.locator('nav a[href="#atmo"]').click();
    await page.waitForTimeout(820);
    assert.equal(await page.locator('h1').textContent(), '大气 · 空速');
    assert.equal(await page.locator('.nav-flight-ghost, .nav-flight-orb').count(), 0, 'interrupted transitions clean up');
    assert.equal(await page.locator('#main').evaluate(node => node.inert), false);
    console.log('PASS rapid navigation settles on the last page');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('nav a[href="#vs"]').click();
    await page.getByRole('heading', { name: '垂直速度' }).waitFor();
    assert.equal(await page.locator('.nav-flight-ghost, .nav-flight-orb').count(), 0);
    await pill.click();
    assert.equal(await dialog.evaluate(node => node.open), true);
    await page.keyboard.press('Escape');
    assert.equal(await dialog.evaluate(node => node.open), false);
    console.log('PASS reduced motion uses immediate transitions');

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 390, height: 620 });
    await page.locator('nav a[href="#history"]').click();
    await page.waitForTimeout(800);
    assert.equal(await page.locator('.nav-flight-ghost, .nav-flight-orb').count(), 0);
    await pill.click();
    await page.waitForTimeout(720);
    const mobileDialog = await dialog.boundingBox();
    assert(mobileDialog.x >= 0 && mobileDialog.x + mobileDialog.width <= 390, 'settings stays within the narrow screen');
    assert(mobileDialog.y >= 0 && mobileDialog.y + mobileDialog.height <= 620, 'settings stays within the short screen');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(420);
    console.log('PASS narrow and short screens keep the motion usable');

    const fallback = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    await fallback.addInitScript(() => { document.startViewTransition = undefined; });
    await fallback.goto(`http://127.0.0.1:${server.address().port}/`);
    await fallback.locator('nav a[href="#atmo"]').click();
    await fallback.locator('.nav-flight-ghost').waitFor();
    await fallback.waitForTimeout(230);
    const fallbackScale = await fallback.locator('#main').evaluate(node => getComputedStyle(node).scale);
    assert(fallbackScale !== 'none' && Number.parseFloat(fallbackScale) > 0, 'legacy motion should continuously expand the new page');
    await fallback.waitForTimeout(600);
    assert.equal(await fallback.locator('.nav-flight-ghost, .nav-flight-orb').count(), 0, 'legacy motion should clean up after completion');
    assert.equal(await fallback.locator('h1').textContent(), '大气 · 空速');
    await fallback.close();
    console.log('PASS legacy browser motion follows the same glass sphere trajectory');

    assert.deepEqual(errors, [], 'no browser page errors');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
