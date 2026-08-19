// ====================================================
// SAVE TO: backend/app/api/account/route.js
// ====================================================
import { NextResponse } from "next/server";
import { query } from "../../../lib/db";
import { requireCurrentUser } from "../../../lib/auth";
import { jsonError, withCors, corsPreflight } from "../../../lib/format";

export async function OPTIONS(request) {
  return corsPreflight(request);
}

// DELETE /api/account
// Permanently deletes the signed-in user's account. Everything tied to it
// — events they hosted, joins (theirs and others' on their events),
// friendships, and pings that mention them — cascades automatically at
// the database level (ON DELETE CASCADE on each of those foreign keys).
// This is NOT a soft delete; there's no undo.
export async function DELETE(request) {
  try {
    const user = await requireCurrentUser(request);

    await query(`DELETE FROM "User" WHERE id = $1`, [user.id]);

    // Clear the cookie the same way /api/logout does — the bearer token in
    // the frontend's localStorage is cleared client-side after this call
    // succeeds (see api.deleteAccount).
    const res = withCors(NextResponse.json({ ok: true }), request);
    res.cookies.set("userId", "", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
      maxAge: 0
    });
    return res;
  } catch (err) {
    return jsonError(err);
  }
}