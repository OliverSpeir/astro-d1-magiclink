import type { ActionAPIContext } from "astro:actions";
import type { MagicLinkToken } from "./types";
import { generateToken, sha256Hash } from "./utils";

export async function createMagicLinkToken(
  userId: string,
  email: string,
  runtime: ActionAPIContext["locals"]["runtime"]
) {
  const rawToken = generateToken();
  const tokenId = await sha256Hash(rawToken);

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 900; // 15 minutes

  await runtime.env.DB.prepare("DELETE FROM magic_link_token WHERE user_id = ?")
    .bind(userId)
    .run();

  await runtime.env.DB.prepare(
    "INSERT INTO magic_link_token (id, user_id, email, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(tokenId, userId, email, expiresAt, now)
    .run();

  return rawToken;
}

export async function validateMagicLinkToken(
  rawToken: string,
  runtime: ActionAPIContext["locals"]["runtime"]
) {
  const tokenId = await sha256Hash(rawToken);

  const result = await runtime.env.DB.prepare(
    "SELECT user_id, email, expires_at FROM magic_link_token WHERE id = ?"
  )
    .bind(tokenId)
    .first();

  if (!result) return null;

  const expiresAt = (result.expires_at as number) * 1000;
  if (Date.now() >= expiresAt) {
    await runtime.env.DB.prepare("DELETE FROM magic_link_token WHERE id = ?")
      .bind(tokenId)
      .run();
    return null;
  }

  await runtime.env.DB.prepare("DELETE FROM magic_link_token WHERE id = ?")
    .bind(tokenId)
    .run();

  return {
    userId: result.user_id as string,
    email: result.email as string,
  };
}

export async function getLatestMagicLinkTokenForUser(
  userId: string,
  runtime: ActionAPIContext["locals"]["runtime"]
) {
  const result = await runtime.env.DB.prepare(
    "SELECT * FROM magic_link_token WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"
  )
    .bind(userId)
    .first();

  return result as MagicLinkToken | null;
}

export async function shouldRateLimitMagicLinkToken(
  userId: string,
  limitSeconds: number = 30,
  runtime: ActionAPIContext["locals"]["runtime"]
) {
  const now = Math.floor(Date.now() / 1000);

  const recentToken = await getLatestMagicLinkTokenForUser(userId, runtime);

  if (recentToken && now < recentToken.created_at + limitSeconds) {
    return true;
  }

  return false;
}
