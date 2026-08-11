// ====================================================
// SAVE TO: backend/app/api/events/[id]/join/route.js
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

// POST /api/events/:id/join   — "i'm in" / "i'll be there!"
// If the event has a spot cap and it's already full, this does NOT auto-join
// — it pings the host with an "asked to join" notification instead, matching
// the "ask to join" state <EventDetail /> shows once an event is full.
//
// Mirrors the same visibility rule GET /api/events filters the board by
// ('everyone' open to anyone, 'outer'/'inner' require an ACCEPTED
// friendship — a pending request grants nothing). That list-level filter
// only stops an event from showing up on someone's board; it doesn't stop
// someone who already has the event id from hitting this route directly,
// so the same check needs to happen here too, or a pending request (or a
// total stranger) could join — or trigger an "asked to join" ping to the
// host — for an event they were never able to see in the first place.
export async function POST(request, { params }) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = params;

    const { rows: eventRows } = await query(
      `SELECT e.*,
              (SELECT COUNT(*)::int FROM "EventJoin" WHERE "eventId" = e.id) AS "joinCount",
              (
                e.visibility = 'everyone'
                OR e."hostId" = $2
                OR (
                  e.visibility = 'outer'
                  AND EXISTS (
                    SELECT 1 FROM "Friendship" f
                     WHERE f.status = 'accepted'
                       AND (
                         (f."userAId" = $2 AND f."userBId" = e."hostId") OR
                         (f."userBId" = $2 AND f."userAId" = e."hostId")
                       )
                  )
                )
                OR (
                  e.visibility = 'inner'
                  AND EXISTS (
                    SELECT 1 FROM "Friendship" f
                     WHERE f.status = 'accepted'
                       AND (
                         (f."userAId" = e."hostId" AND f."userBId" = $2 AND f."circleA" = 'inner') OR
                         (f."userBId" = e."hostId" AND f."userAId" = $2 AND f."circleB" = 'inner')
                       )
                  )
                )
              ) AS "canSee"
         FROM "Event" e WHERE e.id = $1`,
      [id, user.id]
    );
    const event = eventRows[0];
    // Same response for "doesn't exist" and "you can't see this" — a 403
    // here would confirm a private event's existence to someone who was
    // never supposed to know about it.
    if (!event || !event.canSee) {
      return withCors(NextResponse.json({ error: "not found" }, { status: 404 }));
    }

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

// DELETE /api/events/:id/join — back out quietly. Still lets the host know,
// same as joining does, just with a different tone — "back out quietly"
// describes what it does to the person leaving (no confirmation dance, no
// guilt-trip modal), not that it happens invisibly to the host.
export async function DELETE(request, { params }) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = params;

    const { rows: eventRows } = await query(`SELECT "hostId", title FROM "Event" WHERE id = $1`, [id]);
    const event = eventRows[0];

    const { rowCount } = await query(
      `DELETE FROM "EventJoin" WHERE "eventId" = $1 AND "userId" = $2`,
      [id, user.id]
    );

    // Only notify if they were actually in (no-op deletes shouldn't ping
    // anyone) and they're not the host backing out of their own event.
    if (event && rowCount > 0 && event.hostId !== user.id) {
      await notifyUser({
        recipientId: event.hostId,
        eventId: id,
        text: `${user.firstName.toLowerCase()} can't make it to ${event.title} anymore`
      });
    }

    return withCors(NextResponse.json({ joined: false }));
  } catch (err) {
    return jsonError(err);
  }
}