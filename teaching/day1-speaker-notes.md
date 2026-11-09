# Day 1 Speaker Notes: Quantum-Safe Sui

Keys, Dollars and Bitcoin, Day 1, SuiHub Lagos. Deck: teaching/Day1_Quantum_Safe_Sui.pptx (14 slides, rebuilt with `pnpm slides`). App: https://day1-quantum-safe-wallet.vercel.app. Repo: https://github.com/Nuel-osas/day1-quantum-safe-wallet.

Framing to keep all day: quantum computers threaten the elliptic-curve keys every major chain uses. No machine can do it today. Sui is early with a way out; it is not at risk because of something it did.

## Before class

- Run `APP_URL=https://day1-quantum-safe-wallet.vercel.app pnpm e2e` on the morning of class. Devnet is wiped from time to time; if the slide 12 digests have gone, paste in the new ones from scripts/.e2e-result.json and rebuild the deck.
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


## 01. q-wallet: Quantum-Safe Sui

EXPLAIN
Four parts today. One: what a quantum computer is and what it breaks. Two: the key types we sign with and how they differ. Three: how the world has handled migrations like this before, and how Sui does it. Four: hands on, a quantum-safe key and a wallet that moves onto it. Say early and plainly: this is not about Sui being at risk. Every major chain uses the same curves, and Sui is early with a way out.

SHOW / DO
Open https://day1-quantum-safe-wallet.vercel.app on the projector and leave it on the onboarding screen. Ask everyone to clone https://github.com/Nuel-osas/day1-quantum-safe-wallet and run pnpm install while you talk. Node 22 or newer and pnpm.

ASK THE ROOM
Who has an address they would hate to change? An exchange deposit address, a payroll address, a treasury, a name people know?

EXPECTED ANSWER
Most of the room. Moving to a new address breaks every place it is written down, so a good fix keeps the address.

TRANSITION
First, what a quantum computer actually is.

REFERENCES
https://day1-quantum-safe-wallet.vercel.app ; https://github.com/Nuel-osas/day1-quantum-safe-wallet

## 02. Quantum computers: one kind of math

EXPLAIN
A classical bit is 0 or 1. A qubit can hold a blend of both, and many qubits together can represent a huge space of possibilities. The trick is not trying every answer at once; it is interference: the algorithm is arranged so wrong answers cancel and the right one gets stronger. That only works for problems with special structure. Two algorithms matter to us. Shor finds periods, which breaks factoring and discrete logarithms: RSA and every elliptic curve signature. Grover speeds up brute-force search, but only by a square root, so a 256-bit hash keeps about 128 bits of security. The Google Quantum AI paper (2026) puts a 256-bit curve at under 1,200 logical qubits, or minutes on under half a million physical qubits; no machine today can run it.

SHOW / DO
Write two lines on the board: Shor: exponential speedup, breaks public-key signatures. Grover: square-root speedup, weakens hashes and AES a little.

ASK THE ROOM
If quantum computers are so powerful, why will they not replace your laptop?

EXPECTED ANSWER
They are only faster on problems with the right structure. For spreadsheets, games or a web server they offer nothing, and they need extreme cooling and error correction.

TRANSITION
So what exactly breaks, and what does not?

REFERENCES
https://research.google/pubs/securing-elliptic-curve-cryptocurrencies-against-quantum-vulnerabilities-resource-estimates-and-mitigations/ (Babbush, Zalcman, Gidney, Drake, Boneh and others, 2026)

## 03. What breaks and what does not

EXPLAIN
A Sui address is BLAKE2b-256 of the scheme flag and the public key. Grover only halves a hash, so the address itself is fine. What breaks is the signature scheme behind it: Ed25519, secp256k1 and secp256r1, which passkeys use. zkLogin is elliptic-curve math too: a Groth16 proof plus a short-lived classical key. Mysten's own blog says the exposure is "concentrated almost entirely in signatures rather than hashing". Repeat the framing: this is every chain, not a Sui problem.

