// Day 1 deck: Quantum-Safe Sui (13 slides) and speaker notes. Run: pnpm slides
// Facts checked on 8 Nov 2026: flags via GraphQL protocolConfigs, live-run digests via devnet GraphQL.
const path = require('node:path');
const { createDeck, assets } = require('./deck-kit.cjs');

const LIVE = 'https://day1-quantum-safe-wallet.vercel.app';
const REPO = 'https://github.com/Nuel-osas/day1-quantum-safe-wallet';
const FIPS = 'https://csrc.nist.gov/pubs/fips/204/final';
const OUT = process.env.SLIDES_OUT || path.join(__dirname, 'Day1_Quantum_Safe_Sui.pptx');
const NOTES = path.join(__dirname, 'day1-speaker-notes.md');

const d = createDeck({
	title: 'Quantum-Safe Sui: Post-Quantum Keys and Moving Your Account Without Changing Its Address',
	subject: 'Keys, Dollars and Bitcoin, Day 1, SuiHub Lagos, November 2026',
	footerLeft: 'KEYS, DOLLARS AND BITCOIN · SUIHUB LAGOS',
	footerRight: 'DAY 1 · Q-WALLET',
	total: 13,
	glow: path.join(assets, 'cover-glow.png'),
});
const { C, M, CW, text, mono, card } = d;

// 01 Cover
d.cover({
	glyph: 'Q',
	name: 'q-wallet',
	subtitle: 'Quantum-Safe Sui',
	blurb: 'Post-quantum keys on Sui. We build Q-Wallet: one phrase, two keys, and an account that moves to ML-DSA-65 without changing its address.',
	link: LIVE,
	label: '[ KEYS, DOLLARS AND BITCOIN · DAY 1 · SUIHUB LAGOS ]',
	note: {
		explain: 'Today is one problem and one fix. A large enough quantum computer could forge the signatures every Sui wallet makes today. Sui has added a post-quantum key type, ML-DSA-65, and address aliases let an existing account move onto it without changing its address. We build Q-Wallet, which does exactly that on devnet.',
		show: `Open ${LIVE} on the projector and leave it on the onboarding screen. Ask everyone to clone ${REPO} and run pnpm install while you talk. Node 22 or newer and pnpm.`,
		ask: 'Who has an address they would hate to change? An exchange deposit address, a payroll address, a treasury, a name people know?',
		answer: 'Most of the room. Moving to a new address is expensive and breaks every place it is written down, so the fix has to keep the address.',
		next: 'First, what exactly breaks.',
		refs: `${LIVE} ; ${REPO}`,
	},
});

// 02 The one idea
d.statement({
	eyebrow: 'THE ONE IDEA',
	line1: 'Quantum breaks keys, not addresses.',
	line2: 'So change the key,\nkeep the address.',
	body: "Ed25519, secp256k1 and secp256r1 all fall to Shor's algorithm on a large enough quantum computer. Every signature you send publishes your public key, so accounts that have signed are already exposed. Sui adds a post-quantum key, ML-DSA-65, and aliases that let an account switch to it.",
	note: {
		explain: "A Sui address is a hash of a scheme flag and a public key. The attacker wants the private key, and Shor's algorithm recovers it from the public key for every elliptic curve scheme Sui supports today: Ed25519, secp256k1 and secp256r1, which passkeys also use. The address is not the weak point. So the fix is to let the address accept a different kind of key.",
		show: 'Draw on the board: address = hash(flag, public key). Signing reveals the public key. A quantum computer turns public key into private key. Then draw the fix: an alias list on the address, the new key added, the old key removed.',
		ask: 'Machines that can do this do not exist yet. Why act now?',
		answer: 'Public keys are already onchain for every account that has signed, so the target list exists today. Moving millions of accounts takes years, and long-lived value needs a path before the machine arrives.',
		next: 'So what is the new key?',
		refs: FIPS,
	},
});

