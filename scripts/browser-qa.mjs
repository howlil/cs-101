/**
 * Chrome responsive QA without Playwright or test-only dependencies.
 * Uses Node 24 WebSocket + Chrome DevTools Protocol, starting with the live
 * SSR Node server from the preceding CI smoke step.
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.env.CS101_QA_BASE || 'http://127.0.0.1:4321';
const screenshotDir = process.env.CS101_QA_SCREENSHOTS || '/tmp/cs101-qa';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const bins = [process.env.CHROME_BIN, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].filter(Boolean);
const chromeBin = bins.find((name) => spawnSync('which', [name], { encoding: 'utf8' }).status === 0);
assert.ok(chromeBin, 'Headless Google Chrome / Chromium must be installed on the CI runner.');

class DevTools {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.counter = 0;
    this.pending = new Map();
    this.exceptions = [];
  }
  async connect() {
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') {
        this.exceptions.push(message.params?.exceptionDetails?.text || 'Uncaught runtime exception');
      }
      const entry = this.pending.get(message.id);
      if (!entry) return;
      clearTimeout(entry.timer);
      this.pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result || {});
    });
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    await this.send('Page.enable');
    await this.send('Runtime.enable');
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.counter;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Chrome DevTools timeout: ' + method));
      }, 15000);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const response = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) {
      throw new Error('Page eval: ' + response.exceptionDetails.text);
    }
    return response.result?.value;
  }
  async wait(check, label, timeout = 15000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      try { if (await check()) return; } catch {}
      await sleep(125);
    }
    throw new Error('Browser condition timed out: ' + label);
  }
  async resize(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width, height, screenWidth: width, screenHeight: height,
      deviceScaleFactor: 1, mobile: width <= 900,
    });
  }
  async goto(route) {
    const url = new URL(route, base);
    await this.send('Page.navigate', { url: url.href });
    await this.wait(async () => await this.eval(
      'location.pathname === ' + JSON.stringify(url.pathname) +
      ' && document.readyState === "complete" && Boolean(document.querySelector(".app-shell"))'
    ), 'document at ' + url.pathname, 24000);
    // React client:load islands must hydrate before exercising click behavior.
    await this.wait(async () => await this.eval(
      'document.querySelectorAll("astro-island[ssr]").length === 0'
    ), 'React hydration ' + url.pathname, 24000);
  }
  async metrics() {
    return await this.eval('(() => {' +
      'const aside = document.querySelector(".app-sidebar");' +
      'const sheet = document.querySelector(".sidebar-mobile-dialog");' +
      'return {vw:innerWidth,doc:document.documentElement.scrollWidth,' +
      'body:document.body.scrollWidth,sidebar:aside?.getBoundingClientRect().width,' +
      'sidebarDisplay:aside ? getComputedStyle(aside).display : "absent",' +
      'triggerDisplay:getComputedStyle(document.querySelector(".sidebar-mobile-trigger")).display,' +
      'sheet:sheet ? {left:sheet.getBoundingClientRect().left,width:sheet.getBoundingClientRect().width,height:sheet.getBoundingClientRect().height} : null,' +
      'theme:document.documentElement.dataset.theme,collapsed:document.documentElement.dataset.sidebar,' +
      'mainCount:document.querySelectorAll("main").length,bodyBg:getComputedStyle(document.body).backgroundColor};' +
      '})()');
  }
  async screenshot(filename) {
    await mkdir(screenshotDir, { recursive: true });
    const frame = await this.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(screenshotDir, filename), Buffer.from(frame.data, 'base64'));
  }
}

let chrome;
let client;
let profile;
try {
  let port;
  let lastStartupError = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    profile = await mkdtemp(join(tmpdir(), 'cs101-chrome-qa-'));
    let stderr = '';
    chrome = spawn(chromeBin, [
      '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
      '--disable-gpu', '--disable-extensions', '--disable-background-networking',
      '--disable-breakpad', '--no-first-run', '--no-default-browser-check',
      '--remote-allow-origins=*', '--remote-debugging-port=0',
      '--user-data-dir=' + profile, 'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    chrome.stderr?.on('data', (buffer) => {
      stderr = (stderr + buffer.toString()).slice(-12000);
    });
    const portFile = join(profile, 'DevToolsActivePort');
    const started = Date.now();
    while (Date.now() - started < 18000) {
      try {
        port = (await readFile(portFile, 'utf8')).split('\n')[0].trim();
        if (port) break;
      } catch {}
      if (chrome.exitCode !== null) break;
      await sleep(125);
    }
    if (port) {
      console.log('Chrome CDP ready on attempt ' + attempt);
      break;
    }
    lastStartupError = 'attempt ' + attempt + ', exitCode=' + chrome.exitCode + ', stderr=' + stderr.slice(-1600);
    console.warn('Chrome startup retry: ' + lastStartupError);
    chrome.kill('SIGKILL');
    await sleep(450);
    await rm(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
    profile = undefined;
  }
  assert.ok(port, 'Chrome DevTools failed after three attempts: ' + lastStartupError);
  const response = await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' });
  assert.ok(response.ok, 'Chrome could not create a QA tab');
  const tab = await response.json();
  client = new DevTools(tab.webSocketDebuggerUrl);
  await client.connect();

  await client.resize(1440, 900);
  await client.goto('/curriculum');
  let m = await client.metrics();
  assert.equal(m.mainCount, 1, 'AppLayout should own exactly one main landmark');
  assert.equal(Math.round(m.sidebar), 248, 'Expanded sidebar should be 248px');
  assert.equal(await client.eval('getComputedStyle(document.querySelector(".sidebar-expand")).display'), 'none',
    'Desktop expanded state must hide the Expand button');
  assert.notEqual(await client.eval('getComputedStyle(document.querySelector(".sidebar-collapse")).display'), 'none',
    'Desktop expanded state must expose the Collapse button');
  assert.ok(m.doc <= m.vw + 1, 'Desktop document horizontal overflow: ' + JSON.stringify(m));
  await client.screenshot('curriculum-desktop-1440.png');
  assert.ok(await client.eval('document.querySelectorAll(".curriculum-overview-modules a").length > 0'),
    'Browse route should show module overview, not an arbitrary first-item preview');
  assert.equal(await client.eval('Boolean(document.querySelector(".item-id-standalone"))'), false,
    'Bare Curriculum route should not select an item');
  await client.eval('document.querySelector(".curriculum-overview-modules a").click()');
  await client.wait(async () => await client.eval('location.pathname === "/curriculum" && new URLSearchParams(location.search).has("item")'), 'module opens selected preview');
  await client.wait(async () => await client.eval('Boolean(document.querySelector(".item-id-standalone"))'), 'selected curriculum item');
  console.log('PASS curriculum overview → module selection');

  console.log('PASS desktop 1440: expanded sidebar, semantics, no overflow');

  await client.eval('document.querySelector(".sidebar-collapse").click()');
  await client.wait(async () => await client.eval('document.documentElement.dataset.sidebar === "collapsed"'), 'sidebar collapse');
  m = await client.metrics();
  assert.equal(Math.round(m.sidebar), 56, 'Collapsed sidebar should be 56px');
  assert.equal(await client.eval('getComputedStyle(document.querySelector(".sidebar-collapse")).display'), 'none',
    'Collapsed sidebar must hide Collapse');
  assert.notEqual(await client.eval('getComputedStyle(document.querySelector(".sidebar-expand")).display'), 'none',
    'Collapsed sidebar must show Expand');
  await client.goto('/progress');
  m = await client.metrics();
  assert.equal(m.collapsed, 'collapsed', 'Collapsed state should survive route navigation');
  await client.eval('document.querySelector(".sidebar-expand").click()');
  await client.wait(async () => await client.eval('document.documentElement.dataset.sidebar === "expanded"'), 'sidebar expansion');
  console.log('PASS desktop sidebar collapse / expansion persistence');

  // Exercise Astro ClientRouter rather than only hard Page.navigate calls.
  await client.eval('localStorage.setItem("cs101:theme","dark"); document.documentElement.dataset.theme="dark"; document.documentElement.dataset.themePreference="dark"');
  const originalNavigation = await client.eval('performance.timeOrigin');
  await client.eval('document.querySelector(\'.sidebar-nav-link[aria-label="Kurikulum"]\').click()');
  await client.wait(async () => await client.eval('location.pathname === "/curriculum"'), 'Astro client navigation to curriculum', 20000);
  await client.wait(async () => await client.eval('document.querySelectorAll("astro-island[ssr]").length === 0'), 'Astro next route hydration', 20000);
  m = await client.metrics();
  assert.equal(await client.eval('performance.timeOrigin'), originalNavigation,
    'Sidebar navigation should use Astro ClientRouter, not a document reload');
  assert.equal(m.theme, 'dark', 'ClientRouter must retain the dark theme');
  assert.equal(m.mainCount, 1, 'ClientRouter must not duplicate main');
  console.log('PASS Astro client navigation: no full reload, theme kept');
  await client.eval('localStorage.setItem("cs101:theme","light"); document.documentElement.dataset.theme="light"; document.documentElement.dataset.themePreference="light"');

  await client.resize(901, 800);
  await client.goto('/learn/SQL-001');
  m = await client.metrics();
  assert.equal(Math.round(m.sidebar), 248, '901px should use desktop layout');
  assert.ok(m.doc <= m.vw + 1, '901px horizontal overflow');
  await client.screenshot('lesson-desktop-901.png');

  // Real user journey: lesson stage tabs, unchanged evidence, Focus Mode,
  // contextual return to Curriculum. No server completion mutations.
  assert.equal(await client.eval('document.querySelectorAll(".lesson-stage-tab").length'), 3,
    'SQL-001 should offer three lesson stages');
  assert.deepEqual(await client.eval('["understand","practice","evidence"].map(s => document.querySelectorAll("#lesson-panel-"+s).length)'),
    [1,1,1], 'SQL-001 must have one tabpanel per stage');
  await client.eval('document.querySelector("#lesson-tab-practice").click()');
  await client.wait(async () => await client.eval('document.querySelector("#lesson-tab-practice").getAttribute("aria-selected") === "true"'), 'Practice stage');
  await client.eval('document.querySelector("#lesson-tab-evidence").click()');
  await client.wait(async () => await client.eval('getComputedStyle(document.querySelector("#lesson-panel-evidence")).display !== "none"'), 'Evidence stage visible');
  const evidenceExists = await client.eval('Boolean(document.querySelector(".lesson-staged-evidence-form"))');
  if (evidenceExists) {
    assert.notEqual(await client.eval('getComputedStyle(document.querySelector(".lesson-staged-evidence-form")).display'), 'none',
      'Already-active item must show the existing evidence form');
  } // Never force lesson activation simply to make a visual smoke test pass.
  await client.eval('document.querySelector(".lesson-focus-toggle").click()');
  await client.wait(async () => await client.eval('document.documentElement.dataset.focus === "true"'), 'Focus Mode');
  assert.equal(await client.eval('getComputedStyle(document.querySelector(".app-sidebar")).display'), 'none', 'Focus Mode sidebar must be hidden');
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await client.wait(async () => await client.eval('document.documentElement.dataset.focus !== "true"'), 'Focus Mode Escape');
  const contextualHref = await client.eval('document.querySelector(".sidebar-nav-link[aria-label=\\"Kurikulum\\"]").getAttribute("href")');
  assert.ok(contextualHref.includes('SQL-001'), 'Curriculum link should remember SQL-001: ' + contextualHref);
  await client.eval('document.querySelector(".sidebar-nav-link[aria-label=\\"Kurikulum\\"]").click()');
  await client.wait(async () => await client.eval('location.pathname === "/curriculum" && new URLSearchParams(location.search).get("item") === "SQL-001"'), 'Contextual return');
  await client.wait(async () => await client.eval('Boolean(document.querySelector(".item-id-standalone"))'), 'Curriculum preview hydrated');
  assert.equal(await client.eval('document.querySelector(".item-id-standalone").textContent'), 'SQL-001');
  console.log('PASS learning journey: Pahami/Latihan/Bukti, evidence, focus, context preservation');

  for (const id of ['SQL-002', 'JAV-001', 'JAV-002']) {
    await client.goto('/learn/' + id);
    assert.equal(await client.eval('document.querySelectorAll(".lesson-stage-tab").length'), 3, id + ' tabs');
    assert.deepEqual(await client.eval('["understand","practice","evidence"].map(s => document.querySelectorAll("#lesson-panel-"+s).length)'),
      [1,1,1], id + ' tabpanels');
    assert.equal(await client.eval('Boolean(document.querySelector(".lesson-sidecar"))'), false,
      id + ' must not have the legacy permanent sidecar');
  }
  console.log('PASS other authored lessons and manifest-only fallback parity');


  await client.resize(900, 800);
  await client.goto('/curriculum');
  m = await client.metrics();
  assert.equal(m.sidebarDisplay, 'none', '900px should use mobile drawer');
  assert.notEqual(m.triggerDisplay, 'none', 'Mobile menu button must be visible');
  const triggerBox = await client.eval('(() => { const b=document.querySelector(".sidebar-mobile-trigger"); const r=b.getBoundingClientRect(); return {top:r.top,left:r.left,position:getComputedStyle(b).position}; })()');
  assert.equal(triggerBox.position, 'fixed', 'Hamburger button must be fixed in the topbar');
  assert.ok(triggerBox.top >= 0 && triggerBox.top <= 12 && triggerBox.left >= 0 && triggerBox.left <= 12,
    'Hamburger must not drop below topbar: ' + JSON.stringify(triggerBox));
  assert.ok(m.doc <= m.vw + 1, '900px horizontal overflow');
  console.log('PASS responsive boundary 900/901');

  await client.resize(390, 844);
  await client.goto('/curriculum');
  await client.eval('document.querySelector(".sidebar-mobile-trigger").click()');
  await client.wait(async () => await client.eval('Boolean(document.querySelector(".sidebar-mobile-dialog"))'), 'drawer opening');
  m = await client.metrics();
  assert.ok(m.sheet.left >= -1 && m.sheet.left <= 1, 'Drawer should be left aligned: ' + JSON.stringify(m));
  assert.ok(m.sheet.width <= 295 && m.sheet.height >= 800, 'Drawer sizing mismatch: ' + JSON.stringify(m));
  await client.screenshot('curriculum-mobile-drawer-390.png');
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await client.wait(async () => !(await client.eval('Boolean(document.querySelector(".sidebar-mobile-dialog"))')), 'Escape closes drawer');
  await client.wait(async () => await client.eval('document.activeElement?.classList.contains("sidebar-mobile-trigger") === true'), 'focus restoration after drawer');
  console.log('PASS mobile 390 drawer dimensions, Escape and focus restoration');

  await client.eval('localStorage.setItem("cs101:theme","dark")');
  await client.goto('/progress');
  m = await client.metrics();
  assert.equal(m.theme, 'dark', 'Theme should survive full navigation');
  assert.equal(m.bodyBg, 'rgb(8, 8, 8)', 'Dark canvas should match Howlil token');
  await client.screenshot('progress-mobile-dark-390.png');
  console.log('PASS dark theme persistence and surface');

  await client.resize(320, 720);
  for (const route of ['/', '/curriculum', '/progress', '/learn/SQL-001',
    '/project/JAV-P01', '/integration/INT-001', '/review/SQL-001']) {
    await client.goto(route);
    m = await client.metrics();
    assert.ok(m.doc <= m.vw + 1 && m.body <= m.vw + 1,
      '320px document horizontal overflow at ' + route + ': ' + JSON.stringify(m));
    assert.equal(m.mainCount, 1, 'Duplicate main at ' + route);
  }
  await client.goto('/learn/SQL-001');
  await client.screenshot('lesson-mobile-320.png');
  await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await client.eval('matchMedia("(prefers-reduced-motion: reduce)").matches'), true,
    'Browser should honor reduced motion');
  const transition = await client.eval('getComputedStyle(document.querySelector(".topbar"), "::after").transitionDuration');
  assert.ok(transition === '0s' || transition === '', 'Navigation motion must be disabled under reduced motion: ' + transition);
  await client.send('Emulation.setEmulatedMedia', { features: [] });
  assert.equal(client.exceptions.length, 0, 'Browser runtime exceptions: ' + JSON.stringify(client.exceptions));
  console.log('PASS 320px route matrix: no document overflow, no nested main, zero runtime errors');
  console.log('PASS screenshots saved at ' + screenshotDir);
} finally {
  try { client?.ws.close(); } catch {}
  chrome?.kill('SIGTERM');
  await sleep(100);
  if (profile) await rm(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
}