SHOW / DO
Ask the room to name what they sign with today: wallet extension, passkey, Google login, hardware wallet. Map each to a row.

ASK THE ROOM
If the address is safe, why can an attacker still take the funds?

EXPECTED ANSWER
The chain only checks signatures. Every transaction you sign publishes your public key; with Shor, the attacker derives the private key from it and signs as you.

TRANSITION
So what does quantum safe actually mean?

REFERENCES
https://www.sui.io/blog/suis-post-quantum-signature-schemes ; Sui address derivation: BLAKE2b-256(flag || public key)

## 04. What quantum safe means, and when to act

EXPLAIN
Quantum safe, or post-quantum, means signatures built on problems Shor does not help with: lattices for ML-DSA, hash functions for SLH-DSA. NIST ran a public competition from 2016 and published FIPS 204 (ML-DSA) and FIPS 205 (SLH-DSA) in August 2024. Falcon, FIPS 206, is still not final, which is one reason Sui chose ML-DSA. Mosca's rule decides timing: X is how long your keys must stay safe, Y is how long migrating takes, Z is how long until a capable quantum computer. If X plus Y is more than Z, you are already late.

SHOW / DO
Do Mosca's rule with the room for a treasury: it must be safe for 10 years, migrating every signer takes 3 years. Nobody knows Z, so the honest answer is start now.

ASK THE ROOM
A meme coin wallet and a 20-year treasury. Which one needs to move first?

EXPECTED ANSWER
The treasury. Its X is large. The meme wallet may be empty long before Z arrives.

TRANSITION
Now part two: the keys themselves.

REFERENCES
https://csrc.nist.gov/pubs/fips/204/final ; https://csrc.nist.gov/pubs/fips/205/final ; https://www.sui.io/blog/suis-post-quantum-signature-schemes (Falcon not final)

## 05. Every key type Sui accepts

EXPLAIN
Sui is unusually flexible: one chain, seven ways to authorise a transaction. Each signature starts with a flag byte. Today only flag 7 is quantum safe. A multisig is as strong as the keys it requires; Mysten's blog describes a two-of-two multisig that needs both a classical and a post-quantum signature, a useful bridge while wallets catch up.

SHOW / DO
Open src/lib/sui.ts or the SDK file cryptography/signature-scheme: SIGNATURE_SCHEME_TO_FLAG lists exactly these.

ASK THE ROOM
Your users sign in with Google through zkLogin. Are they quantum safe?

EXPECTED ANSWER
Not as built today. The proof and the short-lived key are both elliptic-curve based. Sui would need a post-quantum version, or the account moves to ML-DSA.

TRANSITION
Zoom in on the two we use today: Ed25519 and ML-DSA-65.

REFERENCES
@mysten/sui 2.39.0 dist/cryptography/signature-scheme ; https://www.sui.io/blog/suis-post-quantum-signature-schemes

## 06. ML-DSA-65 against Ed25519

EXPLAIN
ML-DSA is the lattice signature NIST standardised as FIPS 204; 65 is the middle parameter set, NIST level 3, which Sui chose over the cheaper level. What you back up does not change: a 32-byte seed, from the same phrase. The price is size: a Sui transaction carries flag, signature and public key, 5,262 bytes against 97. Mysten measured verification at parity with today, so validators are not slowed down.

SHOW / DO
After the first post-quantum send in the app, the size bar shows 97 B against the 5,262 B it measured from the real signature.

ASK THE ROOM
Sign the same transaction twice with ML-DSA-65 and you get two different signatures. Bug?

EXPECTED ANSWER
No. Hedged signing mixes fresh randomness into every signature, which hardens it against fault and side-channel attacks. Both verify. Never treat a signature as a unique id.

TRANSITION
Part three: how did the world handle a change like this before?

REFERENCES
https://csrc.nist.gov/pubs/fips/204/final ; https://www.sui.io/blog/suis-post-quantum-signature-schemes ; @mysten/sui/keypairs/mldsa65

## 07. How migrations have gone before

