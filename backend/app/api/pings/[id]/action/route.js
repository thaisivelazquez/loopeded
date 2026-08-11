// ====================================================
// SAVE TO: backend/app/api/pings/[id]/action/route.js
// ====================================================
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { query } from "../../../../../lib/db";
import { requireCurrentUser } from "../../../../../lib/auth";
import { jsonError, withCors, corsPreflight } from "../../../../../lib/format";
import { notifyUser } from "../../../../../lib/notify";

export async function OPTIONS(request) {
  return corsPreflight(request);
}

// POST /api/pings/:id/action   body (optional): { decision: 'accept' | 'decline' }
// Backs a ping row's action button(s).
// - Friend-request ping (has requesterId): 'accept' marks the Friendship
//   accepted (so they now show up in your friends list and any outer/inner
//   events unlock for each other); 'decline' deletes the Friendship row
//   entirely, so they're free to request again later. Defaults to 'accept'
//   if no decision is sent.
// - Event ping (has eventId): unchanged — joins the linked event and marks
//   the ping read, regardless of decision.
export async function POST(request, { params }) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = params;

    let decision = "accept";
    try {
      const body = await request.json();
      if (body?.decision === "decline") decision = "decline";
    } catch (e) {
      // no/empty body — fine, default to accept.
    }

    const { rows } = await query(
      `SELECT "eventId", "requesterId" FROM "Ping" WHERE id = $1 AND "recipientId" = $2`,
      [id, user.id]
    );
    const ping = rows[0];
    if (!ping) return withCors(NextResponse.json({ error: "not found" }, { status: 404 }));

    if (ping.requesterId) {
      const [userAId, userBId] = [user.id, ping.requesterId].sort();

      if (decision === "decline") {
        await query(`DELETE FROM "Friendship" WHERE "userAId" = $1 AND "userBId" = $2`, [
          userAId,
          userBId
        ]);
        await query(`DELETE FROM "Ping" WHERE id = $1`, [id]);
        return withCors(NextResponse.json({ ok: true, declined: true }));
      }

      await query(
        `UPDATE "Friendship" SET status = 'accepted' WHERE "userAId" = $1 AND "userBId" = $2`,
        [userAId, userBId]
      );
      await query(`UPDATE "Ping" SET read = true WHERE id = $1`, [id]);

      // Let the original requester know their request went through — this
      // is the "changing state of notification" half of the friend-request
      // flow: they get a fresh ping since their original "wants to be
      // friends" ping had no cta pointed back at them.
      await notifyUser({
        recipientId: ping.requesterId,
        text: `${user.firstName.toLowerCase()} accepted your friend request`
      });

      return withCors(NextResponse.json({ ok: true, accepted: true }));
    }

    if (ping.eventId) {
      await query(
        `INSERT INTO "EventJoin" (id, "eventId", "userId") VALUES ($1, $2, $3)
         ON CONFLICT ("eventId", "userId") DO NOTHING`,
        [randomUUID(), ping.eventId, user.id]
      );
    }
    await query(`UPDATE "Ping" SET read = true WHERE id = $1`, [id]);

    return withCors(NextResponse.json({ ok: true, joined: !!ping.eventId }));
  } catch (err) {
    return jsonError(err);
  }
}