export type User = {
  id: string;
  email: string;
  emailVerified: boolean;
} | null;

export type Session = {
  id: string;
  userId: string;
  expiresAt: Date;
} | null;

export type MagicLinkToken = {
  id: string;
  user_id: string;
  email: string;
  expires_at: number;
  created_at: number;
};
