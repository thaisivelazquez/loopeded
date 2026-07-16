import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { requireCurrentUser } from "../../../../lib/auth";
import { jsonError, withCors, corsPreflight } from "../../../../lib/format";

export async function OPTIONS() {
  return corsPreflight();
}

// DELETE /api/events/:id
// Backs <EventDetail />'s "cancel" / "call it off" action, and the cancel
// button on your own board cards. Host-only; also clears joins and any
// pings that reference the event so nothing dangles.
export async function DELETE(request, { params }) {
  try {
    const user = await requireCurrentUser();
    const { id } = params;

    const { rows } = await query(`SELECT "hostId" FROM "Event" WHERE id = $1`, [id]);
    if (!rows[0]) {
      return withCors(NextResponse.json({ error: "not found" }, { status: 404 }));
    }
    if (rows[0].hostId !== user.id) {
      return withCors(NextResponse.json({ error: "only the host can cancel this" }, { status: 403 }));
    }

    await query(`DELETE FROM "Ping" WHERE "eventId" = $1`, [id]);
    await query(`DELETE FROM "EventJoin" WHERE "eventId" = $1`, [id]);
    await query(`DELETE FROM "Event" WHERE id = $1`, [id]);

    return withCors(NextResponse.json({ ok: true }));
  } catch (err) {
    return jsonError(err);
  }
}
