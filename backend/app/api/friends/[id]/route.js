// ====================================================
// SAVE TO: backend/app/api/friends/[id]/route.js
// ====================================================
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { query } from "../../../../lib/db";
import { requireCurrentUser } from "../../../../lib/auth";
import { jsonError, withCors, corsPreflight } from "../../../../lib/format";
import { notifyUser } from "../../../../lib/notify";

export async function OPTIONS() {
  return corsPreflight();
}

// POST /api/friends/:id — send a friend request to a suggested user from
// onboarding. This now goes through the SAME mutual pending -> accept flow
// as the phone-invite path (POST /api/friends) — it used to create an
// instantly-'accepted' friendship with no consent from the other person at
// all, which meant anyone could put themselves in your outer circle
// without you ever agreeing to it. Now it just sends a request; the other
// person has to accept it (via the ping's accept/decline buttons) before
// the friendship — and therefore any circle placement — exists at all.
export async function POST(request, { params }) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = params;
    if (id === user.id) {
      return withCors(NextResponse.json({ error: "you can't friend yourself" }, { status: 400 }));
    }

    const [userAId, userBId] = [user.id, id].sort();
    const { rows: friendshipRows } = await query(
      `INSERT INTO "Friendship" (id, "userAId", "userBId", status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT ("userAId", "userBId") DO NOTHING
       RETURNING id`,
      [randomUUID(), userAId, userBId]
    );

    // Only ping on a brand-new request — ON CONFLICT DO NOTHING means no
    // row comes back if you two already have a pending or accepted
    // Friendship, so this won't re-notify on a repeat tap.
    if (friendshipRows[0]) {
      await notifyUser({
        recipientId: id,
        requesterId: user.id,
        text: `${user.firstName} wants to be friends`,
        cta: "accept"
      });
    }

    return withCors(NextResponse.json({ requested: true }));
  } catch (err) {
    return jsonError(err);
  }
}

// PATCH /api/friends/:id   body: { circle: 'inner' | 'outer' }
// Lets you move a friend between your inner and outer circle. This is
// per-direction — it only updates *your* side of the Friendship row
// ("circleA" if you're userA, "circleB" if you're userB), so your friend's
// own view of the circle they've put you in is untouched.
export async function PATCH(request, { params }) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = params;
    const body = await request.json();
    const circle = body.circle === "inner" ? "inner" : "outer";

    const [userAId, userBId] = [user.id, id].sort();
    const column = user.id === userAId ? '"circleA"' : '"circleB"';

    const { rows } = await query(
      `UPDATE "Friendship" SET ${column} = $1
        WHERE "userAId" = $2 AND "userBId" = $3 AND status = 'accepted'
        RETURNING id`,
      [circle, userAId, userBId]
    );

    if (!rows[0]) {
      return withCors(NextResponse.json({ error: "not friends with that user" }, { status: 404 }));
    }

    return withCors(NextResponse.json({ id, circle }));
  } catch (err) {
    return jsonError(err);
  }
}

// DELETE /api/friends/:id — unadd (used by the toggle in onboarding step 2).
export async function DELETE(request, { params }) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = params;
    const [userAId, userBId] = [user.id, id].sort();
    await query(`DELETE FROM "Friendship" WHERE "userAId" = $1 AND "userBId" = $2`, [userAId, userBId]);
    return withCors(NextResponse.json({ added: false }));
  } catch (err) {
    return jsonError(err);
  }
}