export const prerender = false;
import type { APIRoute } from "astro";
import {
  validateMagicLinkToken,
  markEmailAsVerified,
  generateSessionToken,
  createSession,
  setSessionTokenCookie,
  deleteUserEmailCookie,
} from "@auth";


export const GET: APIRoute = async (context) => {
  const token = context.url.searchParams.get("token");
  if (!token) {
    return context.redirect("/login?error=MissingToken");
  }

  const tokenData = await validateMagicLinkToken(token, context.locals.runtime);
  if (!tokenData) {
    return context.redirect("/login?error=InvalidOrExpiredToken");
  }

  await markEmailAsVerified(tokenData.userId, context.locals.runtime);

  const rawSessionToken = generateSessionToken();
  const session = await createSession(
    rawSessionToken,
    tokenData.userId,
    context.locals.runtime
  );

  setSessionTokenCookie(context, rawSessionToken, session.expiresAt);
  deleteUserEmailCookie(context);
  return context.redirect("/");
};