// 03 ML-DSA-65
{
	const s = d.slide({
		eyebrow: 'ML-DSA-65',
		title: 'ML-DSA-65: the key Sui added',
		subtitle: 'NIST FIPS 204, built on lattices. Sizes measured on devnet with @mysten/sui 2.39.0.',
		note: {
			explain: 'ML-DSA is the lattice signature NIST standardised as FIPS 204; 65 is the middle parameter set. Sui gives it signature flag 7. Its security rests on lattice problems with no known efficient quantum attack. The price is size: the public key is 61 times larger and the signature about 52 times larger. A Sui transaction carries flag, signature and public key together, so 5,262 bytes against 97.',
			show: 'Point at the last three rows. After the first post-quantum send in the app, the size bar shows 97 B against the 5,262 B it measured from the real signature.',
			ask: 'Sign the same transaction twice with ML-DSA-65 and you get two different signatures. Bug?',
			answer: 'No. Hedged signing mixes 32 fresh random bytes into every signature, which hardens it against fault and side-channel attacks. Both verify. Never treat a signature as a unique id.',
			next: 'Where can you use it today?',
			refs: `${FIPS} ; @mysten/sui 2.39.0, @mysten/sui/keypairs/mldsa65 (keypair.d.mts documents the 32-byte seed and hedged signing)`,
		},
	});
	d.table(s, [
		['', 'Ed25519 (today)', 'ML-DSA-65 (post-quantum)'],
		['Standard', 'RFC 8032', 'NIST FIPS 204'],
		['Hard problem', 'Elliptic curve discrete log', 'Module lattices'],
		['Sui signature flag', '0x00', '0x07'],
		['Public key', '32 bytes', '1,952 bytes'],
		['Signature', '64 bytes', '3,309 bytes'],
		['In the transaction (flag + signature + key)', '97 bytes', '5,262 bytes'],
		['Signing', 'Deterministic', 'Hedged: fresh randomness each time'],
	], { widths: [4.6, 3.1, 3.85], rowH: 0.47 });
}

// 04 Live status
{
	const s = d.slide({
		tone: 'dark',
		eyebrow: 'WHERE IT IS LIVE',
		title: 'Live status: devnet only, for now',
		subtitle: "Feature flag mldsa65_auth, read from each network's GraphQL protocolConfigs on 8 Nov 2026.",
		note: {
			explain: 'Sui ships post-quantum signing behind a protocol feature flag. It is on for devnet and off for testnet and mainnet. Mainnet moved from protocol 140 to 141 between our checks on 6 and 8 November and the flag stayed off, so an upgrade alone does not switch it on: check the flag, not the version. The plan is testnet at the end of 2026 and mainnet in the first quarter of 2027.',
			show: 'The network check card in the app runs this query live against all three networks. If it says unknown, the request failed; that is not the same as off.',
			ask: 'Why does the app show unknown instead of off when the request fails?',
			answer: 'A failed read is not evidence. Showing off would be a guess presented as fact, and people or scripts might act on it.',
			next: 'Now we build. Part one: keys.',
			refs: 'https://graphql.devnet.sui.io/graphql ; https://graphql.testnet.sui.io/graphql ; https://graphql.mainnet.sui.io/graphql ; src/lib/sui.ts readPqFlags',
		},
	});
	const nets = [
		['DEVNET', 'On', 'protocol 141', 'mldsa65_auth = true. Q-Wallet runs here.', true],
		['TESTNET', 'Off', 'protocol 140', 'Planned for the end of 2026.', false],
		['MAINNET', 'Off', 'protocol 141', 'Upgraded, flag still off. Targeted for Q1 2027.', false],
	];
	const w = (CW - 0.36) / 3;
	nets.forEach(([net, state, proto, body, on], i) => {
		const x = M + i * (w + 0.18), y = 2.8;
		card(s, x, y, w, 2.05, on ? C.blue : C.dcard, on ? null : C.dline);
		mono(s, net, x + 0.25, y + 0.22, 2, 0.22, 11, on ? C.pale : C.peri, { charSpacing: 1 });
		mono(s, proto, x + w - 2.25, y + 0.22, 2, 0.22, 11, on ? C.pale : C.dim, { align: 'right' });
		text(s, state, x + 0.25, y + 0.55, w - 0.5, 0.7, 40, C.near);
		text(s, body, x + 0.25, y + 1.38, w - 0.5, 0.55, 14, on ? C.pale : C.dim);
	});
	d.code(s, [
		'// src/lib/sui.ts, readPqFlags(): one request per network',
		"body: JSON.stringify({ query: '{ protocolConfigs { protocolVersion featureFlags { key value } } }' })",
		"const f = c.featureFlags.find((x) => x.key === 'mldsa65_auth');",
		'// a failed read returns mldsa: null (unknown), never false (off)',
	].join('\n'), { y: 5.05, h: 1.75, lang: 'TYPESCRIPT', size: 11 });
}

