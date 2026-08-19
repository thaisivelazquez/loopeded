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
// Permanently deletes the signed-in user's account and everything tied to
// it: events they hosted (and anyone else's joins/pings on those events),
// their own joins on other people's events, every friendship they're part
// of, and every ping that mentions them (as recipient or requester) —
// before finally deleting the User row itself. This is NOT a soft delete;
// there's no undo. Order matters here since none of these tables have
// ON DELETE CASCADE set up, so we clear dependents before their parents.
export async function DELETE(request) {
  try {
    const user = await requireCurrentUser(request);

    // 1. Pings that reference an event this user hosts (has to happen
    //    before we can delete those events).
    await query(
      `DELETE FROM "Ping" WHERE "eventId" IN (SELECT id FROM "Event" WHERE "hostId" = $1)`,
      [user.id]
    );
    // 2. Anyone else's joins on events this user hosts (has to happen
    //    before we can delete those events).
    await query(
      `DELETE FROM "EventJoin" WHERE "eventId" IN (SELECT id FROM "Event" WHERE "hostId" = $1)`,
      [user.id]
    );
    // 3. Events this user hosts.
    await query(`DELETE FROM "Event" WHERE "hostId" = $1`, [user.id]);

    // 4. This user's own joins on other people's (still-existing) events.
    await query(`DELETE FROM "EventJoin" WHERE "userId" = $1`, [user.id]);

    // 5. Every ping that mentions this user, either as the recipient or as
    //    the person who triggered it (e.g. "X asked to join", a friend
    //    request from them).
    await query(
      `DELETE FROM "Ping" WHERE "recipientId" = $1 OR "requesterId" = $1`,
      [user.id]
    );

    // 6. Every friendship this user is part of, in either direction.
    await query(
      `DELETE FROM "Friendship" WHERE "userAId" = $1 OR "userBId" = $1`,
      [user.id]
    );

    // 7. The account itself.
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