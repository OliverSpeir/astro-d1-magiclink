import type { ActionAPIContext } from "astro:actions";
import { Resend } from "resend";

export async function sendMagicLinkEmail(
  recipientEmail: string,
  verificationLink: string,
  runtime: ActionAPIContext["locals"]["runtime"]
) {
  const from = "🧙 <onboarding@resend.dev>";
  const to = recipientEmail;
  const subject = "Magic Link 🪄";
  const html = `<p>Sign in with this Magic Link: <a href="${verificationLink}" rel="noreferrer">Sign In</a></p>`;

  const resend = new Resend(runtime.env.RESEND_API_KEY);

  try {
    const response = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    return response;
  } catch (error) {
    throw error;
  }
}
