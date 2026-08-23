// ====================================================
// SAVE TO: backend/app/api/pings/[id]/route.js
// ====================================================
import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { requireCurrentUser } from "../../../../lib/auth";
import { jsonError, withCors, corsPreflight } from "../../../../lib/format";

export async function OPTIONS(request) {
  return corsPreflight(request);
}

// PATCH /api/pings/:id — marks a single ping read, with no other side
// effects (no joining an event, no accepting/declining a friend request).
// Backs tapping into a ping to view the event it's about — the "act"
// button already marks read as a side effect of joining, but a plain tap
// that just opens the event shouldn't also join it. Recipient-only.
export async function PATCH(request, { params }) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = params;

    const { rows } = await query(
      `UPDATE "Ping" SET read = true WHERE id = $1 AND "recipientId" = $2 RETURNING id`,
      [id, user.id]
    );

    if (!rows[0]) {
      return withCors(NextResponse.json({ error: "not found" }, { status: 404 }));
    }

    return withCors(NextResponse.json({ ok: true }));
  } catch (err) {
    return jsonError(err);
  }
}

// DELETE /api/pings/:id — backs the ✕ button on a notification row in <Pings />.
// Recipient-only: you can only delete pings that were sent to you.
export async function DELETE(request, { params }) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = params;

    const { rows } = await query(
      `DELETE FROM "Ping" WHERE id = $1 AND "recipientId" = $2 RETURNING id`,
      [id, user.id]
    );

    if (!rows[0]) {
      return withCors(NextResponse.json({ error: "not found" }, { status: 404 }));
    }

    return withCors(NextResponse.json({ ok: true }));
  } catch (err) {
    return jsonError(err);
  }
}