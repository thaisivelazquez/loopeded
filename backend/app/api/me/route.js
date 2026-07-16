import { NextResponse } from "next/server";
import { query } from "../../../lib/db";
import { requireCurrentUser } from "../../../lib/auth";
import { jsonError, withCors, corsPreflight } from "../../../lib/format";

export async function OPTIONS() {
  return corsPreflight();
}

// GET /api/me
// Shaped for <Profile />'s stat row: statPosted, statJoined, statFriends.
// NOTE: in v1 "posts" means activities you've hosted, not the old
// free-text Post table (that was a different app's "what's up?" board) —
// so postsCount now counts "Event" rows, not "Post" rows.
export async function GET() {
  try {
    const user = await requireCurrentUser();

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

// PATCH /api/me   body: { bio: string }
export async function PATCH(request) {
  try {
    const user = await requireCurrentUser();
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