// 05 Section 01
d.section({
	eyebrow: 'KEYS, DOLLARS AND BITCOIN · DAY 1',
	number: '01',
	title: 'One phrase, two keys',
	note: {
		explain: 'Every Sui wallet turns a 12-word phrase into an Ed25519 key. The SDK can derive an ML-DSA-65 key from the same phrase on a different path, so the user backs up nothing new.',
		show: 'Click Create a new wallet in the app. Two addresses appear: X, the classic key, and Q, the quantum-safe key. Show the phrase button.',
		ask: 'Both keys come from the same phrase. If the phrase leaks, what happens?',
		answer: 'Both keys leak. The phrase is the root secret. A post-quantum key protects against a quantum attacker, not against a stolen phrase.',
		next: 'Here is the code.',
	},
});

// 06 keys.ts
{
	const s = d.slide({
		tone: 'dark',
		eyebrow: 'SRC/LIB/KEYS.TS',
		title: 'Derive both keys from one phrase',
		subtitle: 'Abridged from the repo. Different paths and schemes, so the same 12 words give two addresses.',
		note: {
			explain: "deriveKeypair takes the phrase and an optional path. Ed25519 defaults to m/44'/784'/0'/0'/0', the path Sui wallets use. MLDSA65Keypair defaults to m/94'/784'/0'/0'/0'. The ML-DSA secret is a 32-byte seed; the 4,032-byte signing key is expanded from it, so exporting gives an ordinary suiprivkey string.",
			show: 'Open src/lib/keys.ts. Point at fromSecret: you can also import an existing classic devnet key, which is how you would migrate an account you already own.',
			ask: 'Why is Q a different address from X when both come from the same phrase?',
			answer: 'An address is a hash of the scheme flag and the public key. Different scheme, different key, different hash.',
			next: 'Now the part that keeps the address: aliases.',
			refs: '@mysten/sui 2.39.0: Ed25519Keypair.deriveKeypair, MLDSA65Keypair.deriveKeypair, DEFAULT_MLDSA65_DERIVATION_PATH',
		},
	});
	d.code(s, [
		"import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';",
		"import { MLDSA65Keypair } from '@mysten/sui/keypairs/mldsa65';",
		"import { generateMnemonic, validateMnemonic } from '@scure/bip39';",
		'',
		'export function newPhrase() { return generateMnemonic(wordlist, 128); }   // 12 words',
		'',
		'export function keysFrom(saved: Saved): Keys {',
		"  if (!validateMnemonic(mnemonic, wordlist)) throw new Error('That is not a valid 12 or 24 word phrase');",
		'  return {',
		"    classic: Ed25519Keypair.deriveKeypair(mnemonic),   // m/44'/784'/0'/0'/0'   address X",
		"    quantum: MLDSA65Keypair.deriveKeypair(mnemonic),   // m/94'/784'/0'/0'/0'   address Q",
		'  };',
		'}',
	].join('\n'), { size: 11 });
}

// 07 Section 02
d.section({
	eyebrow: 'KEYS, DOLLARS AND BITCOIN · DAY 1',
	number: '02',
	title: 'Move the account, keep the address',
	note: {
		explain: 'An address can keep a list of other addresses whose keys may sign for it: address aliases. In October we used them to link passkeys across devices. Today we add the quantum-safe address, then remove the classic one.',
		show: 'Scroll to card 02 in the app: the four-step strip and the alias list under it.',
		ask: 'In October we linked two passkeys with aliases. What is different today?',
		answer: 'Then both keys stayed valid. Today the end state removes the original key, so only the post-quantum key can sign for the address.',
		next: 'Five transactions, in order.',
	},
});

