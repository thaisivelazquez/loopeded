import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { requireCurrentUser } from "../../../../lib/auth";
import { jsonError, withCors, corsPreflight } from "../../../../lib/format";

export async function OPTIONS() {
  return corsPreflight();
}

// POST /api/pings/read — backs the "mark all read" action in <Pings />.
export async function POST() {
  try {
    const user = await requireCurrentUser();
    await query(`UPDATE "Ping" SET read = true WHERE "recipientId" = $1 AND read = false`, [user.id]);
    return withCors(NextResponse.json({ ok: true }));
  } catch (err) {
    return jsonError(err);
  }
}
