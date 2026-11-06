// Shared by the browser app, the faucet function and the scripts. Devnet only: ML-DSA-65
// (mldsa65_auth) is not enabled on testnet or mainnet yet.
import { bcs } from '@mysten/sui/bcs';
import type { Signer } from '@mysten/sui/cryptography';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { deriveObjectID, fromBase64, normalizeSuiAddress } from '@mysten/sui/utils';

export const NETWORK = 'devnet' as const;
export const GRPC_URL = 'https://fullnode.devnet.sui.io:443';
export const EXPLORER = 'https://suiscan.xyz/devnet';
export const txLink = (d: string) => `${EXPLORER}/tx/${d}`;
export const acctLink = (a: string) => `${EXPLORER}/account/${a}`;

export const client = new SuiGrpcClient({ network: NETWORK, baseUrl: GRPC_URL });

// sui::address_alias. AddressAliasState is the system singleton at 0xa; each address's
// AddressAliases object is derived from (0xa, AliasKey(address)), so no indexer is needed.
const ALIAS_STATE_ID = normalizeSuiAddress('0xa');
export function aliasesObjectId(owner: string) {
	return deriveObjectID(ALIAS_STATE_ID, '0x2::address_alias::AliasKey', bcs.Address.serialize(normalizeSuiAddress(owner)).toBytes());
}
const AddressAliasesBcs = bcs.struct('AddressAliases', {
	id: bcs.Address,
	aliases: bcs.struct('VecSet', { contents: bcs.vector(bcs.Address) }),
});
export type AliasState = { enabled: boolean; objectId: string; aliases: string[] };

// Same rule the validator applies: no object means only the address's own key can sign.
export async function readAliasState(owner: string): Promise<AliasState> {
	const objectId = aliasesObjectId(owner);
	try {
		const { object } = await client.core.getObject({ objectId, include: { content: true } });
		return { enabled: true, objectId, aliases: AddressAliasesBcs.parse(object.content!).aliases.contents };
	} catch (e) {
		if (/not found|NotFound|does not exist/i.test(String(e))) return { enabled: false, objectId, aliases: [normalizeSuiAddress(owner)] };
		throw e;
	}
}

// Alias functions are `entry`: each must be its own top-level PTB command.
export const aliasEnable = (tx: Transaction) =>
	tx.moveCall({ target: '0x2::address_alias::enable', arguments: [tx.object(ALIAS_STATE_ID)] });
export const aliasAdd = (tx: Transaction, aliasesId: string, alias: string) =>
	tx.moveCall({ target: '0x2::address_alias::add', arguments: [tx.object(aliasesId), tx.pure.address(alias)] });
export const aliasRemove = (tx: Transaction, aliasesId: string, alias: string) =>
	tx.moveCall({ target: '0x2::address_alias::remove', arguments: [tx.object(aliasesId), tx.pure.address(alias)] });

export const MIST = 1_000_000_000n;
export function fromMist(v: string | bigint, dp = 4) {
	const n = BigInt(v);
	const whole = n / MIST;
	const frac = (n % MIST).toString().padStart(9, '0').slice(0, dp).replace(/0+$/, '');
	return frac ? `${whole}.${frac}` : `${whole}`;
}
export function toMist(amount: string): bigint {
	const [w, f = ''] = amount.trim().split('.');
	if (!/^\d*$/.test(w) || !/^\d*$/.test(f) || f.length > 9) throw new Error('Enter an amount like 0.001');
	return BigInt(w || '0') * MIST + BigInt((f + '000000000').slice(0, 9));
}

export async function suiBalance(owner: string): Promise<bigint> {
	const { balance } = await client.core.getBalance({ owner });
	return BigInt(balance.balance);
}

export type Sent = { digest: string; ok: boolean; error: string | null; signatureBytes: number };

// Build with `sender`, sign with `signer`. When the signer is an alias of the sender, the
// validator accepts it because the signer's address is in the sender's AddressAliases list.
export async function signAndRun(sender: string, signer: Signer, build: (tx: Transaction) => void): Promise<Sent> {
	const tx = new Transaction();
	tx.setSender(sender);
	build(tx);
	const bytes = await tx.build({ client });
	const { signature } = await signer.signTransaction(bytes);
	const r = await client.core.executeTransaction({ transaction: bytes, signatures: [signature], include: { effects: true } });
	const t = r.Transaction ?? r.FailedTransaction!;
	await client.core.waitForTransaction({ digest: t.digest }).catch(() => {});
	return {
		digest: t.digest,
		ok: t.status.success,
		error: t.status.success ? null : JSON.stringify(t.status.error),
		signatureBytes: fromBase64(signature).length,
	};
}

export type Flag = { network: string; protocol: number | null; mldsa: boolean | null };

// Read the post-quantum switch straight from each network. A failed read is unknown (null), not "off".
export async function readPqFlags(): Promise<Flag[]> {
	return Promise.all(
		['devnet', 'testnet', 'mainnet'].map(async (network) => {
			try {
				const r = await fetch(`https://graphql.${network}.sui.io/graphql`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ query: '{ protocolConfigs { protocolVersion featureFlags { key value } } }' }),
				});
				const c = (await r.json()).data.protocolConfigs;
				const f = c.featureFlags.find((x: { key: string }) => x.key === 'mldsa65_auth');
				return { network, protocol: Number(c.protocolVersion), mldsa: f ? Boolean(f.value) : false };
			} catch {
				return { network, protocol: null, mldsa: null };
			}
		}),
	);
}