EXPLAIN
SHA-1: weaknesses were published in 2005, browsers only stopped trusting SHA-1 certificates in early 2017, and the first public collision (SHAttered) landed weeks later. Bitcoin hides public keys behind a hash until you spend, but reused and old outputs have visible keys, and BIP-360, a draft for outputs ready for post-quantum signatures, entered the BIP repository only in February 2026. Ethereum accounts cannot change their key; Vitalik Buterin's 2024 plan B is a recovery hard fork after theft starts. The lesson is crypto agility: the ability to swap the algorithm without breaking identities.

SHOW / DO
Ask: which of these would you rather be on the day a quantum computer is announced?

ASK THE ROOM
Why not just wait for the emergency and hard fork, like Ethereum's plan B?

EXPECTED ANSWER
A fork after theft starts means rolling back blocks, new software for everyone, and some users still lose funds. Migrating before is cheap; migrating during is chaos.

TRANSITION
So how does Sui do it?

REFERENCES
shattered.io and the Chromium SHA-1 deprecation (Chrome 56, Jan 2017) ; BIP-360 (draft, merged 11 Feb 2026) ; ethresear.ch "How to hard-fork to save most users' funds in a quantum emergency" (Mar 2024)

## 08. How Sui solves it

EXPLAIN
Sui adds ML-DSA-65 as a native key type, derived from the phrase people already have, and address aliases let an existing address accept the new key and drop the old one. It is opt-in: nothing moves until the owner signs. For the most valuable assets, Mysten plans SLH-DSA vaults checked in Move, hash-based and very conservative. In reserve, a Mysten paper shows how an EdDSA owner could prove they know their seed in zero knowledge, which works even for exposed keys; Mysten calls it a killswitch, not a launch feature. This builds on key rotation you may have seen with us: multisig, zkLogin, and October's passkeys with aliases.

SHOW / DO
Draw an address with a list of keys behind it. Add Q. Remove X. The address never moves.

ASK THE ROOM
Why is it opt-in instead of Sui upgrading every account automatically?

EXPECTED ANSWER
Adding a key to an account needs the current key's signature. If Sui could add keys without you, so could an attacker.

TRANSITION
Where can you use it today?

REFERENCES
https://www.sui.io/blog/suis-post-quantum-signature-schemes ; https://eprint.iacr.org/2025/1368 (Baldimtsi, Chalkias, Roy, Sedaghat; FC 2026)

## 09. Live status: devnet only, for now

EXPLAIN
Sui ships post-quantum signing behind a protocol feature flag: on for devnet, off for testnet and mainnet. Mainnet moved to protocol 141 in early November and the flag stayed off, so check the flag, not the version. Mysten's plan: testnet by the end of 2026, mainnet in the first quarter of 2027 at the latest, subject to audits. Even then nothing switches by itself; each account opts in.

SHOW / DO
The network check card in the app runs this query live against all three networks. If it says unknown, the request failed; that is not the same as off.

ASK THE ROOM
Why does the app show unknown instead of off when the request fails?

EXPECTED ANSWER
A failed read is not evidence. Showing off would be a guess presented as fact.

TRANSITION
Part four: hands on. Path A, a quantum-safe key.

REFERENCES
https://graphql.devnet.sui.io/graphql ; https://graphql.testnet.sui.io/graphql ; https://graphql.mainnet.sui.io/graphql ; https://www.sui.io/blog/suis-post-quantum-signature-schemes

## 10. Path A: a quantum-safe key

EXPLAIN
deriveKeypair takes the phrase and an optional path. Ed25519 defaults to m/44'/784'/0'/0'/0', the path Sui wallets use. MLDSA65Keypair defaults to m/94'/784'/0'/0'/0'. Q has its own address, because an address is a hash of the flag and the public key. Path A suits new users and new treasuries: start on Q and there is nothing to migrate. Path B is for addresses you want to keep.

SHOW / DO
Click Create a new wallet in the app. Two addresses appear: X, the classic key, and Q, the quantum-safe key. Fund X from the faucet, fund Q from X, then send with Q and watch the size bar.

