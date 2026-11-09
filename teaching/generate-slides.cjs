// Day 1 deck: Quantum-Safe Sui (14 slides) and speaker notes. Run: pnpm slides
// Flow: quantum basics -> key types -> how migrations went before and how Sui solves it ->
// getting a quantum-safe key and wallet. Facts checked 8 and 9 Nov 2026; sources in each slide's
// REFERENCES note. Live-run digests from APP_URL=<live site> pnpm e2e on 9 Nov 2026.
const path = require('node:path');
const { createDeck, assets } = require('./deck-kit.cjs');

const LIVE = 'https://day1-quantum-safe-wallet.vercel.app';
const REPO = 'https://github.com/Nuel-osas/day1-quantum-safe-wallet';
const FIPS = 'https://csrc.nist.gov/pubs/fips/204/final';
const SUI_PQ = 'https://www.sui.io/blog/suis-post-quantum-signature-schemes';
const GOOGLE = 'https://research.google/pubs/securing-elliptic-curve-cryptocurrencies-against-quantum-vulnerabilities-resource-estimates-and-mitigations/';
const EDDSA = 'https://eprint.iacr.org/2025/1368';
const OUT = process.env.SLIDES_OUT || path.join(__dirname, 'Day1_Quantum_Safe_Sui.pptx');
const NOTES = path.join(__dirname, 'day1-speaker-notes.md');

const d = createDeck({
	title: 'Quantum-Safe Sui: Post-Quantum Keys and Moving Your Account Without Changing Its Address',
	subject: 'Keys, Dollars and Bitcoin, Day 1, SuiHub Lagos, November 2026',
	footerLeft: 'KEYS, DOLLARS AND BITCOIN · SUIHUB LAGOS',
	footerRight: 'DAY 1 · Q-WALLET',
	total: 14,
	glow: path.join(assets, 'cover-glow.png'),
});
const { C, M, CW, text, mono, card } = d;

// 01 Cover
d.cover({
	glyph: 'Q',
	name: 'q-wallet',
	subtitle: 'Quantum-Safe Sui',
	blurb: 'What quantum computers break, what quantum safe means, and how Sui lets an account switch to a quantum-safe key without changing its address. Then we build it.',
	link: LIVE,
	label: '[ KEYS, DOLLARS AND BITCOIN · DAY 1 · SUIHUB LAGOS ]',
	note: {
		explain: 'Four parts today. One: what a quantum computer is and what it breaks. Two: the key types we sign with and how they differ. Three: how the world has handled migrations like this before, and how Sui does it. Four: hands on, a quantum-safe key and a wallet that moves onto it. Say early and plainly: this is not about Sui being at risk. Every major chain uses the same curves, and Sui is early with a way out.',
		show: `Open ${LIVE} on the projector and leave it on the onboarding screen. Ask everyone to clone ${REPO} and run pnpm install while you talk. Node 22 or newer and pnpm.`,
		ask: 'Who has an address they would hate to change? An exchange deposit address, a payroll address, a treasury, a name people know?',
		answer: 'Most of the room. Moving to a new address breaks every place it is written down, so a good fix keeps the address.',
		next: 'First, what a quantum computer actually is.',
		refs: `${LIVE} ; ${REPO}`,
	},
});

// 02 What a quantum computer is
{
	const s = d.slide({
		eyebrow: 'PART 1 · QUANTUM BASICS',
		title: 'Quantum computers: one kind of math',
		subtitle: 'Not a faster laptop. A machine that wins big on a few problems with hidden structure, and one of them is ours.',
		note: {
			explain: 'A classical bit is 0 or 1. A qubit can hold a blend of both, and many qubits together can represent a huge space of possibilities. The trick is not trying every answer at once; it is interference: the algorithm is arranged so wrong answers cancel and the right one gets stronger. That only works for problems with special structure. Two algorithms matter to us. Shor finds periods, which breaks factoring and discrete logarithms: RSA and every elliptic curve signature. Grover speeds up brute-force search, but only by a square root, so a 256-bit hash keeps about 128 bits of security. The Google Quantum AI paper (2026) puts a 256-bit curve at under 1,200 logical qubits, or minutes on under half a million physical qubits; no machine today can run it.',
			show: 'Write two lines on the board: Shor: exponential speedup, breaks public-key signatures. Grover: square-root speedup, weakens hashes and AES a little.',
			ask: 'If quantum computers are so powerful, why will they not replace your laptop?',
			answer: 'They are only faster on problems with the right structure. For spreadsheets, games or a web server they offer nothing, and they need extreme cooling and error correction.',
			next: 'So what exactly breaks, and what does not?',
			refs: `${GOOGLE} (Babbush, Zalcman, Gidney, Drake, Boneh and others, 2026)`,
		},
	});
	d.grid(s, [
		{ title: 'Qubits and interference', body: 'Qubits hold blends of 0 and 1. Algorithms make wrong answers cancel out. Only works on structured problems.' },
		{ title: "Shor's algorithm", body: 'Turns a public key into its private key, for RSA and every elliptic curve. This is the threat to signatures.' },
		{ title: "Grover's algorithm", body: 'Speeds up brute-force search by a square root only. A 256-bit hash keeps about 128 bits of security.' },
	], { y: 2.75, h: 2.85, bodySize: 15 });
	d.bar(s, 'Google, 2026: under 1,200 logical qubits break a 256-bit curve. No machine today can run it.', 5.95);
}

