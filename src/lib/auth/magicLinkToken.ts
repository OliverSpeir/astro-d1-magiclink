import type { ActionAPIContext } from "astro:actions";
import type { MagicLinkToken } from "./types";

export async function createMagicLinkToken(
  userId: string,
  email: string,
  runtime: ActionAPIContext["locals"]["runtime"]
) {
  const tokenId = crypto.randomUUID();
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

  return tokenId;
}

export async function validateMagicLinkToken(
  tokenId: string,
  runtime: ActionAPIContext["locals"]["runtime"]
) {
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

// maybe useful on a cron or something if we care
export async function cleanupExpiredTokens(
  runtime: ActionAPIContext["locals"]["runtime"]
) {
  const now = Math.floor(Date.now() / 1000);

  await runtime.env.DB.prepare(
    "DELETE FROM magic_link_token WHERE expires_at < ?"
  )
    .bind(now)
    .run();
}
