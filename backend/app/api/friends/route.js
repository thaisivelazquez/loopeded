import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { query } from "../../../lib/db";
import { requireCurrentUser } from "../../../lib/auth";
import { colorForId } from "../../../lib/colors";
import { jsonError, withCors, corsPreflight } from "../../../lib/format";

export async function OPTIONS() {
  return corsPreflight();
}

// GET /api/friends
// Shaped like the frontend's rawFriends() mock: id, first, last, bio, color.
// (The old version pre-formatted "kat t." server-side — the v1 frontend
// does that itself via fmtName(), so we hand back raw first/last instead.)
export async function GET() {
  try {
    const user = await requireCurrentUser();

    const { rows } = await query(
      `SELECT u.id, u."firstName", u."lastName", u.bio
         FROM "Friendship" f
         JOIN "User" u ON u.id = CASE WHEN f."userAId" = $1 THEN f."userBId" ELSE f."userAId" END
        WHERE f.status = 'accepted'
          AND $1 IN (f."userAId", f."userBId")
        ORDER BY u."firstName" ASC`,
      [user.id]
    );

    const shaped = rows.map((r) => ({
      id: r.id,
      first: r.firstName,
      last: r.lastName,
      bio: r.bio || "no bio yet",
      color: colorForId(r.id)
    }));

    return withCors(NextResponse.json(shaped));
  } catch (err) {
    return jsonError(err);
  }
}

// POST /api/friends   body: { phone: string }  — the invite row in <Friends />
export async function POST(request) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    const phone = (body.phone ?? "").trim();

    if (!phone) {
      return withCors(NextResponse.json({ error: "phone is required" }, { status: 400 }));
    }

    const { rows: candidateRows } = await query(`SELECT id FROM "User" WHERE phone = $1`, [phone]);
    const target = candidateRows[0];

    if (!target) {
      return withCors(
        NextResponse.json({
          invited: false,
          message: "no looped account for that number yet — we texted them an invite"
        })
      );
    }
    if (target.id === user.id) {
      return withCors(NextResponse.json({ error: "you can't friend yourself" }, { status: 400 }));
    }

    const [userAId, userBId] = [user.id, target.id].sort();
    await query(
      `INSERT INTO "Friendship" (id, "userAId", "userBId", status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT ("userAId", "userBId") DO NOTHING`,
      [randomUUID(), userAId, userBId]
    );

    return withCors(NextResponse.json({ invited: true }));
  } catch (err) {
    return jsonError(err);
  }
}
