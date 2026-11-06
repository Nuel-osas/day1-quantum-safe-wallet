// POST { address } -> one devnet faucet request. The public devnet faucet sends no CORS headers,
// so the browser cannot call it directly. No keys here: this only forwards to Sui's faucet.
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { isValidSuiAddress, normalizeSuiAddress } from '@mysten/sui/utils';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function POST(req: Request) {
	try {
		const { address } = (await req.json()) as { address?: string };
		if (!address || !isValidSuiAddress(normalizeSuiAddress(address))) return json({ error: 'bad address' }, 400);
		await requestSuiFromFaucetV2({ host: getFaucetHost('devnet'), recipient: normalizeSuiAddress(address) });
		return json({ ok: true });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return json({ error: /429|Too Many/i.test(msg) ? 'The devnet faucet is rate limiting this server. Wait a minute or use faucet.sui.io.' : msg }, 502);
	}
}