// 08 The migration
{
	const s = d.slide({
		tone: 'dark',
		eyebrow: 'THE MIGRATION',
		title: 'Five transactions, one address',
		subtitle: 'X is the classic address, Q the quantum-safe one. X never changes; only the key allowed to sign for it does.',
		note: {
			explain: 'Order is the whole lesson. enable, add and remove are entry functions in sui::address_alias, so each must be a top-level command, and enable and add cannot share a transaction. The AddressAliases object id is derived from 0xa and the address, so the app reads it without an indexer. After step 4 the list holds only Q, and validators demand Q for anything X sends.',
			show: 'Click the four buttons in card 02. The alias list updates after each one. Then click Prove: the refusal comes straight from the validators.',
			ask: 'What happens if you run step 4 before step 3 and Q turns out to be wrong or lost?',
			answer: 'X is locked for good: the only key on its list is one you cannot use. Q-Wallet enables Retire as soon as Q is on the list, which is fine for a devnet class. A production wallet should require a successful signature from Q as X first.',
			next: 'The code for those calls.',
		},
	});
	d.steps(s, [
		{ title: 'Enable', body: 'enable, signed by the classic key. X now has an alias list: [X].' },
		{ title: 'Add Q', body: 'add(Q), signed by the classic key again, in its own transaction. List: [X, Q].' },
		{ title: 'Send as X', body: 'Sender X, signature from Q. Validators accept it because Q is on the list.' },
		{ title: 'Retire X', body: 'remove(X), signed by Q. List: [Q]. Only after step 3 has worked.' },
		{ title: 'Refused', body: 'The classic key is now rejected: Required Signature from Q is absent.' },
	], { y: 2.95, h: 3.75, bodySize: 15 });
}

// 09 Alias code
{
	const s = d.slide({
		tone: 'dark',
		eyebrow: 'SRC/LIB/SUI.TS',
		title: 'Aliases: three framework calls',
		subtitle: 'No custom Move. The AddressAliases id is derived from 0xa and the owner, so no indexer either.',
		note: {
			explain: 'These are the only Move calls in the migration and all three live in the Sui framework. signAndRun builds the transaction with sender X and signs it with whichever key you pass. When the signer is an alias of the sender, validators accept it.',
			show: 'Open src/lib/sui.ts and walk signAndRun: setSender, build, signTransaction, executeTransaction. signatureBytes is how the app measures 5,262.',
			ask: 'Steps 3 and 4 have sender X but are signed by Q. Who pays the gas?',
			answer: "X. The gas comes from the sender's coins; the alias only authorises the signature. Q needs no SUI for these steps.",
			next: 'Did it really happen? Here is the run.',
			refs: 'sui::address_alias in the Sui framework ; src/lib/sui.ts ; src/App.tsx',
		},
	});
	d.code(s, [
		'// sui::address_alias functions are entry: each must be its own top-level PTB command.',
		'export const aliasEnable = (tx: Transaction) =>',
		"  tx.moveCall({ target: '0x2::address_alias::enable', arguments: [tx.object(ALIAS_STATE_ID)] });",
		'export const aliasAdd = (tx: Transaction, aliasesId: string, alias: string) =>',
		"  tx.moveCall({ target: '0x2::address_alias::add', arguments: [tx.object(aliasesId), tx.pure.address(alias)] });",
		'export const aliasRemove = (tx: Transaction, aliasesId: string, alias: string) =>',
		"  tx.moveCall({ target: '0x2::address_alias::remove', arguments: [tx.object(aliasesId), tx.pure.address(alias)] });",
		'',
		"deriveObjectID(ALIAS_STATE_ID, '0x2::address_alias::AliasKey', bcs.Address.serialize(owner).toBytes());",
		'',
		'// App.tsx, step 4: sender X, signed by the quantum-safe key',
		'await run(\'Retire classic key\', X, keys.quantum, (tx) => aliasRemove(tx, aliases.objectId, X));',
	].join('\n'), { size: 10.5 });
}

