// Supabase types used by this platform (admin auth + storage).

/** Shape of a Supabase Auth user relevant to the admin panel. */
interface AdminAuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
}

/** Result of validating an admin session token. */
interface AdminSessionResult {
  ok: boolean;
  user?: AdminAuthUser;
  error?: string;
}