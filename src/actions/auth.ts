import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import {
  getUserByEmail,
  createUser,
  createMagicLinkToken,
  deleteSessionTokenCookie,
  invalidateSession,
  sha256Hash,
  setUserEmailCookie,
  deleteUserEmailCookie,
  shouldRateLimitMagicLinkToken,
  BLOCKED_EMAILS,
  ALLOWED_EMAILS,
} from "@auth";
import { sendMagicLinkEmail } from "@modules/server/sendEmail";

export const auth = {
  signin: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
    }),
    handler: async ({ email }, context) => {
      setUserEmailCookie(context, email);

      const user = await getUserByEmail(email, context.locals.runtime);
      if (user) {
        const shouldRateLimit = await shouldRateLimitMagicLinkToken(
          user.id,
          30,
          context.locals.runtime
        );

        if (shouldRateLimit) {
          throw new ActionError({
            code: "TOO_MANY_REQUESTS",
            message: "Please wait 30 seconds and try again.",
          });
        }

        const tokenId = await createMagicLinkToken(
          user.id,
          user.email,
          context.locals.runtime
        );
        const verifyUrl = new URL("/login/verify", context.request.url);
        verifyUrl.searchParams.set("token", tokenId);

        try {
          await sendMagicLinkEmail(
            user.email,
            verifyUrl.toString(),
            context.locals.runtime
          );
        } catch (_error) {
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Something went wrong. Please try again later.",
          });
        }
      }
      return {
        message:
          "If an account with that email exists, a sign-in link has been sent.",
      };
    },
  }),

  signup: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
    }),
    handler: async ({ email }, context) => {
      setUserEmailCookie(context, email);

      if (BLOCKED_EMAILS.length > 0 && BLOCKED_EMAILS.includes(email)) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "This email address is blocked from signing up.",
        });
      }
      if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(email)) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "This email is not allowed to sign up.",
        });
      }

      let user = await getUserByEmail(email, context.locals.runtime);

      if (user) {
        const shouldRateLimit = await shouldRateLimitMagicLinkToken(
          user.id,
          30,
          context.locals.runtime
        );

        if (shouldRateLimit) {
          throw new ActionError({
            code: "TOO_MANY_REQUESTS",
            message: "Please wait 30 seconds and try again.",
          });
        }
      } else {
        user = await createUser(email, context.locals.runtime);

        const shouldRateLimit = await shouldRateLimitMagicLinkToken(
          user.id,
          30,
          context.locals.runtime
        );

        if (shouldRateLimit) {
          throw new ActionError({
            code: "TOO_MANY_REQUESTS",
            message: "Please wait 30 seconds and try again.",
          });
        }
      }

      const tokenId = await createMagicLinkToken(
        user.id,
        user.email,
        context.locals.runtime
      );
      const verifyUrl = new URL("/login/verify", context.request.url);
      verifyUrl.searchParams.set("token", tokenId);

      try {
        await sendMagicLinkEmail(
          user.email,
          verifyUrl.toString(),
          context.locals.runtime
        );
      } catch (_error) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong. Please try again later.",
        });
      }

      return {
        message:
          "We'll attempt to create your account. Please check your email for further instructions.",
      };
    },
  }),

  resend: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
    }),
    handler: async ({ email }, context) => {
      setUserEmailCookie(context, email);

      const user = await getUserByEmail(email, context.locals.runtime);
      if (user) {
        const shouldRateLimit = await shouldRateLimitMagicLinkToken(
          user.id,
          30,
          context.locals.runtime
        );

        if (shouldRateLimit) {
          throw new ActionError({
            code: "TOO_MANY_REQUESTS",
            message: "Please wait 30 seconds and try again.",
          });
        }

        const tokenId = await createMagicLinkToken(
          user.id,
          user.email,
          context.locals.runtime
        );
        const verifyUrl = new URL("/login/verify", context.request.url);
        verifyUrl.searchParams.set("token", tokenId);

        try {
          await sendMagicLinkEmail(
            user.email,
            verifyUrl.toString(),
            context.locals.runtime
          );
        } catch (_error) {
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Something went wrong. Please try again later.",
          });
        }
      }
      return {
        message: "If an account exists for that email, a new link was sent.",
      };
    },
  }),

  signout: defineAction({
    accept: "form",
    input: z.object({}),
    handler: async (_input, context) => {
      const token = context.cookies.get("session")?.value;
      if (token) {
        const hashedId = await sha256Hash(token);
        await invalidateSession(hashedId, context.locals.runtime);
      }
      deleteSessionTokenCookie(context);
      deleteUserEmailCookie(context);
      return { success: true };
    },
  }),

  clearEmail: defineAction({
    accept: "form",
    input: z.object({}),
    handler: async (_input, context) => {
      deleteUserEmailCookie(context);
      return { success: true };
    },
  }),
};
