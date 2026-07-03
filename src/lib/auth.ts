import bs58 from "bs58";
import { verifyAsync } from "@noble/ed25519";
import { db } from "./db";
import { getTokenBalance } from "./solana";
import { ALLOW_DEV_UNLOCK, TOKEN_DISPLAY_NAME } from "./config";
import { authMeasure } from "./measure";

const CHALLENGE_MS = 5 * 60_000;
const SESSION_MS = 12 * 60 * 60_000;

export function createChallenge(publicKey: string) {
  return authMeasure.measure.assert("Create challenge", () => {
    const nonce = crypto.randomUUID();
    const issuedAt = new Date().toISOString();
    const message = [
      "ENTRAIN Studio wallet login",
      "",
      `Wallet: ${publicKey}`,
      `Nonce: ${nonce}`,
      `Issued: ${issuedAt}`,
      `Origin: ${process.env.PUBLIC_ORIGIN || "local-dev"}`,
      "",
      `Sign this message to verify wallet ownership and check your ${TOKEN_DISPLAY_NAME} balance. This does not authorize a transaction.`,
    ].join("\n");
    db.walletChallenges.insert({
      publicKey,
      nonce,
      message,
      expiresAt: Date.now() + CHALLENGE_MS,
      used: false,
    });
    return { nonce, message, expiresAt: Date.now() + CHALLENGE_MS };
  });
}

export async function verifyWallet(
  publicKey: string,
  signature: string,
  nonce: string,
) {
  // Do not wrap this in measure.assert: its generic failure message hides the
  // actionable wallet error from the browser. Keep failures explicit.
  const challenge = db.walletChallenges
    .select()
    .where({ publicKey, nonce, used: false })
    .first() as any;
  if (!challenge)
    throw new Error(
      "Wallet challenge not found. Start wallet verification again.",
    );
  if (challenge.expiresAt < Date.now())
    throw new Error(
      "Wallet challenge expired. Start wallet verification again.",
    );

  let sigBytes: Uint8Array;
  let pubBytes: Uint8Array;
  try {
    sigBytes = bs58.decode(signature);
    pubBytes = bs58.decode(publicKey);
  } catch {
    throw new Error(
      "Wallet signature encoding was invalid. Try connecting Phantom again.",
    );
  }

  const msgBytes = new TextEncoder().encode(challenge.message);
  let ok = false;
  try {
    ok = await verifyAsync(sigBytes, msgBytes, pubBytes);
  } catch {
    throw new Error(
      "Wallet signature verification failed. Try signing the message again.",
    );
  }
  if (!ok)
    throw new Error(
      "Wallet signature did not match the challenge. Try connecting Phantom again.",
    );

  const consumeToken = crypto.randomUUID();
  db.walletChallenges
    .update({ used: true, consumeToken })
    .where({ publicKey, nonce, used: false })
    .run();
  const consumed = db.walletChallenges
    .select()
    .where({ publicKey, nonce, used: true, consumeToken })
    .first() as any;
  if (!consumed)
    throw new Error(
      "Wallet challenge was already used. Start wallet verification again.",
    );
  return await createWalletSession(publicKey);
}

export async function createWalletSession(publicKey: string) {
  return await authMeasure.measure.assert("Create wallet session", async () => {
    const balance = ALLOW_DEV_UNLOCK
      ? 999999
      : await getTokenBalance(publicKey);
    const sessionId = crypto.randomUUID();
    db.walletSessions.insert({
      sessionId,
      publicKey,
      balance,
      expiresAt: Date.now() + SESSION_MS,
      lastRefreshedAt: Date.now(),
    });
    return {
      sessionId,
      publicKey,
      balance,
      maxAgeSec: Math.floor(SESSION_MS / 1000),
      expiresAt: Date.now() + SESSION_MS,
    };
  });
}

export async function refreshWalletSession(sessionId?: string | null) {
  return await authMeasure.measure.assert(
    "Refresh wallet session",
    async () => {
      const current = getAuthSession(sessionId);
      if (!current) throw new Error("Wallet session required");
      return await createWalletSession(current.publicKey);
    },
  );
}

export function getAuthSession(sessionId?: string | null) {
  if (!sessionId) return null;
  const row = db.walletSessions.select().where({ sessionId }).first() as any;
  if (!row || row.expiresAt < Date.now()) return null;
  return {
    sessionId,
    publicKey: row.publicKey as string,
    balance: Number(row.balance || 0),
    expiresAt: Number(row.expiresAt),
    lastRefreshedAt: Number(row.lastRefreshedAt || 0),
  };
}
