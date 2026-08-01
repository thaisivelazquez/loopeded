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