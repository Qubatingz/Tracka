// Tracka live end-to-end test: artist (0788000002), promoter QUBATINGZ (0788000001), admin (0788000003).
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = 'https://tracka-theta.vercel.app';
const UMUCYO = 'c9fd6fa0-485d-5209-b804-388625862391';
const STAMP = new Date().toISOString().slice(5, 16).replace('T', ' ');
const PRACTICE = `E2E Practice ${STAMP}`;
const REAL = `E2E Real ${STAMP}`;
fs.mkdirSync('shots', { recursive: true });
let fails = 0, oks = 0;
const log = (...a) => console.log(a.join(' '));
const warnings = [];
async function step(name, fn) {
  try { await fn(); oks++; log('✅', name); }
  catch (e) { fails++; log('❌', name, '→', String(e.message || e).split('\n')[0].slice(0, 300)); }
}
function watch(page, who) {
  page.on('pageerror', (e) => warnings.push(`page error [${who}] ${page.url()} :: ${e.message.slice(0, 200)}`));
  page.on('response', (r) => { if (r.status() >= 500) warnings.push(`HTTP ${r.status()} [${who}] ${r.url().slice(0, 140)}`); });
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|status of 404/.test(m.text())) warnings.push(`console [${who}] ${page.url()} :: ${m.text().slice(0, 200)}`); });
}
async function shot(page, name) { try { await page.screenshot({ path: `shots/${name}.png`, fullPage: true }); } catch {} }
async function login(browser, phone, who) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  watch(page, who);
  await page.goto(BASE + '/login');
  await page.fill('input[type=tel]', phone);
  await page.click('button:has-text("Send me a code")');
  await page.fill('input[autocomplete="one-time-code"]', '123456');
  await page.click('button:has-text("Log in")');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 25000 });
  await page.waitForLoadState('networkidle');
  return page;
}
async function go(page, path) {
  const r = await page.goto(BASE + path, { waitUntil: 'networkidle' });
  const body = await page.innerText('body');
  if (!r || r.status() >= 400) throw new Error(`${path} returned ${r && r.status()}`);
  if (/Application error|Internal Server Error|This page could not be found|a server-side exception/i.test(body)) throw new Error(`${path} shows an error page`);
  return body;
}
// click an RpcButton/RpcForm and wait for the server refresh to finish
async function press(page, locator) {
  await locator.first().click();
  await page.waitForTimeout(1500);
  await page.waitForLoadState('networkidle');
  const err = await page.locator('.rpcerr, .notice.err').allTextContents();
  if (err.filter((t) => t.trim()).length) throw new Error('error shown: ' + err.join(' | ').slice(0, 200));
}
function wav() { // 1 second of silence
  const n = 8000, b = Buffer.alloc(44 + n);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24); b.writeUInt32LE(8000, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40); b.fill(128, 44);
  return b;
}
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

