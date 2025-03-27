import type { ActionAPIContext } from "astro:actions";

export async function createUser(
  email: string,
  runtime: ActionAPIContext["locals"]["runtime"]
) {
  const userId = crypto.randomUUID();

  await runtime.env.DB.prepare(
    "INSERT INTO user (id, email, email_verified) VALUES (?, ?, 0)"
  )
    .bind(userId, email)
    .run();

  return {
    id: userId,
    email,
    emailVerified: false,
  };
}

export async function getUserByEmail(
  email: string,
  runtime: ActionAPIContext["locals"]["runtime"]
) {
  const result = await runtime.env.DB.prepare(
    "SELECT id, email, email_verified FROM user WHERE email = ?"
  )
    .bind(email)
    .first();

  if (!result) return null;

  return {
    id: result.id as string,
    email: result.email as string,
    emailVerified: Boolean(result.email_verified),
  };
}

export async function getUserById(
  userId: string,
  runtime: ActionAPIContext["locals"]["runtime"]
) {
  const result = await runtime.env.DB.prepare(
    "SELECT id, email, email_verified FROM user WHERE id = ?"
  )
    .bind(userId)
    .first();

  if (!result) return null;

  return {
    id: result.id as string,
    email: result.email as string,
    emailVerified: Boolean(result.email_verified),
  };
}

export async function markEmailAsVerified(
  userId: string,
  runtime: ActionAPIContext["locals"]["runtime"]
) {
  await runtime.env.DB.prepare(
    "UPDATE user SET email_verified = 1 WHERE id = ?"
  )
    .bind(userId)
    .run();
}
