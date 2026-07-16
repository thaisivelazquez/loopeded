import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { query } from "../../../../../lib/db";
import { requireCurrentUser } from "../../../../../lib/auth";
import { jsonError, withCors, corsPreflight } from "../../../../../lib/format";

export async function OPTIONS() {
  return corsPreflight();
}

// POST /api/pings/:id/action
// Backs a ping row's action button (e.g. "i'm in"). Joins the linked event,
// if there is one, and marks the ping read either way.
export async function POST(request, { params }) {
  try {
    const user = await requireCurrentUser();
    const { id } = params;

    const { rows } = await query(`SELECT "eventId" FROM "Ping" WHERE id = $1 AND "recipientId" = $2`, [
      id,
      user.id
    ]);
    const ping = rows[0];
    if (!ping) return withCors(NextResponse.json({ error: "not found" }, { status: 404 }));

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
