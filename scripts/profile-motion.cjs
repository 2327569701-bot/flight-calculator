// Profiles the actual Windows WebView2 animation, including an open ChartFox window.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const exe = path.resolve(__dirname, '../src-tauri/target/release/flight-calculator.exe');
if (!fs.existsSync(exe)) throw new Error('Build the standalone EXE first');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const percentile = (sorted, part) => sorted[Math.min(sorted.length - 1, Math.floor(part * (sorted.length - 1)))];
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
    cwd: path.dirname(exe), windowsHide: true, stdio: 'ignore',
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}` }
  });
  let browser;
  try {
    for (let i = 0; i < 80; i++) {
      try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break; } catch {}
      await delay(200);
    }
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    let page;
    for (let i = 0; i < 80; i++) {
      page = browser.contexts().flatMap(context => context.pages()).find(candidate => candidate.url().includes('tauri.localhost'));
      if (page) break;
      await delay(200);
    }
    if (!page) throw new Error('Main WebView2 page was not found');
    await page.bringToFront();
    await page.getByRole('heading', { name: '本次飞行' }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await delay(500);
    await page.evaluate(() => {
      window.__nativeStartViewTransition = document.startViewTransition;
      window.__transitionPerf = [];
      window.__activeMotionFrames = [];
      window.__inLiquidMotion = false;
      window.__renderPerf = [];
      for (const name of ['renderMain', 'renderResult', 'renderNav']) {
        const original = window[name];
        if (typeof original !== 'function') continue;
        window[name] = function (...args) {
          const started = performance.now();
          try { return original.apply(this, args); }
          finally { window.__renderPerf.push({ phase: window.__motionPhase, name, ms: Number((performance.now() - started).toFixed(1)) }); }
        };
      }
      document.startViewTransition = function (update) {
        const started = performance.now();
        const transition = window.__nativeStartViewTransition.call(this, () => {
          const updateStarted = performance.now();
          const result = update();
          window.__transitionPerf.push({ phase: window.__motionPhase, updateMs: Number((performance.now() - updateStarted).toFixed(1)) });
          return result;
        });
        transition.ready.then(() => {
          const row = window.__transitionPerf.at(-1);
          if (row) row.readyMs = Number((performance.now() - started).toFixed(1));
          window.__activePrior = performance.now();
          window.__inLiquidMotion = true;
        }).catch(() => {});
        transition.finished.finally(() => { window.__inLiquidMotion = false; }).catch(() => {});
        return transition;
      };
      window.__motionFrames = [];
      window.__motionSlowFrames = [];
      window.__motionLongTasks = [];
      window.__recordMotion = false;
      let prior = performance.now();
      const loop = now => {
        if (window.__recordMotion) {
          const gap = now - prior;
          window.__motionFrames.push(gap);
          if (gap > 16.67) window.__motionSlowFrames.push({ gap: Number(gap.toFixed(1)), phase: window.__motionPhase });
          if (window.__inLiquidMotion) {
            window.__activeMotionFrames.push(now - window.__activePrior);
            window.__activePrior = now;
          }
        }
        prior = now;
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (window.__recordMotion) window.__motionLongTasks.push({ duration: entry.duration, phase: window.__motionPhase });
          }
        }).observe({ entryTypes: ['longtask'] });
      }
    });
    async function pass(name) {
      const targets = ['glide', 'vs', 'tod', 'tri', 'atmo', 'vapp', 'history', 'session', 'glide', 'atmo', 'session'];
      await page.evaluate(() => { window.__motionFrames = []; window.__motionSlowFrames = []; window.__activeMotionFrames = []; window.__motionLongTasks = []; window.__transitionPerf = []; window.__renderPerf = []; window.__recordMotion = true; });
      for (const [index, id] of targets.entries()) {
        await page.evaluate(phase => { window.__motionPhase = phase; }, `${index + 1}: ${id}`);
        await page.locator(`nav a[href="#${id}"]`).click();
        await page.waitForTimeout(840);
      }
      await page.evaluate(() => { window.__recordMotion = false; });
      const data = await page.evaluate(() => ({
        frames: window.__motionFrames, activeFrames: window.__activeMotionFrames, slowFrames: window.__motionSlowFrames, longTasks: window.__motionLongTasks, transitions: window.__transitionPerf, renders: window.__renderPerf
      }));
      const frames = data.frames.filter(value => value > 0 && value < 1000).sort((a, b) => a - b);
      const p99 = percentile(frames, .99);
      const active = data.activeFrames.filter(value => value > 0 && value < 1000).sort((a, b) => a - b);
      const activeP99 = percentile(active, .99);
      console.log(JSON.stringify({
        name, frameCount: frames.length,
        medianMs: Number(percentile(frames, .5).toFixed(2)),
        p99Ms: Number(p99.toFixed(2)),
        onePercentLowFPS: Number((1000 / p99).toFixed(1)),
        over16_67: frames.filter(value => value > 16.67).length,
        over25: frames.filter(value => value > 25).length,
        maxGapMs: Number(frames.at(-1).toFixed(2)),
        animation: { frameCount: active.length, p99Ms: Number(activeP99.toFixed(2)),
          onePercentLowFPS: Number((1000 / activeP99).toFixed(1)),
          over16_67: active.filter(value => value > 16.67).length,
          maxGapMs: Number(active.at(-1).toFixed(2)) },
        slowFrames: data.slowFrames,
        longTasks: data.longTasks.map(value => ({ duration: Number(value.duration.toFixed(1)), phase: value.phase })),
        transitions: data.transitions,
        renders: data.renders.filter(value => value.ms > 2)
      }));
    }
    await pass('calculator only');
    await page.evaluate(() => window.__TAURI__.core.invoke('open_chartfox_window'));
    await delay(2500);
    await pass('ChartFox open');
  } finally {
    if (browser) await browser.close();
    child.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