// 03 What breaks and what does not
{
	const s = d.slide({
		eyebrow: 'PART 1 · QUANTUM BASICS',
		title: 'What breaks and what does not',
		subtitle: 'Keys break. Hashes hold. So your address can stay; the key behind it has to change.',
		note: {
			explain: 'A Sui address is BLAKE2b-256 of the scheme flag and the public key. Grover only halves a hash, so the address itself is fine. What breaks is the signature scheme behind it: Ed25519, secp256k1 and secp256r1, which passkeys use. zkLogin is elliptic-curve math too: a Groth16 proof plus a short-lived classical key. Mysten\'s own blog says the exposure is "concentrated almost entirely in signatures rather than hashing". Repeat the framing: this is every chain, not a Sui problem.',
			show: 'Ask the room to name what they sign with today: wallet extension, passkey, Google login, hardware wallet. Map each to a row.',
			ask: 'If the address is safe, why can an attacker still take the funds?',
			answer: 'The chain only checks signatures. Every transaction you sign publishes your public key; with Shor, the attacker derives the private key from it and signs as you.',
			next: 'So what does quantum safe actually mean?',
			refs: `${SUI_PQ} ; Sui address derivation: BLAKE2b-256(flag || public key)`,
		},
	});
	d.table(s, [
		['Cryptography', 'Where you meet it', 'Against a quantum computer'],
		['Ed25519, secp256k1, secp256r1', 'Signing transactions: wallets, passkeys', 'Broken: Shor recovers the private key'],
		['Groth16 proofs, short-lived keys', 'zkLogin (Google, Apple sign-in)', 'Broken: also elliptic-curve math'],
		['BLAKE2b-256 hash', 'Turning a public key into your address', 'Holds: Grover leaves about 128 bits'],
		['AES-256, ChaCha20', 'Encrypting backups and connections', 'Holds: Grover halves, still strong'],
		['ML-DSA-65', 'Post-quantum Sui accounts', 'Holds: no known quantum shortcut'],
	], { widths: [3.5, 4.1, 3.95], rowH: 0.56, size: 14 });
}

// 04 What quantum safe means
{
	const s = d.slide({
		eyebrow: 'PART 1 · QUANTUM BASICS',
		title: 'What quantum safe means, and when to act',
		subtitle: 'New math with no known quantum shortcut, standardised by NIST. And a rule of thumb for timing.',
		note: {
			explain: 'Quantum safe, or post-quantum, means signatures built on problems Shor does not help with: lattices for ML-DSA, hash functions for SLH-DSA. NIST ran a public competition from 2016 and published FIPS 204 (ML-DSA) and FIPS 205 (SLH-DSA) in August 2024. Falcon, FIPS 206, is still not final, which is one reason Sui chose ML-DSA. Mosca\'s rule decides timing: X is how long your keys must stay safe, Y is how long migrating takes, Z is how long until a capable quantum computer. If X plus Y is more than Z, you are already late.',
			show: 'Do Mosca\'s rule with the room for a treasury: it must be safe for 10 years, migrating every signer takes 3 years. Nobody knows Z, so the honest answer is start now.',
			ask: 'A meme coin wallet and a 20-year treasury. Which one needs to move first?',
			answer: 'The treasury. Its X is large. The meme wallet may be empty long before Z arrives.',
			next: 'Now part two: the keys themselves.',
			refs: `${FIPS} ; https://csrc.nist.gov/pubs/fips/205/final ; ${SUI_PQ} (Falcon not final)`,
		},
	});
	d.compare(s,
		{ title: 'Quantum safe means', bullets: ['Math with no known quantum shortcut', 'Lattices (ML-DSA) or hashes (SLH-DSA)', 'NIST FIPS 204 and 205, August 2024', 'Falcon (FIPS 206) is still not final'] },
		{ title: "When to act: Mosca's rule", bullets: ['X: how long keys must stay safe', 'Y: how long the migration takes', 'Z: years until a quantum computer', 'If X + Y > Z, you are already late'] },
		{ y: 2.6, h: 4.15 });
}

