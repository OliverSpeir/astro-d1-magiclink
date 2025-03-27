import { sha256Hash } from "./utils";
import type { Session, User } from "./types";
import type { ActionAPIContext } from "astro:actions";
import type { APIContext } from "astro";

export async function createSession(
  token: string,
  userId: string,
  runtime: ActionAPIContext["locals"]["runtime"]
) {
  const sessionId = await sha256Hash(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

  const session: Session = {
    id: sessionId,
    userId,
    expiresAt,
  };

  await runtime.env.DB.prepare(
    "INSERT INTO session (id, user_id, expires_at) VALUES (?, ?, ?)"
  )
    .bind(
      session.id,
      session.userId,
      Math.floor(session.expiresAt.getTime() / 1000)
    )
    .run();

  return session;
}

export async function validateSessionToken(
  token: string,
  runtime:
    | ActionAPIContext["locals"]["runtime"]
    | APIContext["locals"]["runtime"]
) {
  const sessionId = await sha256Hash(token);

  const result = await runtime.env.DB.prepare(
    `
    SELECT session.id, session.user_id, session.expires_at,
    user.id as user_id, user.email, user.email_verified
    FROM session
    INNER JOIN user ON user.id = session.user_id
    WHERE session.id = ?
    `
  )
    .bind(sessionId)
    .first();

  if (!result) {
    return { session: null, user: null };
  }

  const session: Session = {
    id: result.id as string,
    userId: result.user_id as string,
    expiresAt: new Date((result.expires_at as number) * 1000),
  };

  const user: User = {
    id: result.user_id as string,
    email: result.email as string,
    emailVerified: Boolean(result.email_verified),
  };

  if (Date.now() >= session.expiresAt.getTime()) {
    await invalidateSession(session.id, runtime);
    return { session: null, user: null };
  }

  // Extend session if it's close to expiring (15 days remaining)
  // Lucia's recommendation
  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await runtime.env.DB.prepare(
      "UPDATE session SET expires_at = ? WHERE id = ?"
    )
      .bind(Math.floor(session.expiresAt.getTime() / 1000), session.id)
      .run();
  }

  return { session, user };
}

export async function invalidateSession(
  sessionId: string,
  runtime: ActionAPIContext["locals"]["runtime"]
) {
  await runtime.env.DB.prepare("DELETE FROM session WHERE id = ?")
    .bind(sessionId)
    .run();
}

export async function invalidateAllSessions(
  userId: string,
  runtime: ActionAPIContext["locals"]["runtime"]
) {
  await runtime.env.DB.prepare("DELETE FROM session WHERE user_id = ?")
    .bind(userId)
    .run();
}