async function newCampaign(page, title) {
  await go(page, '/artist/new');
  await page.fill('input[name=title]', title);
  await page.setInputFiles('input[name=file]', { name: 'e2e-song.wav', mimeType: 'audio/wav', buffer: wav() });
  await page.click('button:has-text("Next: pick promoters")');
  await page.waitForURL(/\/artist\/c\/[0-9a-f-]{36}$/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  return page.url().split('/').pop();
}

(async () => {
  const browser = await chromium.launch();
  // ---------- 1. Public pages ----------
  const anon = await (await browser.newContext()).newPage();
  watch(anon, 'visitor');
  await step('Home page loads with "Hot on Tracka" chart', async () => {
    const t = await go(anon, '/');
    if (!/Hot on Tracka/.test(t) || !/Sunday Morning/.test(t)) throw new Error('chart missing');
    await shot(anon, '01-home');
  });
  await step('Marketplace shows example promoters with levels', async () => {
    const t = await go(anon, '/marketplace');
    for (const w of ['Umucyo Wave Radio', 'DJ Ikirere', 'Example', 'Top Promoter']) if (!t.includes(w)) throw new Error('missing ' + w);
    await shot(anon, '02-marketplace');
  });
  await step('Example promoter profile: packages, level, practice button', async () => {
    const t = await go(anon, '/p/' + UMUCYO);
    for (const w of ['Packages', '3 plays', 'Top Promoter', 'Try a practice booking', 'Reviews']) if (!t.includes(w)) throw new Error('missing ' + w);
    await shot(anon, '03-profile');
  });
  for (const p of ['/how', '/terms', '/sell', '/login']) await step(`Page ${p} loads`, async () => { await go(anon, p); });

  // ---------- 2. Log in the three people ----------
  let artist, seller, admin;
  await step('Artist logs in with 0788 000 002', async () => { artist = await login(browser, '0788000002', 'artist'); });
  await step('Promoter logs in with 0788 000 001', async () => { seller = await login(browser, '0788000001', 'promoter'); });
  await step('Admin logs in with 0788 000 003', async () => { admin = await login(browser, '0788000003', 'admin'); });
  if (!artist || !seller || !admin) { log('Stopping: login failed'); await browser.close(); process.exit(1); }

  // ---------- 3. Practice road ----------
  let pid;
  await step('Artist creates a campaign with a song upload', async () => { pid = await newCampaign(artist, PRACTICE); });
  await step('Artist picks Umucyo Wave Radio: 3-play package + 3 dates', async () => {
    await artist.click('button.pchead:has-text("Umucyo Wave Radio")');
    await artist.click('.dpanel .pack:has-text("3 plays")');
    const days = artist.locator('.dpanel button.cd.free');
    for (let i = 0; i < 3; i++) await days.nth(i).click();
    const label = await artist.textContent('.dfoot .btn-yellow');
    if (!/3 dates/.test(label)) throw new Error('button says: ' + label);
    await press(artist, artist.locator('.dfoot .btn-yellow'));
    const card = await artist.textContent('.pickcard.on');
    if (!/Umucyo/.test(card) || !/3 plays/.test(card)) throw new Error('card not added: ' + card.slice(0, 120));
  });
  await step('Artist adds DJ Ikirere; practice banner shows; real promoters say "Real only"', async () => {
    await press(artist, artist.locator('.pickcard:has-text("DJ Ikirere") button[aria-pressed="false"]'));
    if (!(await artist.locator('.practicebar').count())) throw new Error('no practice banner');
    const t = await artist.textContent('.pickcard:has-text("QUBATINGZ")');
    if (!/Real only/.test(t)) throw new Error('real promoter not marked');
    await shot(artist, '04-picker-practice');
  });
  await step('Pay page shows practice run, artist starts it', async () => {
    await artist.click('a:has-text("Next: pay")');
    await artist.waitForURL(/\/pay$/);
    const t = await artist.innerText('body');
    if (!/Practice run/.test(t) || !/No money needed/.test(t)) throw new Error('not practice');
    await shot(artist, '05-pay-practice');
    await artist.click('button:has-text("Start the practice road")');
    await artist.waitForURL(new RegExp(pid + '$'), { timeout: 20000 });
    await artist.waitForLoadState('networkidle');
    if (!/Checking your payment/.test(await artist.innerText('body'))) throw new Error('tracker not showing payment check');
  });
  await step('Admin confirms the practice payment', async () => {
    await go(admin, '/admin/payments');
    const row = admin.locator('.item', { hasText: PRACTICE });
    if (!/Practice: no money/.test(await row.textContent())) throw new Error('not labeled practice');
    await press(admin, row.locator('button:has-text("Confirm practice")'));
  });
  await step('Admin listens and approves the song', async () => {
    await go(admin, '/admin/songs');
    const card = admin.locator('.subcard', { hasText: PRACTICE });
    await press(admin, card.locator('button:has-text("Approve song")'));
  });
  await step('Admin plays the example promoters: accept → dates → live → proof', async () => {
    for (let i = 0; i < 6; i++) {
      await go(admin, '/admin/practice');
      const sec = admin.locator('section.panel', { hasText: PRACTICE });
      if (!(await sec.count())) break;
      if (i === 0) await shot(admin, '06-admin-practice');
      await press(admin, sec.locator('button:has-text("Move all")'));
    }
    await go(admin, '/admin/practice');
    if (await admin.locator('section.panel', { hasText: PRACTICE }).count()) throw new Error('still waiting after 6 moves');
  });
  await step('Artist sees both proofs and approves them', async () => {
    await go(artist, '/artist/c/' + pid);
    const n = await artist.locator('button:has-text("Looks good")').count();
    if (n !== 2) throw new Error(`expected 2 approve buttons, saw ${n}`);
    for (let i = 0; i < 2; i++) await press(artist, artist.locator('button:has-text("Looks good")'));
  });
  await step('Artist rates both; tips are hidden for examples', async () => {
    for (let i = 0; i < 2; i++) {
      const f = artist.locator('form:has(button:has-text("Rate"))').first();
      await f.locator('input[aria-label="5 stars"]').check({ force: true });
      await f.locator('input[name=review]').fill('E2E test: smooth practice run');
      await press(artist, f.locator('button:has-text("Rate")'));
    }
    if (!/Tips go to real promoters only/.test(await artist.innerText('body'))) throw new Error('tip note missing');
  });
  await step('Admin marks practice payouts (nothing to send)', async () => {
    for (let i = 0; i < 2; i++) {
      await go(admin, '/admin/payouts');
      await press(admin, admin.locator('.item', { hasText: PRACTICE }).locator('button:has-text("Mark practice paid")'));
    }
  });
  await step('Practice campaign is done: map, result card and receipt work', async () => {
    const t = await go(artist, '/artist/c/' + pid);
    if (!/All done/.test(t)) throw new Error('not finished');
    if (!(await artist.locator('.mapbox svg.rwmap').count())) throw new Error('no map');
    await artist.click('button:has-text("Make my result card")');
    await artist.waitForSelector('img.rprev', { timeout: 15000 });
    await shot(artist, '07-practice-done');
    const r = await go(artist, `/artist/c/${pid}/receipt`);
    if (!/Receipt/.test(r)) throw new Error('receipt broken');
  });

  // ---------- 4. Real road with the real promoter ----------
  let rid;
  await step('Artist creates a real campaign and books QUBATINGZ for one date', async () => {
    rid = await newCampaign(artist, REAL);
    await artist.click('button.pchead:has-text("QUBATINGZ")');
    await artist.locator('.dpanel button.cd.free').first().click();
    await press(artist, artist.locator('.dfoot .btn-yellow'));
    if (!(await artist.locator('.pickcard.on:has-text("QUBATINGZ")').count())) throw new Error('not added');
    const ex = await artist.textContent('.pickcard:has-text("Umucyo Wave Radio")');
    if (!/Practice only/.test(ex)) throw new Error('example not marked practice-only in a real campaign');
  });
  await step('Artist pays with MoMo details', async () => {
    await go(artist, `/artist/c/${rid}/pay`);
    await artist.fill('input[name=txn]', 'E2E-TEST');
    await artist.fill('input[name=phone]', '0788000002');
    await artist.click('button:has-text("I\'ve paid")');
    await artist.waitForURL(new RegExp(rid + '$'), { timeout: 20000 });
  });
  await step('Admin: money received + song approved', async () => {
    await go(admin, '/admin/payments');
    await press(admin, admin.locator('.item', { hasText: REAL }).locator('button:has-text("Money received")'));
    await go(admin, '/admin/songs');
    await press(admin, admin.locator('.subcard', { hasText: REAL }).locator('button:has-text("Approve song")'));
  });
  await step('Promoter accepts, schedules and goes live', async () => {
    await go(seller, '/seller');
    const card = () => seller.locator('.bookcard', { hasText: REAL });
    await shot(seller, '08-seller-booking');
    await press(seller, card().locator('button:has-text("Accept")'));
    await press(seller, card().locator('button:has-text("Schedule")'));
    await press(seller, card().locator('button:has-text("It\'s live")'));
  });
  await step('Promoter sends a screenshot as proof', async () => {
    const card = seller.locator('.bookcard', { hasText: REAL });
    const det = card.locator('details:has(summary:has-text("Send proof"))');
    if (await det.count() && !(await det.getAttribute('open'))) await det.locator('summary').click();
    await card.locator('input[name=shot]').setInputFiles({ name: 'proof.png', mimeType: 'image/png', buffer: PNG });
    await card.locator('input[name=note]').fill('E2E test proof');
    await card.locator('button:has-text("Send proof")').last().click();
    await seller.waitForTimeout(4000);
    await seller.waitForLoadState('networkidle');
    if (!/Proof sent|Waiting for a check/.test(await seller.innerText('body'))) throw new Error('proof not shown as sent');
  });
  await step('Artist approves and rates the real promoter', async () => {
    await go(artist, '/artist/c/' + rid);
    await press(artist, artist.locator('button:has-text("Looks good")'));
    const f = artist.locator('form:has(button:has-text("Rate"))').first();
    await f.locator('input[aria-label="5 stars"]').check({ force: true });
    await press(artist, f.locator('button:has-text("Rate")'));
  });
  await step('Admin pays the promoter on MoMo and marks it', async () => {
    await go(admin, '/admin/payouts');
    const row = admin.locator('.item', { hasText: REAL });
    await row.locator('input[name=p_ref]').fill('E2E-PAYOUT');
    await press(admin, row.locator('button:has-text("I sent it")'));
    const t = await go(artist, `/artist/c/${rid}/receipt`);
    if (!/E2E-TEST|Receipt/.test(t)) throw new Error('receipt broken');
    await shot(artist, '09-real-receipt');
  });

  // ---------- 5. Every other page ----------
  for (const p of ['/artist', '/artist/settings', '/notifications', '/me']) await step(`Artist page ${p} loads`, async () => { await go(artist, p); });
  for (const p of ['/seller', '/seller/calendar', '/seller/profile', '/seller/money']) await step(`Promoter page ${p} loads`, async () => { await go(seller, p); });
  for (const p of ['/admin', '/admin/promoters', '/admin/payments', '/admin/songs', '/admin/proofs', '/admin/payouts', '/admin/practice', '/admin/settings'])
    await step(`Admin page ${p} loads`, async () => { await go(admin, p); });
  await step('Promoter profile shows a packages editor and level card', async () => {
    const t = await go(seller, '/seller/profile');
    if (!/Packages \(optional\)/.test(t)) throw new Error('no packages editor');
    if (!/Next level|Top Promoter/.test(t)) throw new Error('no level card');
  });
  await step('Phone layout: home and picker fit a 390px screen', async () => {
    const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
    watch(m, 'phone');
    await go(m, '/');
    const w = await m.evaluate(() => document.documentElement.scrollWidth);
    await shot(m, '10-phone-home');
    if (w > 395) throw new Error('page is wider than the phone: ' + w + 'px');
  });

  await browser.close();
  log('');
  log(`RESULT: ${oks} passed, ${fails} failed`);
  if (warnings.length) { log('WARNINGS:'); for (const w of [...new Set(warnings)].slice(0, 40)) log(' -', w); } else log('No page errors, no console errors, no server errors.');
  log('campaigns:', PRACTICE, '|', REAL);
})();
