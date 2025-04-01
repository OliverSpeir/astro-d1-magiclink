# Astro D1 Actions Magic Link Auth

Inspired / based on [Lucia-auth basic API](https://lucia-auth.com/sessions/basic-api/) sqlite, with no ORM

As it stands this is a pretty painfully slow implementation, if I do the zero js form submits without `.callAction()` its a roughly 15-25% faster (probably zod or maybe how the workers are split up), but still around 800ms. What I think is necessary to make this login flow not feel bad UX wise is call the actions from the client and show some optimistic messages or loading messages.

## Tech

1. [Cloudflare D1](https://developers.cloudflare.com/d1/)
2. [Resend](https://resend.com/)
3. [Astro Actions](https://docs.astro.build/en/guides/actions/)
4. [Astro Scoped Styles](https://docs.astro.build/en/guides/styling/#scoped-styles)
5. [Astro on-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/)

## Walkthrough

- Creates an [`@auth`](./src/lib/auth/) API with useful functions, and requires zero deps.
- Handles sessions within [middleware](./src/middleware.ts) for certain routes, but relies on those routes to protect themselves
- Creates a set of actions ([actions.auth](./src/actions/auth.ts)) which use the [`@auth` API](./src/lib/auth)
- Attempts to be [Progressive Enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement), meaning requires zero JS to work, meaning all actions are submit via html forms
- Attempts to rate limit emails in the [auth actions](./src/actions/auth.ts) based on the token createdAt time
- Uses [schema.sql](./src/lib/db/schema.sql) and creates indexes in attempt to improve performance (didn't test if these help)
- Attempts to provide opaque messaging to prevent enumeration attacks on existing accounts
- Will not sign in if user has not signed up, but will sign in if user has already signed up and tries to sign up again
  - not 100% sure about this pattern but maybe supports some special sign up stuff in future, but does create friction if user doesn't realize they must sign up first
- Has a non action based [endpoint for verification](./src/pages/login/verify.ts), looked into having it use actions but it just didn't feel right, this is my first actions project

## Dev Experience / Deploying

- Uses Astro Dev server, and wrangler cli
- `wrangler types && astro dev`
- `wrangler d1 create magic-links-prod`
- `wrangler d1 execute magic-links-prod --local --file=./src/lib/db/schema.sql` for dev server
- `wrangler d1 execute magic-links-prod --remote --file=./src/lib/db/schema.sql` in prod from cli
- Secrets added via dashboard in prod (`RESEND_API_KEY`) 
  - View project -> settings -> variables and secrets -> add secret and redeploy
- Didn't bother with local or preview DB for dev
- Created a resend account and tested via the onboarding email (which can only send to your account's email)

## Notes

This project made me excited for [Astro Sessions](https://docs.astro.build/en/reference/experimental-flags/sessions/) and things like [laravel's flash data](https://laravel.com/docs/12.x/session#flash-data)
