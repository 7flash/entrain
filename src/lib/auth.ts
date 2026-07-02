import bs58 from 'bs58';
import { verify } from '@noble/ed25519';
import { db } from './db';
import { getTokenBalance } from './solana';
import { ALLOW_DEV_UNLOCK } from './config';
import { authMeasure } from './measure';

const CHALLENGE_MS = 5 * 60_000;
const SESSION_MS = 12 * 60 * 60_000;

export function createChallenge(publicKey: string) {
  return authMeasure.measure.assert('Create challenge', () => {
    const nonce = crypto.randomUUID();
    const message = `ENTRAIN wallet login\n\nWallet: ${publicKey}\nNonce: ${nonce}\nIssued: ${new Date().toISOString()}\n\nSign this message to verify wallet ownership. This does not authorize a transaction.`;
    db.walletChallenges.insert({ publicKey, nonce, message, expiresAt: Date.now() + CHALLENGE_MS, used: false });
    return { nonce, message, expiresAt: Date.now() + CHALLENGE_MS };
  });
}

export async function verifyWallet(publicKey: string, signature: string, nonce: string) {
  return await authMeasure.measure.assert('Verify wallet', async () => {
    const challenge = db.walletChallenges.select().where({ publicKey, nonce, used: false }).first() as any;
    if (!challenge) throw new Error('Challenge not found');
    if (challenge.expiresAt < Date.now()) throw new Error('Challenge expired');

    const msgBytes = new TextEncoder().encode(challenge.message);
    const sigBytes = bs58.decode(signature);
    const pubBytes = bs58.decode(publicKey);
    const ok = await verify(sigBytes, msgBytes, pubBytes);
    if (!ok) throw new Error('Invalid wallet signature');

    challenge.used = true;
    const balance = ALLOW_DEV_UNLOCK ? 999999 : await getTokenBalance(publicKey);
    const sessionId = crypto.randomUUID();
    db.walletSessions.insert({ sessionId, publicKey, balance, expiresAt: Date.now() + SESSION_MS });
    return { sessionId, publicKey, balance, maxAgeSec: Math.floor(SESSION_MS / 1000) };
  });
}

export function getAuthSession(sessionId?: string | null) {
  if (!sessionId) return null;
  const row = db.walletSessions.select().where({ sessionId }).first() as any;
  if (!row || row.expiresAt < Date.now()) return null;
  return { publicKey: row.publicKey as string, balance: Number(row.balance || 0), expiresAt: Number(row.expiresAt) };
}
