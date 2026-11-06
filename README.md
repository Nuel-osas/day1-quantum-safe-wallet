# Q-Wallet · Day 1

The class app for **Quantum-Safe Sui: Post-Quantum Keys and Moving Your Account Without Changing Its Address** at SuiHub Lagos.

One seed phrase gives you today's Ed25519 key and an ML-DSA-65 post-quantum key. You send with the post-quantum key, then move the classic account onto it with address aliases: same address, same balance, and the classic key stops working.

**Devnet only.** ML-DSA-65 signing (`mldsa65_auth`) is on for Sui devnet and off for testnet and mainnet. Testnet is planned for the end of 2026 and mainnet is targeted for Q1 2027. The app reads the flag live from all three networks.

## Run it

Node 22+ and pnpm:

```sh
pnpm install
pnpm dev          # http://localhost:5292
pnpm build
pnpm e2e          # clicks through the whole flow in headless Chrome on devnet
```

No environment variables. The only server code is `api/faucet.ts`, which forwards one request to Sui's public devnet faucet, because that faucet sends no CORS headers. It holds no keys.

## The flow

1. **Create a new wallet.** A 12-word phrase derives two keys: Ed25519 at `m/44'/784'/0'/0'/0'` (what wallets use today) and ML-DSA-65 at `m/94'/784'/0'/0'/0'` (`MLDSA65Keypair.deriveKeypair`). You can also restore a phrase or import an existing devnet `suiprivkey`.
2. **Fund.** Faucet the classic address, then fund the quantum-safe address from it.
3. **Send with ML-DSA-65.** The serialized signature the validators check is 5,262 bytes (flag + 3,309-byte signature + 1,952-byte public key), against 97 bytes for Ed25519.
4. **Upgrade the classic account.** Turn on aliases and add the quantum-safe address (both signed by the classic key). Then send as the classic address and remove the classic key from its own alias list (both signed by ML-DSA-65).
5. **Prove the old key is dead.** The classic key is now refused: validators require a signature from the quantum-safe key.

## Verified on devnet, 6 November 2026

Full browser run through the app (`pnpm e2e`), classic `0xccf681c6...2215fc9`, quantum-safe `0xbca5357a...7e6320`:

| Step | Signed by | Digest |
|---|---|---|
| Fund the quantum-safe key | Ed25519 | 5ncQgR8oXxRsW1b9CDzK1EmhW8qacgAcFB8nNGhjiVrF |
| Send with ML-DSA-65 | ML-DSA-65 | 9Y4cezzHGoCDfdMLK4aJMpGwzz3UwLAhAivPPUmZMYrq |
| Turn on aliases | Ed25519 | DCXC6Be5w9XiPaj35XT1aXZJsUAZih4MzS5XNqftu82H |
| Add quantum-safe key as alias | Ed25519 | CaKNYEnxzu2RiQV2i8cuLDXjaZ2Tn4Zefh1Cbfa1Zfqi |
| Send as the classic address | ML-DSA-65 | 8gCLecbqxjBy6n59XhpcEbSNKfvd7W4wEh6SNHm7kwBj |
| Retire the classic key | ML-DSA-65 | At5oEH3exn5tCkF1dPKQSVxT85zjH28aTft9EcjraJja |
| Classic key afterwards | Ed25519 | refused: "Required Signature from 0xbca5357a... is absent" |

Devnet is reset from time to time, so these digests may disappear from explorers. Rerun `pnpm e2e` on the morning of class.

## Gotchas

- **Devnet only.** The same code fails on testnet and mainnet until `mldsa65_auth` is switched on there.
- **Size.** A post-quantum transaction is about 5 KB larger. Fine for a user transaction; think twice for anything that batches many signatures.
- **Signatures are randomized.** Signing the same bytes twice gives two different valid signatures (hedged signing).
- **Order matters.** `address_alias::enable` and `add` cannot share a transaction. Remove the classic key only after the quantum-safe key has signed successfully as the account.
- **Faucet limits.** The devnet faucet rate-limits by IP. In a full room, fund one classic account per pair, or use faucet.sui.io.
- **Keys live in localStorage.** Fine for devnet teaching, never for real funds. Clearing site data loses the phrase.

## Code map

- `src/lib/keys.ts`: one phrase, two keys; importing a classic `suiprivkey`
- `src/lib/sui.ts`: devnet gRPC client, alias helpers (`enable`, `add`, `remove`, derived `AddressAliases` id), `signAndRun`, live `mldsa65_auth` check over GraphQL
- `src/App.tsx`: the UI
- `api/faucet.ts`: devnet faucet relay
- `scripts/e2e-browser.ts`: end-to-end run