// 10 Proof
{
	const s = d.slide({
		eyebrow: 'VERIFIED ON DEVNET',
		title: 'Proof: the run on the live site',
		subtitle: 'pnpm e2e against the Vercel app, 6 Nov 2026, 10:58 UTC. X = 0x4208...b52a, Q = 0xeb13...9a98.',
		note: {
			explain: 'Every row came from the end-to-end script clicking the real app on the live site. Read the Sender column: the last three all send from X, two of them signed by the post-quantum key, and the classic key is refused at the end. Same address throughout.',
			show: 'Open 86bwyUpu... on suiscan.xyz/devnet and point at the sender: X. Devnet is wiped from time to time. All six digests still resolved on 8 Nov; rerun pnpm e2e on the morning of class and swap in fresh ones if they have gone.',
			ask: 'What does the explorer show as the sender of the Send as X transaction?',
			answer: 'X, the classic address. The signature on it is ML-DSA-65 from Q.',
			next: 'Before you try it, the traps.',
			refs: 'scripts/e2e-browser.ts ; https://suiscan.xyz/devnet/tx/86bwyUpu6yUhoqcruHEhZsGyNu53CofXvEUmfWzWF2uK',
		},
	});
	d.table(s, [
		['Step', 'Sender', 'Signed by', 'Digest'],
		['Fund Q from X', 'X', 'Ed25519', 'Cb2EUvqYo1kntqiv3mz9RHFu67vD4mdQwsYVBHYoTjF4'],
		['Send with ML-DSA-65', 'Q', 'ML-DSA-65', 'FFAHNrfe18HAGMBvhJWuQdZTQjuSWrB2E3Fr2FQSufDz'],
		['Turn on aliases', 'X', 'Ed25519', '4ihGXT3RM3tDeQyu8od6kV1QgtC1ZSeCMXRvXPU51VYm'],
		['Add Q as an alias', 'X', 'Ed25519', '5YHE147QArQ3gyYGniWSsiBstXae5yRvqdLBtBXEDttR'],
		['Send as X', 'X', 'ML-DSA-65', '86bwyUpu6yUhoqcruHEhZsGyNu53CofXvEUmfWzWF2uK'],
		['Retire the classic key', 'X', 'ML-DSA-65', '3jwSMrHo3t7ngnCaKVpT4jcSmrvRVanSTPBH859Eo5Jx'],
		['Classic key afterwards', 'X', 'Ed25519', 'Refused: Required Signature from 0xeb13...9a98 is absent'],
	], { widths: [3.0, 1.0, 1.65, 5.9], rowH: 0.47, monoCols: [3] });
}

// 11 Gotchas
{
	const s = d.slide({
		eyebrow: 'GOTCHAS',
		title: 'Six things that will bite you',
		subtitle: 'All of them came up while building and running Q-Wallet.',
		note: {
			explain: 'Walk all six. The first four are about the protocol; the last two are about running a class or a demo.',
			show: 'If the faucet refuses a laptop, use faucet.sui.io in the browser, or have one person in each pair fund the other from their classic address.',
			ask: 'Which of these six would hurt a production app most?',
			answer: 'Order. Retiring the classic key before the new key has worked can lock an account for good. The others cost time or bytes; that one costs the account.',
			next: 'Your turn to run it.',
		},
	});
	d.grid(s, [
		{ title: 'Devnet only', body: 'mldsa65_auth is off on testnet and mainnet. Check the flag before pointing the app anywhere else.' },
		{ title: '5 KB per signature', body: '5,262 bytes against 97. Fine for one user; count it before batching many signers into one flow.' },
		{ title: 'Random signatures', body: 'Same bytes, a new valid signature each time. Never use a signature as an id or a cache key.' },
		{ title: 'Order matters', body: 'enable and add go in separate transactions. Remove the classic key only after Q has signed as X.' },
		{ title: 'Faucet limits', body: 'The devnet faucet rate-limits by IP. In a full room, fund one classic account per pair.' },
		{ title: 'Keys in localStorage', body: 'Fine for a devnet class, never for real money. Clearing site data loses the phrase.' },
	], { y: 2.8, h: 1.94 });
}