// 05 Every key type Sui accepts
{
	const s = d.slide({
		eyebrow: 'PART 2 · KEYS AND KEY TYPES',
		title: 'Every key type Sui accepts',
		subtitle: 'The flag byte in front of every Sui signature says which scheme signed. Flags from @mysten/sui 2.39.0.',
		note: {
			explain: 'Sui is unusually flexible: one chain, seven ways to authorise a transaction. Each signature starts with a flag byte. Today only flag 7 is quantum safe. A multisig is as strong as the keys it requires; Mysten\'s blog describes a two-of-two multisig that needs both a classical and a post-quantum signature, a useful bridge while wallets catch up.',
			show: 'Open src/lib/sui.ts or the SDK file cryptography/signature-scheme: SIGNATURE_SCHEME_TO_FLAG lists exactly these.',
			ask: 'Your users sign in with Google through zkLogin. Are they quantum safe?',
			answer: 'Not as built today. The proof and the short-lived key are both elliptic-curve based. Sui would need a post-quantum version, or the account moves to ML-DSA.',
			next: 'Zoom in on the two we use today: Ed25519 and ML-DSA-65.',
			refs: `@mysten/sui 2.39.0 dist/cryptography/signature-scheme ; ${SUI_PQ}`,
		},
	});
	d.table(s, [
		['Scheme', 'Flag', 'Who uses it', 'Quantum safe?'],
		['Ed25519', '0', 'Sui CLI, most Sui wallets', 'No'],
		['secp256k1', '1', 'Bitcoin and Ethereum style keys', 'No'],
		['secp256r1', '2', 'Secure enclaves, HSMs', 'No'],
		['Multisig', '3', 'Teams, treasuries', 'Only as safe as its keys'],
		['zkLogin', '5', 'Sign in with Google or Apple', 'No'],
		['Passkey', '6', 'Face ID, fingerprint, phones', 'No (secp256r1)'],
		['ML-DSA-65', '7', 'Post-quantum accounts', 'Yes (devnet today)'],
	], { widths: [2.6, 1.0, 4.6, 3.35], rowH: 0.47, size: 14 });
}

// 06 ML-DSA-65 against Ed25519
{
	const s = d.slide({
		eyebrow: 'PART 2 · KEYS AND KEY TYPES',
		title: 'ML-DSA-65 against Ed25519',
		subtitle: 'Same backup, bigger signatures. Sizes measured on devnet with @mysten/sui 2.39.0.',
		note: {
			explain: 'ML-DSA is the lattice signature NIST standardised as FIPS 204; 65 is the middle parameter set, NIST level 3, which Sui chose over the cheaper level. What you back up does not change: a 32-byte seed, from the same phrase. The price is size: a Sui transaction carries flag, signature and public key, 5,262 bytes against 97. Mysten measured verification at parity with today, so validators are not slowed down.',
			show: 'After the first post-quantum send in the app, the size bar shows 97 B against the 5,262 B it measured from the real signature.',
			ask: 'Sign the same transaction twice with ML-DSA-65 and you get two different signatures. Bug?',
			answer: 'No. Hedged signing mixes fresh randomness into every signature, which hardens it against fault and side-channel attacks. Both verify. Never treat a signature as a unique id.',
			next: 'Part three: how did the world handle a change like this before?',
			refs: `${FIPS} ; ${SUI_PQ} ; @mysten/sui/keypairs/mldsa65`,
		},
	});
	d.table(s, [
		['', 'Ed25519 (today)', 'ML-DSA-65 (post-quantum)'],
		['Standard', 'RFC 8032', 'NIST FIPS 204, level 3'],
		['Hard problem', 'Elliptic curve discrete log', 'Module lattices'],
		['Sui signature flag', '0x00', '0x07'],
		['What you back up', '32-byte seed from your phrase', '32-byte seed from the same phrase'],
		['Public key', '32 bytes', '1,952 bytes'],
		['Signature', '64 bytes', '3,309 bytes'],
		['In the transaction', '97 bytes', '5,262 bytes'],
		['Signing', 'Deterministic', 'Hedged: fresh randomness each time'],
	], { widths: [3.4, 3.7, 4.45], rowH: 0.44, size: 13.5 });
}