ASK THE ROOM
Both keys come from the same phrase. If the phrase leaks, what happens?

EXPECTED ANSWER
Both keys leak. The phrase is the root secret. A post-quantum key protects against a quantum attacker, not against a stolen phrase.

TRANSITION
Path B: keep the address you already have.

REFERENCES
@mysten/sui 2.39.0: Ed25519Keypair.deriveKeypair, MLDSA65Keypair.deriveKeypair, DEFAULT_MLDSA65_DERIVATION_PATH

## 11. Path B: upgrade a wallet, keep its address

EXPLAIN
Order is the whole lesson. enable, add and remove are entry functions in sui::address_alias (0x2), so each must be a top-level command, and enable and add cannot share a transaction. The AddressAliases object id is derived from 0xa and the address, so the app reads it without an indexer. After step 4 the list holds only Q, and validators demand Q for anything X sends. Do this while the old key is still safe: on the day Ed25519 can be forged, an attacker could add their own key instead.

SHOW / DO
Click the four buttons in card 02, then Prove. Open src/lib/sui.ts: aliasEnable, aliasAdd and aliasRemove are three framework calls, no custom Move.

ASK THE ROOM
What happens if you run step 4 before step 3 and Q turns out to be wrong or lost?

EXPECTED ANSWER
X is locked for good: the only key on its list is one you cannot use. Q-Wallet allows Retire as soon as Q is listed, fine for a devnet class. A production wallet should require a successful signature from Q as X first.

TRANSITION
Proof that it worked.

REFERENCES
sui::address_alias (enable, add, remove) ; src/lib/sui.ts

## 12. Proof: the run on the live site

EXPLAIN
Every row is a real devnet transaction from the live site. X is an Ed25519 address and Q an ML-DSA-65 address. The last row is the moment of the lesson: after retirement the old key cannot sign for its own address any more.

SHOW / DO
Open one ML-DSA-65 transaction on a devnet explorer and point at the signature size. Then run pnpm e2e yourself and compare.

ASK THE ROOM
Devnet is reset from time to time. What happens to these digests?

EXPECTED ANSWER
They disappear from explorers. That is why the speaker notes say to rerun the e2e on the morning of class and replace them if needed.

TRANSITION
What will bite you, and how to run it yourself.

REFERENCES
https://day1-quantum-safe-wallet.vercel.app ; scripts/.e2e-result.json

## 13. Run Q-Wallet, and what will bite you

EXPLAIN
Everyone runs it on their own laptop. Keys stay in the browser and the app talks straight to the devnet full node over gRPC. api/faucet.ts exists only because the devnet faucet sends no CORS headers; it holds no keys. The six gotchas on the right all came up while building and running Q-Wallet.

SHOW / DO
Do the clicks live on the projector, saying which key signs each time. Then the room repeats it in pairs, one funded account per pair if the faucet rate-limits.

ASK THE ROOM
Which of the six would cost a real user their account?

EXPECTED ANSWER
Order. Retiring the classic key before the new key has worked can lock an account for good. The others cost time or bytes.

TRANSITION
What to take home.

REFERENCES
https://github.com/Nuel-osas/day1-quantum-safe-wallet ; https://day1-quantum-safe-wallet.vercel.app

## 14. Change the key, keep the address.

EXPLAIN
Three things to remember: quantum breaks signature keys, not hashes or addresses; Sui's fix is a new key type plus aliases, so the address stays; and it is opt-in, so someone has to make the switch, ideally a wallet with one prompt, and before the old key can be forged.

SHOW / DO
Leave the app on the final screen with the refusal visible.

ASK THE ROOM
What would you migrate first: your own deploy key, a treasury, or user wallets?

EXPECTED ANSWER
Long-lived, high-value keys first: treasuries, upgrade authority holders, multisig members. User wallets follow once wallets support the key type.

TRANSITION
Day 2: native USDC with CCTP V2. We build our own bridge, with a fee and with gas we pay for our users.
