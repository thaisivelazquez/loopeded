// ====================================================
// SAVE TO: backend/app/api/events/[id]/route.js
// ====================================================
import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { requireCurrentUser } from "../../../../lib/auth";
import { jsonError, withCors, corsPreflight } from "../../../../lib/format";
import { notifyUsers } from "../../../../lib/notify";

export async function OPTIONS() {
  return corsPreflight();
}

// DELETE /api/events/:id
// Backs <EventDetail />'s "cancel" / "call it off" action, and the cancel
// button on your own board cards. Host-only; also clears joins and any
// pings that reference the event so nothing dangles. Anyone who had joined
// gets a cancellation notification (ping + SMS) before the row disappears.
export async function DELETE(request, { params }) {
  try {
    const user = await requireCurrentUser();
    const { id } = params;

    const { rows } = await query(`SELECT "hostId", title FROM "Event" WHERE id = $1`, [id]);
    const event = rows[0];
    if (!event) {
      return withCors(NextResponse.json({ error: "not found" }, { status: 404 }));
    }
    if (event.hostId !== user.id) {
      return withCors(NextResponse.json({ error: "only the host can cancel this" }, { status: 403 }));
    }

    const { rows: joinRows } = await query(`SELECT "userId" FROM "EventJoin" WHERE "eventId" = $1`, [id]);
    const joinedIds = joinRows.map((r) => r.userId);

    await query(`DELETE FROM "Ping" WHERE "eventId" = $1`, [id]);
    await query(`DELETE FROM "EventJoin" WHERE "eventId" = $1`, [id]);
    await query(`DELETE FROM "Event" WHERE id = $1`, [id]);

    if (joinedIds.length) {
      // eventId is intentionally omitted (null) — the Event row is already
      // gone by the time this notification is read, so it can't link back.
      await notifyUsers(joinedIds, {
        text: `${event.title} was called off — ${user.firstName.toLowerCase()} cancelled it`
      });
    }

    return withCors(NextResponse.json({ ok: true }));
  } catch (err) {
    return jsonError(err);
  }
}