// 12 Build it
{
	const s = d.slide({
		tone: 'dark',
		eyebrow: 'BUILD IT',
		title: 'Run Q-Wallet yourself',
		subtitle: 'Node 22+, pnpm and a browser. No environment variables. The only server code is a devnet faucet relay.',
		note: {
			explain: 'Everyone runs it on their own laptop. Keys stay in the browser and the app talks straight to the devnet full node over gRPC. api/faucet.ts exists only because the devnet faucet sends no CORS headers; it holds no keys.',
			show: 'Do the five clicks live on the projector, saying which key signs each time. Then the room repeats it in pairs.',
			ask: 'What would have to change to run this on mainnet?',
			answer: 'The network constants in src/lib/sui.ts, the faucet (mainnet has none) and key storage. The signing code should not need to change, but it only works once mldsa65_auth is on there.',
			next: 'What to take home.',
			refs: `${REPO} ; ${LIVE}`,
		},
	});
	d.code(s, [
		'git clone https://github.com/Nuel-osas/day1-quantum-safe-wallet',
		'cd day1-quantum-safe-wallet',
		'pnpm install',
		'pnpm dev      # http://localhost:5292',
		'pnpm build    # typecheck, then production build',
		'pnpm e2e      # clicks the whole flow on devnet',
		'',
		'# the same run against the live site',
		'APP_URL=https://day1-quantum-safe-wallet.vercel.app pnpm e2e',
	].join('\n'), { w: 6.95, lang: 'SHELL', size: 11 });
	const x = M + 7.25, w = CW - 7.25;
	[
		['Create a new wallet', 'Two addresses appear: X and Q'],
		['Fund', 'Faucet X, then fund Q from X'],
		['Send with ML-DSA-65', 'Watch the size bar: 5,262 bytes'],
		['Upgrade X', 'Enable, add Q, send as X, retire X'],
		['Prove it', 'The classic key is refused'],
	].forEach(([t, b], i) => {
		const y = 2.88 + i * 0.79;
		mono(s, String(i + 1).padStart(2, '0'), x, y + 0.04, 0.5, 0.25, 12, C.peri);
		text(s, t, x + 0.55, y, w - 0.55, 0.34, 18, C.near);
		text(s, b, x + 0.55, y + 0.36, w - 0.55, 0.3, 13.5, C.dim);
	});
}

// 13 Take home
d.statement({
	eyebrow: 'TAKE HOME',
	line1: 'Change the key, keep the address.',
	line2: 'Works on devnet today.\nNot on testnet or mainnet yet.',
	body: 'ML-DSA-65 is a real Sui key type, derived from the phrase users already have. Aliases move an existing account onto it with three framework calls. Prepare now: derive the key, rehearse the migration, budget 5 KB per signature. Ship it to users once the flag is on and their wallet supports it.',
	note: {
		explain: 'Three things to remember: the key type exists and derives from the same phrase; aliases move an account without changing its address; and it is devnet only until the flag turns on elsewhere.',
		show: 'Leave the app on the final screen with the refusal visible.',
		ask: 'What would you migrate first: your own deploy key, a treasury, or user wallets?',
		answer: 'Long-lived, high-value keys first: treasuries, upgrade authority holders, multisig members. User wallets follow once wallets support the key type.',
		next: 'Day 2: native USDC with CCTP V2. We build our own bridge, with a fee and with gas we pay for our users.',
	},
});

const header = `# Day 1 Speaker Notes: Quantum-Safe Sui

Keys, Dollars and Bitcoin, Day 1, SuiHub Lagos. Deck: teaching/Day1_Quantum_Safe_Sui.pptx (13 slides, rebuilt with \`pnpm slides\`). App: ${LIVE}. Repo: ${REPO}.

## Before class

- Run \`APP_URL=${LIVE} pnpm e2e\` on the morning of class. Devnet is wiped from time to time; if the slide 10 digests have gone, paste in the new ones from scripts/.e2e-result.json and rebuild the deck.
- Check the flag: the network check card in the app, or the protocolConfigs query on slide 4. On 8 Nov 2026: devnet 141 on, testnet 140 off, mainnet 141 off.
- Students need Node 22+, pnpm and a browser. No wallet extension and no environment variables.
- The devnet faucet rate-limits by IP. Plan one classic account per pair, with faucet.sui.io as the fallback.

## Run of show (about two hours)

| Slides | Minutes | What happens |
|---|---|---|
| 1 to 2 | 10 | Cover, the threat and the one idea |
| 3 to 4 | 15 | What ML-DSA-65 is, where it is live |
| 5 to 6 | 15 | One phrase, two keys; create a wallet in the app |
| 7 to 9 | 25 | The migration, live in the app, then the code |
| 10 to 11 | 15 | The verified run, the six gotchas |
| 12 | 30 | Everyone runs Q-Wallet and completes the five clicks |
| 13 | 5 | Take home, Day 2 preview |

`;

d.save(OUT, NOTES, header).then((r) => console.log(`wrote ${r.out} (${r.slides} slides) and ${r.notesOut}`));
