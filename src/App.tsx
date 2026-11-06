import { useCallback, useEffect, useState } from 'react';
import type { Keypair } from '@mysten/sui/cryptography';
import { isValidSuiAddress, normalizeSuiAddress } from '@mysten/sui/utils';
import {
	acctLink, aliasAdd, aliasEnable, aliasRemove, fromMist, readAliasState, readPqFlags, signAndRun, suiBalance, toMist, txLink,
	type AliasState, type Flag, type Sent,
} from './lib/sui';
import { fromSecret, keysFrom, newPhrase, store, type Keys } from './lib/keys';

const short = (a: string) => `${a.slice(0, 8)}...${a.slice(-6)}`;
const REPO = 'https://github.com/Nuel-osas/day1-quantum-safe-wallet';
type Log = { label: string; digest: string; ok: boolean; bytes: number };
type Guard = (label: string, fn: () => Promise<void>) => Promise<void>;

async function faucet(address: string) {
	const r = await fetch('/api/faucet', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address }) });
	const j = await r.json().catch(() => ({}));
	if (!r.ok || j.error) throw new Error(j.error ?? `Faucet failed (${r.status})`);
}

export default function App() {
	const [keys, setKeys] = useState<Keys | null>(() => {
		const s = store.load();
		try { return s ? keysFrom(s) : null; } catch { return null; }
	});
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [log, setLog] = useState<Log[]>([]);

	const guard: Guard = useCallback(async (label, fn) => {
		setBusy(label);
		setError(null);
		try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
	}, []);
	const record = (label: string, s: Sent) => setLog((l) => [{ label, digest: s.digest, ok: s.ok, bytes: s.signatureBytes }, ...l]);

	return (
		<div className="page">
			<header className="top">
				<div className="brand"><img src="/favicon.svg" alt="" /> Q-Wallet</div>
				<span className="net"><span className="dot" /> Sui devnet</span>
			</header>
			{error && (
				<div className="banner" data-testid="error">
					<div><span className="eyebrow">[ Something failed ]</span>{error}</div>
					<button className="icon" onClick={() => setError(null)}>Dismiss</button>
				</div>
			)}
			{!keys ? <Onboarding guard={guard} setKeys={setKeys} /> : <Wallet keys={keys} guard={guard} record={record} log={log} setKeys={setKeys} />}
			<footer className="foot">
				<span>SuiHub Lagos · Day 1 · ML-DSA-65 + address aliases · devnet</span>
				<a href={REPO} target="_blank">Source</a>
			</footer>
			{busy && <div className="toast" data-testid="busy"><span className="spin" />{busy}...</div>}
		</div>
	);
}

function NetworkCheck() {
	const [flags, setFlags] = useState<Flag[] | null>(null);
	useEffect(() => { readPqFlags().then(setFlags); }, []);
	return (
		<section className="card">
			<span className="eyebrow">[ Live network check ]</span>
			<h2>Is post-quantum signing switched on?</h2>
			<p className="lede">Read now from each network's protocol config: the <code>mldsa65_auth</code> flag.</p>
			<div className="flags mt" data-testid="flags">
				{(flags ?? [{ network: 'devnet' }, { network: 'testnet' }, { network: 'mainnet' }] as Flag[]).map((f) => (
					<div key={f.network} className={f.mldsa ? 'on' : ''}>
						<span className="n">{f.network.toUpperCase()}</span>
						<strong>{f.mldsa == null ? (flags ? 'unknown' : '...') : f.mldsa ? 'On' : 'Off'}</strong>
						<span className="hint">{f.protocol ? `protocol ${f.protocol}` : ''}</span>
					</div>
				))}
			</div>
		</section>
	);
}

