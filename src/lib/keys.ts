// One seed phrase, two keys. Today's wallets derive Ed25519 at m/44'/784'; ML-DSA-65 derives
// from the same phrase at m/94'/784'. Devnet demo only: the phrase lives in localStorage.
import { decodeSuiPrivateKey, type Keypair } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { MLDSA65Keypair } from '@mysten/sui/keypairs/mldsa65';
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
import { Secp256r1Keypair } from '@mysten/sui/keypairs/secp256r1';
import { generateMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

export type Saved = { mnemonic: string; importedClassic?: string };
export type Keys = { classic: Keypair; quantum: MLDSA65Keypair; mnemonic: string; imported: boolean };

const KEY = 'qwallet-v1';

export function newPhrase() {
	return generateMnemonic(wordlist, 128);
}

export function keysFrom(saved: Saved): Keys {
	const mnemonic = saved.mnemonic.trim().toLowerCase().split(/\s+/).join(' ');
	if (!validateMnemonic(mnemonic, wordlist)) throw new Error('That is not a valid 12 or 24 word phrase');
	return {
		mnemonic,
		classic: saved.importedClassic ? fromSecret(saved.importedClassic) : Ed25519Keypair.deriveKeypair(mnemonic),
		quantum: MLDSA65Keypair.deriveKeypair(mnemonic),
		imported: !!saved.importedClassic,
	};
}

// Bring an existing devnet account: any suiprivkey the CLI or a wallet exports.
export function fromSecret(secret: string): Keypair {
	const { scheme, secretKey } = decodeSuiPrivateKey(secret.trim());
	if (scheme === 'ED25519') return Ed25519Keypair.fromSecretKey(secretKey);
	if (scheme === 'Secp256k1') return Secp256k1Keypair.fromSecretKey(secretKey);
	if (scheme === 'Secp256r1') return Secp256r1Keypair.fromSecretKey(secretKey);
	throw new Error(`Import a classic key (Ed25519 or Secp256k1/r1), not ${scheme}`);
}

export const store = {
	load(): Saved | null {
		try {
			return JSON.parse(localStorage.getItem(KEY) ?? 'null');
		} catch {
			return null;
		}
	},
	save(s: Saved) {
		try {
			localStorage.setItem(KEY, JSON.stringify(s));
		} catch {}
	},
	clear() {
		try {
			localStorage.removeItem(KEY);
		} catch {}
	},
};