// 07 How migrations went before
{
	const s = d.slide({
		eyebrow: 'PART 3 · BEEN HERE BEFORE',
		title: 'How migrations have gone before',
		subtitle: 'Changing cryptography is slow everywhere. The winners built a way to swap it in advance.',
		note: {
			explain: 'SHA-1: weaknesses were published in 2005, browsers only stopped trusting SHA-1 certificates in early 2017, and the first public collision (SHAttered) landed weeks later. Bitcoin hides public keys behind a hash until you spend, but reused and old outputs have visible keys, and BIP-360, a draft for outputs ready for post-quantum signatures, entered the BIP repository only in February 2026. Ethereum accounts cannot change their key; Vitalik Buterin\'s 2024 plan B is a recovery hard fork after theft starts. The lesson is crypto agility: the ability to swap the algorithm without breaking identities.',
			show: 'Ask: which of these would you rather be on the day a quantum computer is announced?',
			ask: 'Why not just wait for the emergency and hard fork, like Ethereum\'s plan B?',
			answer: 'A fork after theft starts means rolling back blocks, new software for everyone, and some users still lose funds. Migrating before is cheap; migrating during is chaos.',
			next: 'So how does Sui do it?',
			refs: 'shattered.io and the Chromium SHA-1 deprecation (Chrome 56, Jan 2017) ; BIP-360 (draft, merged 11 Feb 2026) ; ethresear.ch "How to hard-fork to save most users\' funds in a quantum emergency" (Mar 2024)',
		},
	});
	d.steps(s, [
		{ title: 'The web', body: 'SHA-1 weaknesses known in 2005. Browsers dropped it in 2017, weeks before the first public collision.' },
		{ title: 'Bitcoin', body: 'Keys hidden behind a hash until spent. BIP-360, a draft for post-quantum outputs, came in 2026.' },
		{ title: 'Ethereum', body: 'Accounts cannot change their key. Plan B (2024): a recovery hard fork after theft begins.' },
		{ title: 'The lesson', body: 'Build a way to swap the algorithm before you need it, without breaking any address.' },
	], { y: 2.9, h: 3.85, bodySize: 15 });
}

// 08 How Sui solves it
{
	const s = d.slide({
		eyebrow: 'PART 3 · HOW SUI SOLVES IT',
		title: 'How Sui solves it',
		subtitle: 'From Mysten Labs, "Sui\'s post-quantum signature schemes", 18 August 2026, and our own runs.',
		note: {
			explain: 'Sui adds ML-DSA-65 as a native key type, derived from the phrase people already have, and address aliases let an existing address accept the new key and drop the old one. It is opt-in: nothing moves until the owner signs. For the most valuable assets, Mysten plans SLH-DSA vaults checked in Move, hash-based and very conservative. In reserve, a Mysten paper shows how an EdDSA owner could prove they know their seed in zero knowledge, which works even for exposed keys; Mysten calls it a killswitch, not a launch feature. This builds on key rotation you may have seen with us: multisig, zkLogin, and October\'s passkeys with aliases.',
			show: 'Draw an address with a list of keys behind it. Add Q. Remove X. The address never moves.',
			ask: 'Why is it opt-in instead of Sui upgrading every account automatically?',
			answer: 'Adding a key to an account needs the current key\'s signature. If Sui could add keys without you, so could an attacker.',
			next: 'Where can you use it today?',
			refs: `${SUI_PQ} ; ${EDDSA} (Baldimtsi, Chalkias, Roy, Sedaghat; FC 2026)`,
		},
	});
	d.grid(s, [
		{ title: 'ML-DSA-65 key', body: 'A native key type, flag 7, NIST level 3. Validators check it like any other signature.' },
		{ title: 'Same phrase', body: "Derived at m/94'/784' beside today's m/44'/784'. Backups do not change." },
		{ title: 'Address aliases', body: 'An address keeps a list of keys allowed to sign. Add the new one, retire the old.' },
		{ title: 'Opt-in', body: 'Nothing moves until the owner signs. Each account chooses when to switch.' },
		{ title: 'SLH-DSA vaults', body: 'Hash-based signatures checked in Move, for high-value assets. Mainnet targeted for 2026.' },
		{ title: 'A killswitch', body: 'A zero-knowledge proof of the old EdDSA seed, kept in reserve. Mysten paper, FC 2026.' },
	], { y: 2.6, h: 1.98 });
}

