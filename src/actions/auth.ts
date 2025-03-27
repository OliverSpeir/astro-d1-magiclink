import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import {
  getUserByEmail,
  createUser,
  createMagicLinkToken,
  deleteSessionTokenCookie,
  invalidateSession,
  sha256Hash,
  getLatestMagicLinkTokenForUser,
  setUserEmailCookie,
  deleteUserEmailCookie,
} from "@auth";
import { sendMagicLinkEmail } from "@modules/server/sendEmail";

const ALLOWED_EMAILS: string[] = [];
const BLOCKED_EMAILS: string[] = [];

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
        const now = Math.floor(Date.now() / 1000);
        const recentToken = await getLatestMagicLinkTokenForUser(
          user.id,
          context.locals.runtime
        );
        if (recentToken && now < recentToken.created_at + 30) {
          throw new ActionError({
            code: "TOO_MANY_REQUESTS",
            message:
              "A sign-in link was recently sent. Please wait 30 seconds before requesting a new link.",
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
      if (!user) {
        user = await createUser(email, context.locals.runtime);
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
        const now = Math.floor(Date.now() / 1000);
        const recentToken = await getLatestMagicLinkTokenForUser(
          user.id,
          context.locals.runtime
        );
        if (recentToken && now < recentToken.created_at + 30) {
          throw new ActionError({
            code: "TOO_MANY_REQUESTS",
            message:
              "A sign-in link was recently sent. Please wait 30 seconds before resending.",
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