function Onboarding({ guard, setKeys }: { guard: Guard; setKeys: (k: Keys) => void }) {
	const [phrase, setPhrase] = useState('');
	const [secret, setSecret] = useState('');
	const start = (mnemonic: string, importedClassic?: string) => {
		const k = keysFrom({ mnemonic, importedClassic });
		store.save({ mnemonic: k.mnemonic, importedClassic });
		setKeys(k);
	};
	return (
		<div className="grid">
			<section className="card hero full">
				<span className="eyebrow">[ Quantum-safe Sui ]</span>
				<h1 className="headline mt">Same address.<span className="soft">A key quantum computers can't forge.</span></h1>
				<p className="lede">One seed phrase gives you today's Ed25519 key and an ML-DSA-65 post-quantum key. Send with the new key, then move your existing account onto it without changing its address.</p>
				<div className="hero-actions">
					<button className="lg" data-testid="create" onClick={() => guard('Creating keys', async () => start(newPhrase()))}>Create a new wallet</button>
				</div>
				<div className="steps">
					<div><span className="n">01</span><h3>Two keys, one phrase</h3><p>Ed25519 at m/44'/784', ML-DSA-65 at m/94'/784'.</p></div>
					<div><span className="n">02</span><h3>Send post-quantum</h3><p>A 5,262-byte signature the chain verifies today, on devnet.</p></div>
					<div><span className="n">03</span><h3>Upgrade in place</h3><p>Add the new key as an alias, retire the old one. Same address.</p></div>
				</div>
			</section>
			<section className="card">
				<span className="eyebrow">[ Restore ]</span>
				<h2>From a seed phrase</h2>
				<label className="field"><span>12 or 24 words</span>
					<input className="mono" data-testid="phrase" value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="word word word ..." />
				</label>
				<div className="row mt-s"><button className="ghost" disabled={!phrase} onClick={() => guard('Restoring', async () => start(phrase))}>Restore</button></div>
			</section>
			<section className="card">
				<span className="eyebrow">[ Bring your own account ]</span>
				<h2>Upgrade an existing devnet key</h2>
				<p className="lede">Paste a <code>suiprivkey</code> from the CLI (<code>sui keytool export</code>). A fresh phrase is made for the quantum-safe key. Devnet only: never paste a real key.</p>
				<label className="field"><span>Classic secret key</span>
					<input className="mono" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="suiprivkey1..." />
				</label>
				<div className="row mt-s"><button className="ghost" disabled={!secret} onClick={() => guard('Importing', async () => { fromSecret(secret); start(newPhrase(), secret.trim()); })}>Import and continue</button></div>
			</section>
			<div className="full"><NetworkCheck /></div>
		</div>
	);
}

