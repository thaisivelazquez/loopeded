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

// POST /api/friends/:id — "add" a suggested user from onboarding.
// Same request/accept flow as the phone-invite path (POST /api/friends):
// this sends a pending request, it does NOT make you friends on the spot.
// The other person has to actually hit "accept" on the resulting ping
// before either of you show up in each other's friends list — nobody
// should end up someone's friend without agreeing to it.
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
    // Friendship, so this won't spam a repeat "add" tap.
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

// DELETE /api/friends/:id — unfriend (also used to cancel a pending request).
// A Friendship row is a single record shared by both people, so deleting it
// already ends the friendship for both sides at once — there's no separate
// "their side" left dangling. But being unfriended should mean fully
// disentangled, not just delisted, so this also:
//   - pulls each of you out of any event the other is hosting (an ex-friend
//     shouldn't linger on your guest list, or you on theirs)
//   - clears pings between you: the friend-request ping itself, plus any
//     event notifications tied to events either of you hosts, so nothing
//     from this friendship keeps surfacing after it's over
export async function DELETE(request, { params }) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = params;
    const [userAId, userBId] = [user.id, id].sort();

    await query(
      `DELETE FROM "EventJoin"
        WHERE ("userId" = $1 AND "eventId" IN (SELECT id FROM "Event" WHERE "hostId" = $2))
           OR ("userId" = $2 AND "eventId" IN (SELECT id FROM "Event" WHERE "hostId" = $1))`,
      [user.id, id]
    );

    await query(
      `DELETE FROM "Ping"
        WHERE ("recipientId" = $1 AND "requesterId" = $2)
           OR ("recipientId" = $2 AND "requesterId" = $1)
           OR ("recipientId" = $1 AND "eventId" IN (SELECT id FROM "Event" WHERE "hostId" = $2))
           OR ("recipientId" = $2 AND "eventId" IN (SELECT id FROM "Event" WHERE "hostId" = $1))`,
      [user.id, id]
    );

    await query(`DELETE FROM "Friendship" WHERE "userAId" = $1 AND "userBId" = $2`, [userAId, userBId]);

    return withCors(NextResponse.json({ added: false }));
  } catch (err) {
    return jsonError(err);
  }
}