// 09 Where it is live
{
	const s = d.slide({
		tone: 'dark',
		eyebrow: 'PART 3 · WHERE IT IS LIVE',
		title: 'Live status: devnet only, for now',
		subtitle: "Feature flag mldsa65_auth, read from each network's GraphQL protocolConfigs on 9 Nov 2026.",
		note: {
			explain: 'Sui ships post-quantum signing behind a protocol feature flag: on for devnet, off for testnet and mainnet. Mainnet moved to protocol 141 in early November and the flag stayed off, so check the flag, not the version. Mysten\'s plan: testnet by the end of 2026, mainnet in the first quarter of 2027 at the latest, subject to audits. Even then nothing switches by itself; each account opts in.',
			show: 'The network check card in the app runs this query live against all three networks. If it says unknown, the request failed; that is not the same as off.',
			ask: 'Why does the app show unknown instead of off when the request fails?',
			answer: 'A failed read is not evidence. Showing off would be a guess presented as fact.',
			next: 'Part four: hands on. Path A, a quantum-safe key.',
			refs: `https://graphql.devnet.sui.io/graphql ; https://graphql.testnet.sui.io/graphql ; https://graphql.mainnet.sui.io/graphql ; ${SUI_PQ}`,
		},
	});
	const nets = [
		['DEVNET', 'On', 'protocol 141', 'mldsa65_auth = true. Q-Wallet runs here.', true],
		['TESTNET', 'Off', 'protocol 140', 'Planned for the end of 2026.', false],
		['MAINNET', 'Off', 'protocol 141', 'Q1 2027 at the latest, per Mysten. Opt-in.', false],
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

// 10 Path A: a quantum-safe key
{
	const s = d.slide({
		tone: 'dark',
		eyebrow: 'PART 4 · PATH A · SRC/LIB/KEYS.TS',
		title: 'Path A: a quantum-safe key',
		subtitle: 'From the phrase you already have. Q is a new account, quantum safe from day one; nothing to migrate.',
		note: {
			explain: "deriveKeypair takes the phrase and an optional path. Ed25519 defaults to m/44'/784'/0'/0'/0', the path Sui wallets use. MLDSA65Keypair defaults to m/94'/784'/0'/0'/0'. Q has its own address, because an address is a hash of the flag and the public key. Path A suits new users and new treasuries: start on Q and there is nothing to migrate. Path B is for addresses you want to keep.",
			show: 'Click Create a new wallet in the app. Two addresses appear: X, the classic key, and Q, the quantum-safe key. Fund X from the faucet, fund Q from X, then send with Q and watch the size bar.',
			ask: 'Both keys come from the same phrase. If the phrase leaks, what happens?',
			answer: 'Both keys leak. The phrase is the root secret. A post-quantum key protects against a quantum attacker, not against a stolen phrase.',
			next: 'Path B: keep the address you already have.',
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

// 11 Path B: upgrade an existing wallet
{
	const s = d.slide({
		tone: 'dark',
		eyebrow: 'PART 4 · PATH B · THE MIGRATION',
		title: 'Path B: upgrade a wallet, keep its address',
		subtitle: 'X is the address you keep, Q the quantum-safe key. Only the key allowed to sign for X changes.',
		note: {
			explain: 'Order is the whole lesson. enable, add and remove are entry functions in sui::address_alias (0x2), so each must be a top-level command, and enable and add cannot share a transaction. The AddressAliases object id is derived from 0xa and the address, so the app reads it without an indexer. After step 4 the list holds only Q, and validators demand Q for anything X sends. Do this while the old key is still safe: on the day Ed25519 can be forged, an attacker could add their own key instead.',
			show: 'Click the four buttons in card 02, then Prove. Open src/lib/sui.ts: aliasEnable, aliasAdd and aliasRemove are three framework calls, no custom Move.',
			ask: 'What happens if you run step 4 before step 3 and Q turns out to be wrong or lost?',
			answer: 'X is locked for good: the only key on its list is one you cannot use. Q-Wallet allows Retire as soon as Q is listed, fine for a devnet class. A production wallet should require a successful signature from Q as X first.',
			next: 'Proof that it worked.',
			refs: 'sui::address_alias (enable, add, remove) ; src/lib/sui.ts',
		},
	});
	d.steps(s, [
		{ title: 'Enable', body: 'Turn on aliases, signed by the classic key. X now lists [X].' },
		{ title: 'Add Q', body: 'add(Q), signed by the classic key, in its own transaction. [X, Q].' },
		{ title: 'Send as X', body: 'Sender X, signature from Q. Accepted because Q is listed.' },
		{ title: 'Retire X', body: 'remove(X), signed by Q. [Q]. Only after step 3 worked.' },
		{ title: 'Refused', body: 'The classic key is now rejected: Required Signature from Q is absent.' },
	], { y: 2.95, h: 3.75, bodySize: 15 });
}

// 12 Proof
{
	const s = d.slide({
		eyebrow: 'PROOF ON DEVNET',
		title: 'Proof: the run on the live site',
		subtitle: 'pnpm e2e against the Vercel app, 9 Nov 2026. X = 0x4118...b842, Q = 0xb058...b65c.',
		note: {
			explain: 'Every row is a real devnet transaction from the live site. X is an Ed25519 address and Q an ML-DSA-65 address. The last row is the moment of the lesson: after retirement the old key cannot sign for its own address any more.',
			show: 'Open one ML-DSA-65 transaction on a devnet explorer and point at the signature size. Then run pnpm e2e yourself and compare.',
			ask: 'Devnet is reset from time to time. What happens to these digests?',
			answer: 'They disappear from explorers. That is why the speaker notes say to rerun the e2e on the morning of class and replace them if needed.',
			next: 'What will bite you, and how to run it yourself.',
			refs: `${LIVE} ; scripts/.e2e-result.json`,
		},
	});
	d.table(s, [
		['Step', 'Sender', 'Signed by', 'Digest'],
		['Fund Q from X', 'X', 'Ed25519', '81TjtXSntT5FvttX8DK7X783AqhsjkmnZgN7Y3wGXoWT'],
		['Send with ML-DSA-65', 'Q', 'ML-DSA-65', 'BRf1jB4yQUgqLmF3TH3ghTL4sGQYGF6KJLpWzf4WkSWc'],
		['Turn on aliases', 'X', 'Ed25519', '4T8KmoHZHAptKMRRhxu13JxJycf2yzq2qTQi89jjhfMB'],
		['Add Q as an alias', 'X', 'Ed25519', '85khdRWZnRbWH2zrJyChAWa2vJb3kK3L2Mie1pMjxmas'],
		['Send as X', 'X', 'ML-DSA-65', '7TZYEQ1yCQjpU4wwkSH1ur1UUdF1zHaPLSEyTc9qDuvx'],
		['Retire the classic key', 'X', 'ML-DSA-65', '4h5PHmyxf3EGbrGB5A3iAx4GigzjAb4VPvCoYAvAynWc'],
		['Classic key afterwards', 'X', 'Ed25519', 'Refused: Required Signature from 0xb058...b65c is absent'],
	], { widths: [3.0, 0.95, 1.65, 5.95], rowH: 0.47, size: 13, monoCols: [3] });
}

// 13 Gotchas and build it
{
	const s = d.slide({
		tone: 'dark',
		eyebrow: 'BUILD IT',
		title: 'Run Q-Wallet, and what will bite you',
		subtitle: 'Node 22+, pnpm and a browser. No environment variables. The only server code is a devnet faucet relay.',
		note: {
			explain: 'Everyone runs it on their own laptop. Keys stay in the browser and the app talks straight to the devnet full node over gRPC. api/faucet.ts exists only because the devnet faucet sends no CORS headers; it holds no keys. The six gotchas on the right all came up while building and running Q-Wallet.',
			show: 'Do the clicks live on the projector, saying which key signs each time. Then the room repeats it in pairs, one funded account per pair if the faucet rate-limits.',
			ask: 'Which of the six would cost a real user their account?',
			answer: 'Order. Retiring the classic key before the new key has worked can lock an account for good. The others cost time or bytes.',
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
		'APP_URL=https://day1-quantum-safe-wallet.vercel.app \\',
		'  pnpm e2e',
	].join('\n'), { w: 6.2, lang: 'SHELL', size: 10.5 });
	const x = M + 6.5, w = CW - 6.5;
	[
		['Devnet only', 'mldsa65_auth is off on testnet and mainnet'],
		['5 KB per signature', '5,262 bytes against 97; count it in batches'],
		['Random signatures', 'Never use a signature as an id'],
		['Order matters', 'Retire the old key only after Q signed as X'],
		['Faucet limits', 'Devnet faucet limits per IP; one per pair'],
		['Keys in localStorage', 'Fine for a devnet class, never real money'],
	].forEach(([t, b], i) => {
		const y = 2.85 + i * 0.66;
		mono(s, String(i + 1).padStart(2, '0'), x, y + 0.03, 0.45, 0.22, 11, C.peri);
		text(s, t, x + 0.5, y, w - 0.5, 0.3, 16, C.near);
		text(s, b, x + 0.5, y + 0.31, w - 0.5, 0.28, 12.5, C.dim);
	});
}

// 14 Take home
d.statement({
	eyebrow: 'TAKE HOME',
	line1: 'Change the key, keep the address.',
	line2: 'Switch while the old key\nis still safe.',
	body: 'Quantum computers threaten the keys every chain uses, not Sui alone. Sui already has a post-quantum key from the same phrase and aliases to move an account onto it. Devnet today, testnet by the end of 2026, mainnet by Q1 2027. Each account opts in, so prepare now and migrate early.',
	note: {
		explain: 'Three things to remember: quantum breaks signature keys, not hashes or addresses; Sui\'s fix is a new key type plus aliases, so the address stays; and it is opt-in, so someone has to make the switch, ideally a wallet with one prompt, and before the old key can be forged.',
		show: 'Leave the app on the final screen with the refusal visible.',
		ask: 'What would you migrate first: your own deploy key, a treasury, or user wallets?',
		answer: 'Long-lived, high-value keys first: treasuries, upgrade authority holders, multisig members. User wallets follow once wallets support the key type.',
		next: 'Day 2: native USDC with CCTP V2. We build our own bridge, with a fee and with gas we pay for our users.',
	},
});

const header = `# Day 1 Speaker Notes: Quantum-Safe Sui

Keys, Dollars and Bitcoin, Day 1, SuiHub Lagos. Deck: teaching/Day1_Quantum_Safe_Sui.pptx (14 slides, rebuilt with \`pnpm slides\`). App: ${LIVE}. Repo: ${REPO}.

Framing to keep all day: quantum computers threaten the elliptic-curve keys every major chain uses. No machine can do it today. Sui is early with a way out; it is not at risk because of something it did.

## Before class

- Run \`APP_URL=${LIVE} pnpm e2e\` on the morning of class. Devnet is wiped from time to time; if the slide 12 digests have gone, paste in the new ones from scripts/.e2e-result.json and rebuild the deck.
- Check the flag: the network check card in the app, or the protocolConfigs query on slide 9. On 9 Nov 2026: devnet 141 on, testnet 140 off, mainnet 141 off.
- Students need Node 22+, pnpm and a browser. No wallet extension and no environment variables.
- The devnet faucet rate-limits by IP. Plan one classic account per pair, with faucet.sui.io as the fallback.

## Run of show (about two hours)

| Slides | Minutes | Part |
|---|---|---|
| 1 to 4 | 20 | Part 1: what a quantum computer is, what breaks, what quantum safe means, when to act |
| 5 to 6 | 15 | Part 2: every Sui key type, ML-DSA-65 against Ed25519 |
| 7 to 9 | 20 | Part 3: migrations before, how Sui solves it, where it is live |
| 10 to 12 | 30 | Part 4: Path A (new key), Path B (keep the address), proof, live in the app |
| 13 | 30 | Everyone runs Q-Wallet in pairs; the gotchas as they hit them |
| 14 | 5 | Take home, Day 2 preview |

`;

d.save(OUT, NOTES, header).then((r) => console.log(`wrote ${r.out} (${r.slides} slides) and ${r.notesOut}`));