function Wallet({ keys, guard, record, log, setKeys }: { keys: Keys; guard: Guard; record: (l: string, s: Sent) => void; log: Log[]; setKeys: (k: Keys | null) => void }) {
	const X = keys.classic.toSuiAddress();
	const Q = keys.quantum.toSuiAddress();
	const [bal, setBal] = useState<{ x: bigint | null; q: bigint | null }>({ x: null, q: null });
	const [aliases, setAliases] = useState<AliasState | null>(null);
	const [to, setTo] = useState('');
	const [amount, setAmount] = useState('0.001');
	const [showPhrase, setShowPhrase] = useState(false);
	const [proof, setProof] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		const [x, q, a] = await Promise.all([suiBalance(X).catch(() => null), suiBalance(Q).catch(() => null), readAliasState(X)]);
		setBal({ x, q });
		setAliases(a);
	}, [X, Q]);
	useEffect(() => { refresh().catch(() => {}); }, [refresh]);
	const later = () => setTimeout(() => refresh().catch(() => {}), 1500);

	const run = async (label: string, sender: string, signer: Keypair, build: Parameters<typeof signAndRun>[2]) => {
		const s = await signAndRun(sender, signer, build);
		record(label, s);
		later();
		if (!s.ok) throw new Error(`${label} failed: ${s.error}`);
		return s;
	};

	const enabled = !!aliases?.enabled;
	const hasQ = !!aliases?.aliases.includes(Q);
	const classicRetired = enabled && !aliases!.aliases.includes(X);
	const sentAsX = log.some((l) => l.label.startsWith('Send as classic account') && l.ok);
	const steps = [
		{ label: 'Aliases on', done: enabled },
		{ label: 'Quantum key added', done: hasQ || classicRetired },
		{ label: 'Sent as the account', done: sentAsX || classicRetired },
		{ label: 'Classic key retired', done: classicRetired },
	];
	const pqSends = log.filter((l) => l.ok && l.bytes > 1000);
	const lastPq = pqSends[0]?.bytes ?? 5262;

	return (
		<div className="grid">
			<div className="stack">
				<section className="card balance">
					<div className="card-head" style={{ marginBottom: 0 }}>
						<span className="eyebrow">[ Your keys ]</span>
						<button className="icon" onClick={() => refresh()}>Refresh</button>
					</div>
					<ul className="keys mt">
						<li>
							<span className="kicon">01</span>
							<div className="kbody">
								<a className="mono" data-testid="classic" href={acctLink(X)} target="_blank" title={X}>{X}</a>
								<div className="tags">
									<span className="tag plain">{keys.classic.getKeyScheme()} · classic</span>
									<span className="tag plain">{fromMist(bal.x ?? 0n)} SUI</span>
									{classicRetired && <span className="tag warn">key retired</span>}
								</div>
							</div>
							<button className="icon" data-testid="fund-classic" onClick={() => guard('Asking the devnet faucet', async () => { await faucet(X); setTimeout(() => refresh(), 4000); })}>Faucet</button>
						</li>
						<li className="me">
							<span className="kicon">Q</span>
							<div className="kbody">
								<a className="mono" data-testid="quantum" href={acctLink(Q)} target="_blank" title={Q}>{Q}</a>
								<div className="tags">
									<span className="tag">ML-DSA-65 · quantum-safe</span>
									<span className="tag plain">{fromMist(bal.q ?? 0n)} SUI</span>
								</div>
							</div>
							<button className="icon" data-testid="fund-quantum" disabled={!bal.x || classicRetired} title="Send 0.05 SUI from the classic account" onClick={() => guard('Funding the quantum key from the classic account', async () => {
								await run('Fund quantum key (classic signs)', X, keys.classic, (tx) => tx.transferObjects([tx.splitCoins(tx.gas, [50_000_000])], Q));
							})}>Fund</button>
						</li>
					</ul>
					<div className="row mt">
						<button className="chip" onClick={() => setShowPhrase((v) => !v)}>{showPhrase ? 'Hide' : 'Show'} seed phrase</button>
						<button className="chip" onClick={() => { store.clear(); setKeys(null); }}>Sign out</button>
					</div>
					{showPhrase && <div className="secret">Devnet only. Both keys come from this phrase{keys.imported ? ' (the classic key was imported separately)' : ''}.<code data-testid="mnemonic">{keys.mnemonic}</code></div>}
				</section>

				<section className="card">
					<div className="card-head">
						<span className="eyebrow">[ 01 / Send with a quantum-safe key ]</span>
						<span className="tag">ML-DSA-65</span>
					</div>
					<div className="amount">
						<input data-testid="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" />
						<span className="sym">SUI</span>
					</div>
					<label className="field"><span>Recipient (empty = your classic address)</span>
						<input className="mono" data-testid="to" value={to} onChange={(e) => setTo(e.target.value)} placeholder={X} />
					</label>
					<div className="row mt">
						<button className="lg" data-testid="send-pq" disabled={!bal.q} onClick={() => guard('Signing with ML-DSA-65', async () => {
							const dest = to ? normalizeSuiAddress(to) : X;
							if (!isValidSuiAddress(dest)) throw new Error('That is not a Sui address');
							await run(`Send ${amount} SUI (quantum key)`, Q, keys.quantum, (tx) => tx.transferObjects([tx.splitCoins(tx.gas, [toMist(amount)])], dest));
						})}>Sign and send</button>
					</div>
					<div className="sizes mt" data-testid="sizes">
						<div><span className="n">Ed25519 signature on chain</span><div className="bar"><i style={{ width: `${(97 / lastPq) * 100}%` }} /></div><b>97 B</b></div>
						<div><span className="n">ML-DSA-65 signature on chain</span><div className="bar pq"><i style={{ width: '100%' }} /></div><b>{lastPq.toLocaleString()} B</b></div>
					</div>
					<p className="hint mt-s">Flag + signature + public key, as sent to validators. ML-DSA-65: 3,309-byte signature and 1,952-byte public key, against 64 and 32 for Ed25519.</p>
				</section>

				<section className="card">
					<div className="card-head" style={{ marginBottom: 14 }}>
						<span className="eyebrow">[ Activity ]</span>
						<span className="count">{log.length} this session</span>
					</div>
					{log.length ? (
						<ul className="log" data-testid="log">
							{log.map((l) => (
								<li key={l.digest}>
									<span className="pip" style={l.ok ? undefined : { background: 'var(--danger)' }} />
									<span className="what">{l.label}{!l.ok && ' (failed)'} · {l.bytes.toLocaleString()} B sig</span>
									<a href={txLink(l.digest)} target="_blank" data-testid="digest" title={l.digest}>{l.digest}</a>
								</li>
							))}
						</ul>
					) : <p className="empty">Every transaction shows up here with its signature size and an explorer link.</p>}
				</section>
			</div>

			<div className="stack">
				<section className="card">
					<span className="eyebrow">[ 02 / Upgrade the classic account ]</span>
					<h2>Move {short(X)} onto the quantum-safe key</h2>
					<p className="lede">Address aliases let another key sign for an address. Add the ML-DSA key, sign as the account with it, then remove the classic key. The address, balance and objects never move.</p>
					<div className="progress mt">
						{steps.map((s, i) => (
							<div key={s.label} className={s.done ? 'done' : ''}>
								<span className="n">{String(i + 1).padStart(2, '0')}{s.done && <span className="check"> ✓</span>}</span>
								<p>{s.label}</p>
							</div>
						))}
					</div>
					<ul className="keys mt" data-testid="aliases">
						{aliases?.aliases.map((a) => (
							<li key={a} className={a === Q ? 'me' : ''}>
								<span className="kicon">{a === Q ? 'Q' : a === X ? '01' : '?'}</span>
								<div className="kbody"><code title={a}>{a}</code>
									<div className="tags">{a === X && <span className="tag plain">classic key</span>}{a === Q && <span className="tag">quantum-safe</span>}</div>
								</div>
							</li>
						))}
					</ul>
					<div className="actions mt">
						<button data-testid="enable" disabled={enabled || !bal.x} onClick={() => guard('Turning on aliases (classic key signs)', async () => {
							await run('Turn on aliases (classic signs)', X, keys.classic, (tx) => aliasEnable(tx));
						})}>1. Turn on aliases</button>
						<button data-testid="add-q" disabled={!enabled || hasQ || classicRetired} onClick={() => guard('Adding the quantum-safe key (classic key signs)', async () => {
							await run('Add quantum key as alias (classic signs)', X, keys.classic, (tx) => aliasAdd(tx, aliases!.objectId, Q));
						})}>2. Add quantum-safe key</button>
						<button data-testid="send-as-x" disabled={!hasQ} onClick={() => guard('Signing as the classic account with ML-DSA-65', async () => {
							await run('Send as classic account (quantum key signs)', X, keys.quantum, (tx) => tx.transferObjects([tx.splitCoins(tx.gas, [1_000_000])], Q));
						})}>3. Send as the account with the quantum key</button>
						<button className="danger" data-testid="retire" disabled={!hasQ || classicRetired} onClick={() => guard('Retiring the classic key (quantum key signs)', async () => {
							await run('Retire classic key (quantum key signs)', X, keys.quantum, (tx) => aliasRemove(tx, aliases!.objectId, X));
						})}>4. Retire the classic key</button>
						<button className="ghost" data-testid="prove" disabled={!classicRetired} onClick={() => guard('Trying the retired classic key', async () => {
							try {
								const s = await signAndRun(X, keys.classic, (tx) => tx.transferObjects([tx.splitCoins(tx.gas, [1_000])], X));
								record('Classic key after retirement', s);
								setProof(s.ok ? 'Unexpected: the classic key still signed.' : `Rejected onchain: ${s.error}`);
							} catch (e) {
								const msg = e instanceof Error ? e.message : String(e);
								const m = msg.match(/Required Signature from (0x[0-9a-f]+) is absent/);
								setProof(m ? `Rejected by validators: they now require a signature from ${short(m[1])}, the quantum-safe key. The classic key no longer counts.` : `Rejected before execution: ${msg}`);
							}
						})}>5. Prove the old key is dead</button>
					</div>
					{proof && <p className="result" data-testid="proof"><span className={proof.startsWith('Unexpected') ? 'tag warn' : 'tag good'}>{proof.startsWith('Unexpected') ? 'Still valid' : 'Old key refused'}</span> <span className="hint">{proof.slice(0, 220)}</span></p>}
					<p className="hint mt-s">Steps 1 and 2 are signed by the classic key. Steps 3 and 4 are signed by ML-DSA-65 as the classic address: that is the alias at work.</p>
				</section>
				<NetworkCheck />
				<Lookup />
			</div>
		</div>
	);
}

function Lookup() {
	const [addr, setAddr] = useState('');
	const [state, setState] = useState<AliasState | null>(null);
	const [err, setErr] = useState<string | null>(null);
	return (
		<section className="card">
			<span className="eyebrow">[ Lookup ]</span>
			<h2>Which keys can sign for an address?</h2>
			<div className="inline mt">
				<input className="mono" data-testid="lookup" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="0x..." />
				<button className="ghost" data-testid="lookup-go" disabled={!addr} onClick={async () => {
					setErr(null);
					try { setState(await readAliasState(normalizeSuiAddress(addr))); } catch (e) { setErr(String(e)); }
				}}>Look up</button>
			</div>
			{err && <p className="inline-err">{err}</p>}
			{state && (
				<div className="result" data-testid="lookup-result">
					<p>{state.enabled ? <span className="tag good">Aliases on</span> : <span className="tag plain">No aliases: only the address's own key signs</span>}</p>
					<ul className="keys">{state.aliases.map((a) => <li key={a}><div className="kbody"><code title={a}>{a}</code></div></li>)}</ul>
				</div>
			)}
		</section>
	);
}
