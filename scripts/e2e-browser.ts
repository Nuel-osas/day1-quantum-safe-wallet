// Clicks through the whole Q-Wallet flow in headless Chrome against real devnet.
//   APP_URL=http://localhost:5292 pnpm e2e      (or the Vercel URL)
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const APP = process.env.APP_URL ?? 'http://localhost:5292';
const SHOTS = process.env.SHOTS ?? new URL('./.shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1100 });
page.on('console', (m) => m.type() === 'error' && console.log('  [console]', m.text().slice(0, 200)));

const text = (sel: string) => page.$eval(sel, (e) => (e as HTMLElement).innerText.trim());
async function idle() {
	await page.waitForFunction(() => !document.querySelector('[data-testid=busy]'), { timeout: 120_000 });
	const err = await page.$('[data-testid=error]');
	if (err) throw new Error('app error: ' + (await text('[data-testid=error]')));
}
const enabled = (id: string) =>
	page.waitForFunction((id) => { const b = document.querySelector(`[data-testid=${id}]`) as HTMLButtonElement | null; return !!b && !b.disabled; }, { timeout: 90_000, polling: 1500 }, id);
async function click(id: string, label: string) {
	await enabled(id);
	const before = (await page.$$('[data-testid=digest]')).length;
	await page.click(`[data-testid=${id}]`);
	await idle();
	const after = await page.$$eval('[data-testid=digest]', (els) => els.map((e) => e.textContent));
	const digest = after.length > before ? after[0] : null;
	console.log(`  ${label}: ${digest}`);
	return digest;
}

await page.goto(APP, { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await page.waitForFunction(() => document.querySelector('[data-testid=flags]')?.textContent?.includes('protocol'), { timeout: 30_000 });
console.log('flags:', (await text('[data-testid=flags]')).replace(/\s+/g, ' '));
await page.screenshot({ path: `${SHOTS}onboarding.png`, fullPage: true });

await page.click('[data-testid=create]');
await page.waitForSelector('[data-testid=classic]');
const X = await text('[data-testid=classic]');
const Q = await text('[data-testid=quantum]');
console.log('classic', X, '\nquantum', Q);

await page.click('[data-testid=fund-classic]');
await idle();
const steps: Record<string, string | null> = {};
steps.fundQuantum = await click('fund-quantum', 'fund quantum key (classic signs)');
steps.pqSend = await click('send-pq', 'send with ML-DSA-65');
console.log('  sizes:', (await text('[data-testid=sizes]')).replace(/\s+/g, ' '));
steps.enable = await click('enable', 'turn on aliases (classic signs)');
steps.addQ = await click('add-q', 'add quantum key as alias (classic signs)');
steps.sendAsX = await click('send-as-x', 'send as classic account (quantum signs)');
steps.retire = await click('retire', 'retire classic key (quantum signs)');
await enabled('prove');
await page.click('[data-testid=prove]');
await idle();
await page.waitForSelector('[data-testid=proof]');
const proof = await text('[data-testid=proof]');
console.log('  proof:', proof.slice(0, 200));
const aliases = await page.$$eval('[data-testid=aliases] code', (els) => els.map((e) => e.textContent));
console.log('  aliases now:', aliases);
await page.screenshot({ path: `${SHOTS}final.png`, fullPage: true });

const ok = proof.includes('Old key refused') && aliases.length === 1 && aliases[0] === Q;
writeFileSync(new URL('./.e2e-result.json', import.meta.url), JSON.stringify({ app: APP, X, Q, steps, proof, aliases, ok }, null, 2));
console.log(ok ? 'PASS' : 'FAIL');
await browser.close();
if (!ok) process.exit(1);
