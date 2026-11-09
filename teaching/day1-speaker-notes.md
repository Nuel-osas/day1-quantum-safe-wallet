# Day 1 Speaker Notes: Quantum-Safe Sui

Keys, Dollars and Bitcoin, Day 1, SuiHub Lagos. Deck: teaching/Day1_Quantum_Safe_Sui.pptx (13 slides, rebuilt with `pnpm slides`). App: https://day1-quantum-safe-wallet.vercel.app. Repo: https://github.com/Nuel-osas/day1-quantum-safe-wallet.

## Before class

- Run `APP_URL=https://day1-quantum-safe-wallet.vercel.app pnpm e2e` on the morning of class. Devnet is wiped from time to time; if the slide 10 digests have gone, paste in the new ones from scripts/.e2e-result.json and rebuild the deck.
- Check the flag: the network check card in the app, or the protocolConfigs query on slide 4. On 8 Nov 2026: devnet 141 on, testnet 140 off, mainnet 141 off.
- Students need Node 22+, pnpm and a browser. No wallet extension and no environment variables.
- The devnet faucet rate-limits by IP. Plan one classic account per pair, with faucet.sui.io as the fallback.

## Run of show (about two hours)

| Slides | Minutes | What happens |
|---|---|---|
| 1 to 2 | 10 | Cover, why keys need a way out, the one idea |
| 3 to 4 | 15 | What ML-DSA-65 is, where it is live |
| 5 to 6 | 15 | One phrase, two keys; create a wallet in the app |
| 7 to 9 | 25 | The migration, live in the app, then the code |
| 10 to 11 | 15 | The verified run, the six gotchas |
| 12 | 30 | Everyone runs Q-Wallet and completes the five clicks |
| 13 | 5 | Take home, Day 2 preview |


## 01. q-wallet: Quantum-Safe Sui

EXPLAIN
Today is one problem and one fix. A large enough quantum computer could forge the signatures every Sui wallet makes today. Sui has added a post-quantum key type, ML-DSA-65, and address aliases let an existing account move onto it without changing its address. We build Q-Wallet, which does exactly that on devnet.

SHOW / DO
Open https://day1-quantum-safe-wallet.vercel.app on the projector and leave it on the onboarding screen. Ask everyone to clone https://github.com/Nuel-osas/day1-quantum-safe-wallet and run pnpm install while you talk. Node 22 or newer and pnpm.

ASK THE ROOM
Who has an address they would hate to change? An exchange deposit address, a payroll address, a treasury, a name people know?

EXPECTED ANSWER
Most of the room. Moving to a new address is expensive and breaks every place it is written down, so the fix has to keep the address.

TRANSITION
First, what exactly breaks.

REFERENCES
https://day1-quantum-safe-wallet.vercel.app ; https://github.com/Nuel-osas/day1-quantum-safe-wallet

## 02. Quantum breaks keys, not addresses.

EXPLAIN
A Sui address is a hash of a scheme flag and a public key. The attacker wants the private key, and Shor's algorithm recovers it from the public key for every elliptic curve scheme Sui supports today: Ed25519, secp256k1 and secp256r1, which passkeys also use. The address is not the weak point. So the fix is to let the address accept a different kind of key. Say it plainly: no machine can do this today, and every major chain uses the same curves. This class is about being early, not about Sui being at risk.

SHOW / DO
Draw on the board: address = hash(flag, public key). Signing reveals the public key. A quantum computer turns public key into private key. Then draw the fix: an alias list on the address, the new key added, the old key removed.

ASK THE ROOM
Machines that can do this do not exist yet. Why act now?

EXPECTED ANSWER
Public keys are already onchain for every account that has signed, so the target list exists today. Moving millions of accounts takes years, and long-lived value needs a path before the machine arrives.

TRANSITION
So what is the new key?

REFERENCES
https://csrc.nist.gov/pubs/fips/204/final

## 03. ML-DSA-65: the key Sui added

EXPLAIN
ML-DSA is the lattice signature NIST standardised as FIPS 204; 65 is the middle parameter set. Sui gives it signature flag 7. Its security rests on lattice problems with no known efficient quantum attack. The price is size: the public key is 61 times larger and the signature about 52 times larger. A Sui transaction carries flag, signature and public key together, so 5,262 bytes against 97.

