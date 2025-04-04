import type { APIContext, AstroGlobal } from "astro";
import type { ActionAPIContext } from "astro:actions";

/**
 * Set a session cookie named "session"
 */
export function setSessionTokenCookie(
  context: APIContext,
  token: string,
  expiresAt: Date
) {
  context.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    expires: expiresAt,
    path: "/",
  });
}

/**
 * Delete/clear the session cookie named "session"
 */
export function deleteSessionTokenCookie(
  context: APIContext | ActionAPIContext
) {
  context.cookies.set("session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: 0,
    path: "/",
  });
}

/**
 * Set a  cookie named "userEmail" to track an in progress login
 */
export function setUserEmailCookie(
  context: APIContext | ActionAPIContext,
  email: string
) {
  context.cookies.set("userEmail", email, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    path: "/",
    maxAge: 60 * 15,
    sameSite: "lax",
  });
}

/**
 * Delete cookie named "userEmail" to reset an in progress login
 */
export function deleteUserEmailCookie(
  context: APIContext | ActionAPIContext | AstroGlobal
) {
  context.cookies.delete("userEmail", { path: "/" });
}

export function getUserEmailFromCookie(
  context: APIContext | ActionAPIContext | AstroGlobal
) {
  const emailCookie = context.cookies.get("userEmail");
  return emailCookie?.value;
}
