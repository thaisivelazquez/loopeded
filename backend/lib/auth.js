import { cookies } from "next/headers";
import { query } from "./db";

// -----------------------------------------------------------------------
// This is intentionally a stub. It assumes some earlier login/OTP-verify
// step has set a `userId` cookie. Swap this out for real session handling
// (next-auth, iron-session, a JWT, whatever you use) — every route below
// only depends on `getCurrentUserId()` / `requireCurrentUser()`, so you
// only need to change this one file.
// -----------------------------------------------------------------------

export async function getCurrentUserId() {
  const cookieStore = await cookies();
  return cookieStore.get("userId")?.value ?? null;
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function requireCurrentUser() {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new HttpError(401, "Not authenticated");
  }
  const { rows } = await query(`SELECT * FROM "User" WHERE id = $1`, [userId]);
  if (!rows[0]) {
    throw new HttpError(401, "User not found");
  }
  return rows[0];
}