SHOW / DO
Point at the last three rows. After the first post-quantum send in the app, the size bar shows 97 B against the 5,262 B it measured from the real signature.

ASK THE ROOM
Sign the same transaction twice with ML-DSA-65 and you get two different signatures. Bug?

EXPECTED ANSWER
No. Hedged signing mixes 32 fresh random bytes into every signature, which hardens it against fault and side-channel attacks. Both verify. Never treat a signature as a unique id.

TRANSITION
Where can you use it today?

REFERENCES
https://csrc.nist.gov/pubs/fips/204/final ; @mysten/sui 2.39.0, @mysten/sui/keypairs/mldsa65 (keypair.d.mts documents the 32-byte seed and hedged signing)

## 04. Live status: devnet only, for now

EXPLAIN
Sui ships post-quantum signing behind a protocol feature flag. It is on for devnet and off for testnet and mainnet. Mainnet moved from protocol 140 to 141 between our checks on 6 and 8 November and the flag stayed off, so an upgrade alone does not switch it on: check the flag, not the version. The plan is testnet at the end of 2026 and mainnet in the first quarter of 2027.

SHOW / DO
The network check card in the app runs this query live against all three networks. If it says unknown, the request failed; that is not the same as off.

ASK THE ROOM
Why does the app show unknown instead of off when the request fails?

EXPECTED ANSWER
A failed read is not evidence. Showing off would be a guess presented as fact, and people or scripts might act on it.

TRANSITION
Now we build. Part one: keys.

REFERENCES
https://graphql.devnet.sui.io/graphql ; https://graphql.testnet.sui.io/graphql ; https://graphql.mainnet.sui.io/graphql ; src/lib/sui.ts readPqFlags

## 05. 01 One phrase, two keys

EXPLAIN
Every Sui wallet turns a 12-word phrase into an Ed25519 key. The SDK can derive an ML-DSA-65 key from the same phrase on a different path, so the user backs up nothing new.

SHOW / DO
Click Create a new wallet in the app. Two addresses appear: X, the classic key, and Q, the quantum-safe key. Show the phrase button.

ASK THE ROOM
Both keys come from the same phrase. If the phrase leaks, what happens?

EXPECTED ANSWER
Both keys leak. The phrase is the root secret. A post-quantum key protects against a quantum attacker, not against a stolen phrase.

TRANSITION
Here is the code.

## 06. Derive both keys from one phrase

EXPLAIN
deriveKeypair takes the phrase and an optional path. Ed25519 defaults to m/44'/784'/0'/0'/0', the path Sui wallets use. MLDSA65Keypair defaults to m/94'/784'/0'/0'/0'. The ML-DSA secret is a 32-byte seed; the 4,032-byte signing key is expanded from it, so exporting gives an ordinary suiprivkey string.

SHOW / DO
Open src/lib/keys.ts. Point at fromSecret: you can also import an existing classic devnet key, which is how you would migrate an account you already own.

ASK THE ROOM
Why is Q a different address from X when both come from the same phrase?

EXPECTED ANSWER
An address is a hash of the scheme flag and the public key. Different scheme, different key, different hash.

TRANSITION
Now the part that keeps the address: aliases.

REFERENCES
@mysten/sui 2.39.0: Ed25519Keypair.deriveKeypair, MLDSA65Keypair.deriveKeypair, DEFAULT_MLDSA65_DERIVATION_PATH

## 07. 02 Move the account, keep the address

EXPLAIN
An address can keep a list of other addresses whose keys may sign for it: address aliases. In October we used them to link passkeys across devices. Today we add the quantum-safe address, then remove the classic one.

SHOW / DO
Scroll to card 02 in the app: the four-step strip and the alias list under it.

ASK THE ROOM
In October we linked two passkeys with aliases. What is different today?

EXPECTED ANSWER
Then both keys stayed valid. Today the end state removes the original key, so only the post-quantum key can sign for the address.

TRANSITION
Five transactions, in order.

## 08. Five transactions, one address

EXPLAIN
Order is the whole lesson. enable, add and remove are entry functions in sui::address_alias, so each must be a top-level command, and enable and add cannot share a transaction. The AddressAliases object id is derived from 0xa and the address, so the app reads it without an indexer. After step 4 the list holds only Q, and validators demand Q for anything X sends.

