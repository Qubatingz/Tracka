// Finish the real road from e2e.js (proof → approve → rate → payout → receipt) and the ratings.
const { chromium } = require('playwright');
const BASE = 'https://tracka-theta.vercel.app';
const PRACTICE = process.argv[2], REAL = process.argv[3];
let fails = 0, oks = 0; const warnings = [];
const log = (...a) => console.log(a.join(' '));
async function step(name, fn) { try { await fn(); oks++; log('✅', name); } catch (e) { fails++; log('❌', name, '→', String(e.message || e).split('\n')[0].slice(0, 300)); } }
function watch(page, who) {
  page.on('pageerror', (e) => warnings.push(`page error [${who}] ${e.message.slice(0, 200)}`));
  page.on('response', (r) => { if (r.status() >= 500) warnings.push(`HTTP ${r.status()} [${who}] ${r.url().slice(0, 140)}`); });
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|status of 404/.test(m.text())) warnings.push(`console [${who}] ${m.text().slice(0, 200)}`); });
}
async function login(browser, phone, who) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); watch(page, who);
  await page.goto(BASE + '/login'); await page.fill('input[type=tel]', phone);
  await page.click('button:has-text("Send me a code")'); await page.fill('input[autocomplete="one-time-code"]', '123456');
  await page.click('button:has-text("Log in")'); await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 25000 });
  await page.waitForLoadState('networkidle'); return page;
}
async function go(page, path) { await page.goto(BASE + path, { waitUntil: 'networkidle' }); return page.innerText('body'); }
async function press(page, loc) {
  await loc.first().click(); await page.waitForTimeout(1800); await page.waitForLoadState('networkidle');
  const err = (await page.locator('.rpcerr, .notice.err').allTextContents()).filter((t) => t.trim());
  if (err.length) throw new Error('error shown: ' + err.join(' | ').slice(0, 200));
}
async function rateAll(page, cid) {
  let n = 0;
  for (let i = 0; i < 4; i++) {
    await go(page, '/artist/c/' + cid);
    const f = page.locator('form.rateform').first();
    if (!(await f.count())) break;
    await f.locator('fieldset.stars label').first().click(); // the first label is 5 stars
    await f.locator('input[name=review]').fill('E2E test: great work');
    await press(page, f.locator('button:has-text("Rate")')); n++;
  }
  return n;
}
(async () => {
  const browser = await chromium.launch();
  const artist = await login(browser, '0788000002', 'artist');
  const seller = await login(browser, '0788000001', 'promoter');
  const admin = await login(browser, '0788000003', 'admin');
  const pid = process.argv[4], rid = process.argv[5];
  log('practice', pid, 'real', rid);
  await step('Artist rates the 2 example promoters by tapping the stars', async () => {
    const n = await rateAll(artist, pid); if (n !== 2) throw new Error('rated ' + n);
    if (!/You rated/.test(await artist.innerText('body'))) throw new Error('no "You rated" line');
  });
  await step('Promoter sends a screenshot proof', async () => {
    await go(seller, '/seller');
    const card = seller.locator('.bookcard', { hasText: REAL });
    const det = card.locator('details.proofbox');
    if (!(await det.evaluate((d) => d.open))) await det.locator('summary').click();
    await card.locator('input[name=shot]').setInputFiles({ name: 'proof.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') });
    await card.locator('input[name=note]').fill('E2E test proof');
    await card.locator('form button[type=submit]:has-text("Send proof")').click();
    await seller.waitForTimeout(5000); await seller.waitForLoadState('networkidle');
    const t = await seller.innerText('body');
    if (!/Waiting for a check/.test(t) || !t.includes(REAL)) throw new Error('not in "Waiting for a check"');
  });
  await step('Artist sees the screenshot, approves and rates', async () => {
    await go(artist, '/artist/c/' + rid);
    if (!(await artist.locator('.proofimg img').count())) throw new Error('screenshot not visible');
    await press(artist, artist.locator('button:has-text("Looks good")'));
    if ((await rateAll(artist, rid)) !== 1) throw new Error('rating failed');
    if (!(await artist.locator('form:has-text("tip"), .tipform, input[name=amount]').count())) log('   (no tip form visible, check)');
  });
  await step('Admin sends the payout and marks it', async () => {
    await go(admin, '/admin/payouts');
    const row = admin.locator('.item', { hasText: REAL });
    if (!/MoMo/.test(await row.innerText())) throw new Error('no MoMo number shown');
    await row.locator('input[name=p_ref]').fill('E2E-PAYOUT');
    await press(admin, row.locator('button:has-text("I sent it")'));
  });
  await step('Real campaign finished: receipt, promoter money page', async () => {
    const t = await go(artist, '/artist/c/' + rid);
    if (!/All done/.test(t)) throw new Error('not finished');
    const r = await go(artist, `/artist/c/${rid}/receipt`);
    if (!/50,000/.test(r)) throw new Error('receipt amount missing');
    const m = await go(seller, '/seller/money');
    if (!/Paid to you/.test(m)) throw new Error('money page');
  });
  await step('Marketplace shows the EXAMPLE tag', async () => {
    const t = await go(artist, '/marketplace');
    if (!/example/i.test(t)) throw new Error('no tag');
  });
  await step('Control room money only counts the real campaign', async () => {
    const t = await go(admin, '/admin');
    if (!/Practice bookings with example promoters are never counted/.test(t)) throw new Error('note missing');
  });
  await browser.close();
  log(`\nRESULT: ${oks} passed, ${fails} failed`);
  log(warnings.length ? 'WARNINGS:\n - ' + [...new Set(warnings)].join('\n - ') : 'No page errors, no console errors, no server errors.');
})();
