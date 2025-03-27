DROP TABLE IF EXISTS "magic_link_token";
DROP TABLE IF EXISTS "session";
DROP TABLE IF EXISTS "user";

CREATE TABLE "user" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "email_verified" INTEGER DEFAULT 0
);

CREATE TABLE "session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "expires_at" INTEGER NOT NULL,
  FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE "magic_link_token" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "expires_at" INTEGER NOT NULL,
  "created_at" INTEGER NOT NULL,
  FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE
);

/*
===================================================================================
Indexes to improve performance for specific operations in our src/lib/auth API
===================================================================================
*/
-- Used by getUserByEmail() to efficiently find users by their email address
CREATE UNIQUE INDEX "user_email_idx" ON "user" ("email");

-- Used by invalidateAllSessions() to find all sessions for a specific user
CREATE INDEX "session_user_id_idx" ON "session" ("user_id");

-- Used by validateSessionToken() when checking for expired sessions
CREATE INDEX "session_expires_at_idx" ON "session" ("expires_at");

-- Used when looking up tokens by user_id
CREATE INDEX "magic_link_token_user_id_idx" ON "magic_link_token" ("user_id");

-- Used when validating tokens that contain a specific email address
CREATE INDEX "magic_link_token_email_idx" ON "magic_link_token" ("email");

-- Used when checking for expired tokens
CREATE INDEX "magic_link_token_expires_at_idx" ON "magic_link_token" ("expires_at");

-- Optional: index on created_at for efficient rate limiting queries
CREATE INDEX "magic_link_token_created_at_idx" ON "magic_link_token" ("created_at");
