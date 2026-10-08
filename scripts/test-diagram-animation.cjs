// Browser regression tests. Set PLAYWRIGHT_MODULE to a shared Playwright install if needed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const cases = [
  ['glide', 0, { alt1: 3000, dist1: 10 }],
  ['glide', 1, { alt2: 3000, angle1: 3 }],
  ['vs', 0, { gs1: 140, angle2: 3 }],
  ['tod', 0, { alt3: 30000, angle3: 3 }],
  ['tod', 1, { dist2: 90, gs2: 450 }],
  ['tri', 0, { spd: 120, dst: 60 }],
  ['atmo', 0, { qnh: 1000, qnhu: 'hpa', felev: 1500 }],
  ['atmo', 1, { palta: 5000, oat: 25 }],
  ['atmo', 2, { ias: 140, paltas: 10000 }],
  ['vapp', 0, { vref: 135, correction: 5 }],
  ['vapp', 1, { winds: 20, wangle: 30 }]
];
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + (req.url === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' })[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = process.env.PLAYWRIGHT_CDP_URL
    ? await chromium.connectOverCDP(process.env.PLAYWRIGHT_CDP_URL)
    : await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  try {
    const page = process.env.PLAYWRIGHT_CDP_URL
      ? browser.contexts()[0].pages()[0]
      : await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    if (process.env.PLAYWRIGHT_CDP_URL) await page.reload();
    else await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.evaluate(() => {
      window.geometrySnapshot = () => {
        const el = document.querySelector('[data-geometry]');
        return ['d', 'transform', 'x1', 'y1', 'x2', 'y2'].map(name => el.getAttribute(name) || '').join('|');
      };
      window.animationSnapshot = (target = false) => {
        let svg = document.querySelector('#flightDiagram svg');
        if (target) {
          const template = document.createElement('template');
          template.innerHTML = FlightDiagrams.svg(FlightDiagrams.model(currentCard().id, state.results[currentCard().id], UnitSystem));
          svg = template.content.firstElementChild;
        }
        return svg.outerHTML;
      };
    });
    for (const [section, mode, inputs] of cases) {
      await page.evaluate(({ section, mode, inputs }) => {
        state.section = section; state.modes[section] = mode;
        delete state.results[currentCard().id]; delete state.drafts[currentCard().id];
        renderMain();
        window.originalSvg = document.querySelector('#flightDiagram svg');
        for (const [name, value] of Object.entries(inputs)) {
          const field = document.querySelector(`[name="${name}"]`);
          field.value = value;
          field.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, { section, mode, inputs });
      const initialGeometry = await page.evaluate(() => geometrySnapshot());
      await page.evaluate(() => document.querySelector('#calculatorForm').requestSubmit());
      assert.equal(await page.evaluate(() => geometrySnapshot()), initialGeometry, `${section}/${mode}: calculation must not jump before the first frame`);
      const target = await page.evaluate(() => animationSnapshot(true));
      await page.clock.runFor(300);
      const intermediate = await page.evaluate(() => animationSnapshot());
      assert.notEqual(await page.evaluate(() => geometrySnapshot()), initialGeometry);
      assert.notEqual(intermediate, target, 'must pass through intermediate geometry');
      await page.clock.runFor(2200);
      assert.equal(await page.evaluate(() => animationSnapshot()), target);
      const calculatedGeometry = await page.evaluate(() => geometrySnapshot());
      await page.evaluate(() => document.querySelector('#resetInputs').click());
      assert.equal(await page.evaluate(() => geometrySnapshot()), calculatedGeometry, 'reset must start from the visible position');
      const resetTarget = await page.evaluate(() => animationSnapshot(true));
      await page.clock.runFor(250);
      assert.notEqual(await page.evaluate(() => geometrySnapshot()), calculatedGeometry);
      assert.notEqual(await page.evaluate(() => animationSnapshot()), resetTarget);
      await page.clock.runFor(2200);
      assert.equal(await page.evaluate(() => animationSnapshot()), resetTarget);
      assert.equal(await page.evaluate(() => originalSvg === document.querySelector('#flightDiagram svg')), true, 'SVG must stay mounted');
      console.log(`PASS ${section}/${mode}: calculate + reset intermediate frames and exact endpoints`);
    }
    // Interrupt in flight, recalculate, then reset again without a single-frame flash.
    await page.evaluate(() => {
      state.section = 'glide'; state.modes.glide = 0; renderMain();
      document.querySelector('[name="alt1"]').value = 6000;
      document.querySelector('[name="dist1"]').value = 10;
      document.querySelector('#calculatorForm').requestSubmit();
    });
    await page.clock.runFor(300);
    for (const action of ['reset', 'calculate', 'edit', 'calculate']) {
      const before = await page.evaluate(() => geometrySnapshot());
      await page.evaluate(action => {
        if (action === 'reset') document.querySelector('#resetInputs').click();
        else {
          const field = document.querySelector('[name="alt1"]');
          field.value = 9000;
          document.querySelector('[name="dist1"]').value = 10;
          if (action === 'edit') field.dispatchEvent(new Event('input', { bubbles: true }));
          else document.querySelector('#calculatorForm').requestSubmit();
        }
      }, action);
      assert.equal(await page.evaluate(() => geometrySnapshot()), before, `interrupted ${action} must preserve visible geometry`);
      await page.clock.runFor(120);
    }
    await page.clock.runFor(2500);
    assert.equal(await page.evaluate(() => animationSnapshot()), await page.evaluate(() => animationSnapshot(true)));
    console.log('PASS interruptions: reset, edit and recalculate continue from the displayed frame');
    // The timeline changes its adaptive axis from 20 to 80 minutes.
    await page.evaluate(() => {
      state.section = 'tod'; state.modes.tod = 1; renderMain();
      state.results.t2 = { ok: true, val: '12 分钟', inputs: { dist2: 90, gs2: 450 } }; renderResult();
      window.beforeScale = geometrySnapshot();
      state.results.t2 = { ok: true, val: '72 分钟', inputs: { dist2: 540, gs2: 450 } }; renderResult(true);
    });
    assert.equal(await page.evaluate(() => geometrySnapshot()), await page.evaluate(() => beforeScale));
    await page.clock.runFor(2500);
    assert.equal(await page.evaluate(() => animationSnapshot()), await page.evaluate(() => animationSnapshot(true)));
    const settled = await page.evaluate(() => animationSnapshot());
    const flowing = await page.locator('.diagram-effects').evaluate(el => el.innerHTML);
    await page.clock.runFor(200);
    assert.notEqual(await page.locator('.diagram-effects').evaluate(el => el.innerHTML), flowing, 'ambient flow should continue after geometry settles');
    await page.evaluate(() => document.querySelector('.diagram-pause').click());
    const paused = await page.locator('.diagram-effects').evaluate(el => el.innerHTML);
    await page.clock.runFor(500);
    assert.equal(await page.locator('.diagram-effects').evaluate(el => el.innerHTML), paused, 'pause must freeze continuous effects');
    await page.evaluate(() => document.querySelector('.diagram-replay').click());
    await page.clock.runFor(350);
    assert.notEqual(await page.locator('.diagram-effects').evaluate(el => el.innerHTML), paused);
    assert.ok(Number(await page.locator('.diagram-route-scan').getAttribute('opacity')) > .1, 'replay should retrace the route');
    assert.equal(await page.evaluate(() => animationSnapshot()), settled, 'replaying effects must not alter results or geometry');
    assert.equal(await page.locator('.diagram-pause').getAttribute('aria-pressed'), 'false');
    console.log('PASS continuous flow, pause and replay without changing computed data');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => document.querySelector('#resetInputs').click());
    assert.equal(await page.evaluate(() => animationSnapshot()), await page.evaluate(() => animationSnapshot(true)));
    assert.equal(await page.locator('#flightDiagram').getAttribute('data-animating'), null);
    assert.equal(await page.locator('.diagram-effects').evaluate(el => getComputedStyle(el).display), 'none');
    assert.equal(await page.locator('.diagram-pause').isDisabled(), true);
    assert.deepEqual(errors, []);
    console.log('PASS adaptive scale continuity, reduced motion and no page errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
