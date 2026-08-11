import { NextResponse } from "next/server";
import { query } from "../../../lib/db";
import { requireCurrentUser } from "../../../lib/auth";
import { jsonError, withCors, corsPreflight } from "../../../lib/format";

export async function OPTIONS(request) {
  return corsPreflight(request);
}

// GET /api/me
// Shaped for <Profile />'s stat row: statPosted, statJoined, statFriends.
// NOTE: in v1 "posts" means activities you've hosted, not the old
// free-text Post table (that was a different app's "what's up?" board) —
// so postsCount now counts "Event" rows, not "Post" rows.
export async function GET(request) {
  try {
    const user = await requireCurrentUser(request);

    const { rows: friendRows } = await query(
      `SELECT COUNT(*)::int AS count FROM "Friendship" WHERE status = 'accepted' AND $1 IN ("userAId", "userBId")`,
      [user.id]
    );
    const { rows: postRows } = await query(
      `SELECT COUNT(*)::int AS count FROM "Event" WHERE "hostId" = $1`,
      [user.id]
    );
    const { rows: joinRows } = await query(
      `SELECT COUNT(*)::int AS count FROM "EventJoin" WHERE "userId" = $1`,
      [user.id]
    );

    return withCors(
      NextResponse.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        bio: user.bio || "",
        friendsCount: friendRows[0].count,
        postsCount: postRows[0].count,
        joinedCount: joinRows[0].count
      })
    );
  } catch (err) {
    return jsonError(err);
  }
}

// DELETE /api/me — permanently delete your account.
// Removes everything that belongs to you, in dependency order so nothing
// is left dangling:
//   1. Pings you sent/received, plus pings tied to events you host
//   2. Your EventJoins, plus everyone else's EventJoins on events you host
//      (so no one's left "going" to an event whose host no longer exists)
//   3. Events you host
//   4. Every Friendship row you're part of, pending or accepted — this is
//      a real unfriend for the other side too, not just a delisting
//   5. Your User row itself
// Then clears the session cookie the same way /api/logout does, since
// there's no account left to be signed into.
export async function DELETE(request) {
  try {
    const user = await requireCurrentUser(request);

    await query(
      `DELETE FROM "Ping"
        WHERE "recipientId" = $1
           OR "requesterId" = $1
           OR "eventId" IN (SELECT id FROM "Event" WHERE "hostId" = $1)`,
      [user.id]
    );

    await query(
      `DELETE FROM "EventJoin"
        WHERE "userId" = $1
           OR "eventId" IN (SELECT id FROM "Event" WHERE "hostId" = $1)`,
      [user.id]
    );

    await query(`DELETE FROM "Event" WHERE "hostId" = $1`, [user.id]);

    await query(`DELETE FROM "Friendship" WHERE $1 IN ("userAId", "userBId")`, [user.id]);

    await query(`DELETE FROM "User" WHERE id = $1`, [user.id]);

    const res = withCors(NextResponse.json({ ok: true }));
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

// PATCH /api/me   body: { bio: string }
export async function PATCH(request) {
  try {
    const user = await requireCurrentUser(request);
    const body = await request.json();

    if (typeof body.bio !== "string") {
      return withCors(NextResponse.json({ error: "bio must be a string" }, { status: 400 }));
    }
    const bio = body.bio.trim().slice(0, 280);

    const { rows } = await query(`UPDATE "User" SET bio = $1 WHERE id = $2 RETURNING bio`, [bio, user.id]);

    return withCors(NextResponse.json({ bio: rows[0].bio }));
  } catch (err) {
    return jsonError(err);
  }
}