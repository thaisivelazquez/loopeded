// ====================================================
// SAVE TO: backend/app/api/events/[id]/join/route.js
// ====================================================
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { query } from "../../../../../lib/db";
import { requireCurrentUser } from "../../../../../lib/auth";
import { jsonError, withCors, corsPreflight } from "../../../../../lib/format";
import { notifyUser } from "../../../../../lib/notify";

export async function OPTIONS() {
  return corsPreflight();
}

// POST /api/events/:id/join   — "i'm in" / "i'll be there!"
// If the event has a spot cap and it's already full, this does NOT auto-join
// — it pings the host with an "asked to join" notification instead, matching
// the "ask to join" state <EventDetail /> shows once an event is full.
export async function POST(request, { params }) {
  try {
    const user = await requireCurrentUser();
    const { id } = params;

    const { rows: eventRows } = await query(
      `SELECT e.*, (SELECT COUNT(*)::int FROM "EventJoin" WHERE "eventId" = e.id) AS "joinCount"
         FROM "Event" e WHERE e.id = $1`,
      [id]
    );
    const event = eventRows[0];
    if (!event) return withCors(NextResponse.json({ error: "not found" }, { status: 404 }));

    const full = event.spots > 0 && event.joinCount >= event.spots;
    if (full) {
      await notifyUser({
        recipientId: event.hostId,
        eventId: id,
        text: `${user.firstName.toLowerCase()} asked to join ${event.title}`
      });
      return withCors(NextResponse.json({ joined: false, asked: true }));
    }

    await query(
      `INSERT INTO "EventJoin" (id, "eventId", "userId") VALUES ($1, $2, $3)
       ON CONFLICT ("eventId", "userId") DO NOTHING`,
      [randomUUID(), id, user.id]
    );

    if (event.hostId !== user.id) {
      await notifyUser({
        recipientId: event.hostId,
        eventId: id,
        text: `${user.firstName.toLowerCase()} is going to ${event.title}`
      });
    }

    return withCors(NextResponse.json({ joined: true }));
  } catch (err) {
    return jsonError(err);
  }
}

// DELETE /api/events/:id/join — back out quietly
export async function DELETE(request, { params }) {
  try {
    const user = await requireCurrentUser();
    const { id } = params;
    await query(`DELETE FROM "EventJoin" WHERE "eventId" = $1 AND "userId" = $2`, [id, user.id]);
    return withCors(NextResponse.json({ joined: false }));
  } catch (err) {
    return jsonError(err);
  }
}