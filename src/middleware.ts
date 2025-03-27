import { defineMiddleware } from "astro:middleware";

const protectedRoutes = ["/"];

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) {
    return next();
  }

  if (protectedRoutes.includes(context.url.pathname)) {
    const {
      validateSessionToken,
      setSessionTokenCookie,
      deleteSessionTokenCookie,
    } = await import("@auth");

    const token = context.cookies.get("session")?.value ?? null;
    if (token === null) {
      context.locals.user = null;
      context.locals.session = null;
      return next();
    }

    const { session, user } = await validateSessionToken(
      token,
      context.locals.runtime
    );
    if (session && user) {
      setSessionTokenCookie(context, token, session.expiresAt);
    } else {
      deleteSessionTokenCookie(context);
    }

    context.locals.session = session;
    context.locals.user = user;
  }

  return next();
});