SHOW / DO
Click the four buttons in card 02. The alias list updates after each one. Then click Prove: the refusal comes straight from the validators.

ASK THE ROOM
What happens if you run step 4 before step 3 and Q turns out to be wrong or lost?

EXPECTED ANSWER
X is locked for good: the only key on its list is one you cannot use. Q-Wallet enables Retire as soon as Q is on the list, which is fine for a devnet class. A production wallet should require a successful signature from Q as X first.

TRANSITION
The code for those calls.

## 09. Aliases: three framework calls

EXPLAIN
These are the only Move calls in the migration and all three live in the Sui framework. signAndRun builds the transaction with sender X and signs it with whichever key you pass. When the signer is an alias of the sender, validators accept it.

SHOW / DO
Open src/lib/sui.ts and walk signAndRun: setSender, build, signTransaction, executeTransaction. signatureBytes is how the app measures 5,262.

ASK THE ROOM
Steps 3 and 4 have sender X but are signed by Q. Who pays the gas?

EXPECTED ANSWER
X. The gas comes from the sender's coins; the alias only authorises the signature. Q needs no SUI for these steps.

TRANSITION
Did it really happen? Here is the run.

REFERENCES
sui::address_alias in the Sui framework ; src/lib/sui.ts ; src/App.tsx

## 10. Proof: the run on the live site

EXPLAIN
Every row came from the end-to-end script clicking the real app on the live site. Read the Sender column: the last three all send from X, two of them signed by the post-quantum key, and the classic key is refused at the end. Same address throughout.

SHOW / DO
Open 86bwyUpu... on suiscan.xyz/devnet and point at the sender: X. Devnet is wiped from time to time. All six digests still resolved on 8 Nov; rerun pnpm e2e on the morning of class and swap in fresh ones if they have gone.

ASK THE ROOM
What does the explorer show as the sender of the Send as X transaction?

EXPECTED ANSWER
X, the classic address. The signature on it is ML-DSA-65 from Q.

TRANSITION
Before you try it, the traps.

REFERENCES
scripts/e2e-browser.ts ; https://suiscan.xyz/devnet/tx/86bwyUpu6yUhoqcruHEhZsGyNu53CofXvEUmfWzWF2uK

## 11. Six things that will bite you

EXPLAIN
Walk all six. The first four are about the protocol; the last two are about running a class or a demo.

SHOW / DO
If the faucet refuses a laptop, use faucet.sui.io in the browser, or have one person in each pair fund the other from their classic address.

ASK THE ROOM
Which of these six would hurt a production app most?

EXPECTED ANSWER
Order. Retiring the classic key before the new key has worked can lock an account for good. The others cost time or bytes; that one costs the account.

TRANSITION
Your turn to run it.

## 12. Run Q-Wallet yourself

EXPLAIN
Everyone runs it on their own laptop. Keys stay in the browser and the app talks straight to the devnet full node over gRPC. api/faucet.ts exists only because the devnet faucet sends no CORS headers; it holds no keys.

SHOW / DO
Do the five clicks live on the projector, saying which key signs each time. Then the room repeats it in pairs.

ASK THE ROOM
What would have to change to run this on mainnet?

EXPECTED ANSWER
The network constants in src/lib/sui.ts, the faucet (mainnet has none) and key storage. The signing code should not need to change, but it only works once mldsa65_auth is on there.

TRANSITION
What to take home.

REFERENCES
https://github.com/Nuel-osas/day1-quantum-safe-wallet ; https://day1-quantum-safe-wallet.vercel.app

## 13. Change the key, keep the address.

EXPLAIN
Three things to remember: the key type exists and derives from the same phrase; aliases move an account without changing its address; and it is devnet only until the flag turns on elsewhere.

SHOW / DO
Leave the app on the final screen with the refusal visible.

ASK THE ROOM
What would you migrate first: your own deploy key, a treasury, or user wallets?

EXPECTED ANSWER
Long-lived, high-value keys first: treasuries, upgrade authority holders, multisig members. User wallets follow once wallets support the key type.

TRANSITION
Day 2: native USDC with CCTP V2. We build our own bridge, with a fee and with gas we pay for our users.
